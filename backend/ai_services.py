import os
import json
import re
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

def get_client():
    api_key = os.environ.get("GEMINI_API_KEY")
    return genai.Client(api_key=api_key) if api_key else genai.Client()

def safe_parse(raw: str) -> dict:
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except Exception as e:
        print("JSON Parse error:", e)
        return {"decisions": [], "action_items": [], "parse_error": True}

def run_extraction(transcript_text: str) -> dict:
    client = get_client()
    
    prompt = f"""Analyze this meeting transcript and extract all decisions and action items.

Return exactly this JSON shape:
{{
  "decisions": [
    {{"summary": "string", "context": "string", "speakers_involved": ["string"]}}
  ],
  "action_items": [
    {{"owner": "string", "task": "string", "due_date": "string or null", "priority": "high|medium|low"}}
  ]
}}

Rules:
- A "decision" is something the group agreed on or concluded.
- An "action item" is a task assigned to a specific person.
- If no due date is mentioned, set due_date to null.
- Keep summaries under 20 words.
- If nothing was decided or assigned, return empty arrays.
- Respond ONLY with valid JSON. No preamble, no explanation, no markdown fences.

TRANSCRIPT:
{transcript_text}"""

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )
        return safe_parse(response.text)
    except Exception as e:
        print("Gemini API Error:", e)
        return {"decisions": [], "action_items": [], "api_error": str(e)}

def build_chat_system_prompt(transcripts: list[dict]) -> str:
    transcript_block = "\n\n".join(
        f"[MEETING: {t['filename']} | DATE: {t.get('upload_date', 'Unknown')}]\n{t['raw_text']}"
        for t in transcripts
    )
    return f"""You are a meeting intelligence assistant. Answer questions using only the meeting transcripts provided below.

Rules:
- Always cite the source meeting by filename and approximate timestamp or speaker turn.
- If the answer spans multiple meetings, cite each one.
- If the answer cannot be found in the transcripts, say so explicitly — do not guess.
- Be concise. Lead with the direct answer, then provide supporting context.

TRANSCRIPTS:
{transcript_block}"""

def run_chat(transcripts: list[dict], history: list[dict]) -> str:
    client = get_client()
    system_instruction = build_chat_system_prompt(transcripts)
    
    contents = []
    for h in history:
        role = "user" if h["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=h["content"])]))
        
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4
            )
        )
        return response.text
    except Exception as e:
        print("Gemini API Error:", e)
        return "Sorry, I encountered an error while processing your request."

def build_sentiment_prompt(transcript_text: str) -> str:
    return f"""Analyze the sentiment and tone of this meeting transcript.

Return exactly this JSON shape:
{{
  "overall_score": 0.0,
  "overall_label": "positive|neutral|tense|mixed",
  "segments": [
    {{
      "segment_index": 0,
      "approximate_position": "start|early|middle|late|end",
      "label": "consensus|discussion|conflict|uncertainty|enthusiasm",
      "score": 0.0,
      "summary": "string",
      "key_quote": "string"
    }}
  ],
  "speakers": [
    {{
      "name": "string",
      "overall_sentiment": "positive|neutral|negative",
      "score": 0.0,
      "notes": "string"
    }}
  ]
}}

Rules:
- score is a float from -1.0 (very negative) to 1.0 (very positive).
- Divide the transcript into 4-6 logical segments, not strict time chunks.
- key_quote should be a verbatim short phrase (under 15 words) that exemplifies the segment tone.
- Identify all named speakers. If speakers are unlabeled, use "Speaker A", "Speaker B", etc.
- Respond ONLY with valid JSON. No preamble.

TRANSCRIPT:
{transcript_text}"""

def run_sentiment(transcript_text: str) -> dict:
    client = get_client()
    prompt = build_sentiment_prompt(transcript_text)
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.2,
                response_mime_type="application/json"
            )
        )
        return safe_parse(response.text)
    except Exception as e:
        print("Gemini API Error:", e)
        return {"overall_score": 0.0, "overall_label": "neutral", "segments": [], "speakers": [], "api_error": str(e)}
