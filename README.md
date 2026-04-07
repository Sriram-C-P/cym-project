# Meeting Intelligence Hub

## The Problem

Teams lose critical context after meetings — decisions go undocumented, action items are forgotten, and there is no easy way to query what was discussed across multiple sessions. Manually reviewing long transcripts is time-consuming and inconsistent.

## The Solution

Meeting Intelligence Hub is a full-stack AI-powered web application that transforms raw meeting transcripts into structured, queryable intelligence. Users upload `.txt` or `.vtt` transcript files into project workspaces, and the app automatically extracts key decisions and assigned action items, performs sentiment and tone analysis across the meeting timeline, and exposes a contextual chatbot that can answer questions grounded in the actual transcript content. All results are cached in a local database and can be exported as CSV for downstream use.

## Tech Stack

**Programming Languages**
- Python 3 (backend)
- JavaScript / JSX (frontend)

**Frameworks**
- Flask — REST API server
- React 19 — UI component library
- Vite — frontend build tool and dev server
- Tailwind CSS v4 — utility-first styling

**Database**
- SQLite — local relational database via the `sqlite3` standard library

**APIs and Third-Party Tools**
- Google Gemini API (`gemini-2.5-flash`) — AI layer for extraction, sentiment analysis, and chat
- `google-genai` Python SDK
- Recharts — charting library for sentiment visualizations
- Axios — HTTP client for frontend API calls
- `webvtt-py` — VTT transcript parsing
- `flask-cors` — Cross-Origin Resource Sharing support
- `lucide-react` — icon library

## Setup Instructions

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- A Google Gemini API key

---

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd sriram-c-p-cym-project
```

### 2. Configure the API Key

Create a `.env` file inside the `backend/` directory:

```bash
cd backend
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

### 3. Install Backend Dependencies

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 4. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 5. Run the Application

**Option A — PowerShell (Windows, recommended):**

From the project root:

```powershell
.\run.ps1
```

This starts both the Flask backend (port 5000) and the Vite dev server simultaneously.

**Option B — Manual (any OS):**

Terminal 1 — Backend:
```bash
cd backend
python app.py
```

Terminal 2 — Frontend:
```bash
cd frontend
npm run dev
```

### 6. Open in Browser

Navigate to `http://localhost:5173` to use the app.

The Flask API runs at `http://localhost:5000`.
