from flask import Flask, jsonify, request
from flask_cors import CORS
from database import init_db, get_db
from ai_services import run_extraction, run_chat, run_sentiment
import os
import json
import csv
from io import StringIO
from flask import Response
from werkzeug.utils import secure_filename
import webvtt

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

init_db()

@app.route("/api/projects", methods=["GET"])
def get_projects():
    db = get_db()
    projects = db.execute("SELECT * FROM projects ORDER BY created_at DESC").fetchall()
    return jsonify([dict(row) for row in projects])

@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.json
    name = data.get("name")
    if not name:
        return jsonify({"error": "Name is required"}), 400
    db = get_db()
    c = db.cursor()
    c.execute("INSERT INTO projects (name) VALUES (?)", [name])
    db.commit()
    return jsonify({"id": c.lastrowid, "name": name}), 201

@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    db = get_db()
    # Get all meeting IDs for this project
    meetings = db.execute("SELECT id FROM meetings WHERE project_id = ?", [project_id]).fetchall()
    meeting_ids = [m["id"] for m in meetings]

    # Cascade delete all related data
    for mid in meeting_ids:
        db.execute("DELETE FROM extractions WHERE meeting_id = ?", [mid])
        db.execute("DELETE FROM sentiments WHERE meeting_id = ?", [mid])
    db.execute("DELETE FROM meetings WHERE project_id = ?", [project_id])
    db.execute("DELETE FROM chat_messages WHERE project_id = ?", [project_id])
    db.execute("DELETE FROM projects WHERE id = ?", [project_id])
    db.commit()
    return jsonify({"message": "Project deleted"}), 200


def parse_transcript(filepath):
    if filepath.endswith('.vtt'):
        vtt = webvtt.read(filepath)
        text_parts = []
        for caption in vtt:
            text_parts.append(caption.text)
        return "\n".join(text_parts), 0
    else:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read(), 0

@app.route("/api/projects/<int:project_id>/upload", methods=["POST"])
def upload_file(project_id):
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    if file and (file.filename.endswith('.vtt') or file.filename.endswith('.txt')):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        raw_text, speaker_count = parse_transcript(filepath)
        word_count = len(raw_text.split())
        
        db = get_db()
        c = db.cursor()
        c.execute(
            "INSERT INTO meetings (project_id, filename, raw_text, upload_date, word_count, speaker_count) VALUES (?, ?, ?, DATE('now'), ?, ?)",
            [project_id, filename, raw_text, word_count, speaker_count]
        )
        db.commit()
        meeting_id = c.lastrowid
        return jsonify({"id": meeting_id, "filename": filename, "word_count": word_count}), 201
        
    return jsonify({"error": "Invalid file format. Only .vtt and .txt are supported."}), 400

@app.route("/api/projects/<int:project_id>/meetings", methods=["GET"])
def get_meetings(project_id):
    db = get_db()
    meetings = db.execute("SELECT id, filename, upload_date, word_count, speaker_count FROM meetings WHERE project_id = ? ORDER BY created_at DESC", [project_id]).fetchall()
    return jsonify([dict(row) for row in meetings])

@app.route("/api/meetings/<int:meeting_id>/extraction", methods=["GET"])
def get_extraction(meeting_id):
    db = get_db()
    cached = db.execute(
        "SELECT * FROM extractions WHERE meeting_id = ?", [meeting_id]
    ).fetchone()

    if cached:
        decisions = json.loads(cached["decisions_json"])
        actions = json.loads(cached["actions_json"])
        # Only use the cache if it actually has data — don't serve stale empty results from previous failures
        if decisions or actions:
            return jsonify({
                "decisions": decisions,
                "actions": actions,
                "cached": True
            })
        else:
            # Delete the bad cache entry so we can retry
            db.execute("DELETE FROM extractions WHERE meeting_id = ?", [meeting_id])
            db.commit()

    meeting = db.execute("SELECT * FROM meetings WHERE id = ?", [meeting_id]).fetchone()
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
        
    result = run_extraction(meeting["raw_text"])

    decisions = result.get("decisions") or []
    actions = result.get("action_items") or []

    # Only cache if the extraction actually returned data (don't persist API failures)
    if decisions or actions:
        db.execute(
            "INSERT OR REPLACE INTO extractions (meeting_id, decisions_json, actions_json) VALUES (?, ?, ?)",
            [meeting_id, json.dumps(decisions), json.dumps(actions)]
        )
        db.commit()

    return jsonify({"decisions": decisions, "actions": actions, "cached": False})

@app.route("/api/meetings/<int:meeting_id>/extraction/export", methods=["GET"])
def export_extraction(meeting_id):
    db = get_db()
    cached = db.execute("SELECT * FROM extractions WHERE meeting_id = ?", [meeting_id]).fetchone()
    if not cached:
        return jsonify({"error": "No extraction found for this meeting. Please extract it first."}), 404

    decisions = json.loads(cached["decisions_json"]) or []
    actions = json.loads(cached["actions_json"]) or []

    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(["Type", "Summary/Task", "Context/Owner", "Speakers Selected/Priority", "Due Date"])
    
    for d in decisions:
        cw.writerow(["Decision", d.get("summary", ""), d.get("context", ""), ", ".join(d.get("speakers_involved") or []), ""])
        
    for a in actions:
        cw.writerow(["Action Item", a.get("task", ""), a.get("owner", ""), a.get("priority", ""), a.get("due_date", "")])

    output = si.getvalue()
    return Response(
        output,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=meeting_{meeting_id}_export.csv"}
    )

@app.route("/api/projects/<int:project_id>/chat", methods=["GET"])
def get_chat_history(project_id):
    db = get_db()
    messages = db.execute("SELECT role, content, created_at FROM chat_messages WHERE project_id = ? ORDER BY created_at ASC", [project_id]).fetchall()
    return jsonify([dict(row) for row in messages])

@app.route("/api/projects/<int:project_id>/chat", methods=["POST"])
def send_chat_message(project_id):
    data = request.json
    user_message = data.get("message")
    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    db = get_db()
    c = db.cursor()

    c.execute("INSERT INTO chat_messages (project_id, role, content) VALUES (?, 'user', ?)", [project_id, user_message])
    db.commit()

    meetings = db.execute("SELECT filename, raw_text, upload_date FROM meetings WHERE project_id = ?", [project_id]).fetchall()
    history = db.execute("SELECT role, content FROM (SELECT role, content, created_at FROM chat_messages WHERE project_id = ? ORDER BY created_at DESC LIMIT 10) ORDER BY created_at ASC", [project_id]).fetchall()

    reply = run_chat([dict(m) for m in meetings], [dict(h) for h in history])

    c.execute("INSERT INTO chat_messages (project_id, role, content) VALUES (?, 'assistant', ?)", [project_id, reply])
    db.commit()

    return jsonify({"role": "assistant", "content": reply})

@app.route("/api/meetings/<int:meeting_id>/sentiment", methods=["GET"])
def get_sentiment(meeting_id):
    db = get_db()
    cached = db.execute("SELECT * FROM sentiments WHERE meeting_id = ?", [meeting_id]).fetchone()

    if cached:
        segments = json.loads(cached["segments_json"])
        speakers = json.loads(cached["speakers_json"])
        # Only use cache if it actually has data
        if segments or speakers:
            return jsonify({
                "overall_score": cached["overall_score"],
                "overall_label": cached["overall_label"],
                "segments": segments,
                "speakers": speakers,
                "cached": True
            })
        else:
            # Delete stale empty cache
            db.execute("DELETE FROM sentiments WHERE meeting_id = ?", [meeting_id])
            db.commit()

    meeting = db.execute("SELECT * FROM meetings WHERE id = ?", [meeting_id]).fetchone()
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404

    result = run_sentiment(meeting["raw_text"])

    segments = result.get("segments") or []
    speakers = result.get("speakers") or []

    # Only cache if we got real data
    if segments or speakers:
        db.execute(
            "INSERT OR REPLACE INTO sentiments (meeting_id, overall_score, overall_label, segments_json, speakers_json) VALUES (?, ?, ?, ?, ?)",
            [meeting_id, result.get("overall_score", 0.0), result.get("overall_label", "neutral"), json.dumps(segments), json.dumps(speakers)]
        )
        db.commit()

    return jsonify({
        "overall_score": result.get("overall_score", 0.0),
        "overall_label": result.get("overall_label", "neutral"),
        "segments": segments,
        "speakers": speakers,
        "cached": False
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
