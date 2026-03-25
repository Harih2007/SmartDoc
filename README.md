# SmartDoc

Intelligent AI-powered Document Q&A Assistant built with FastAPI, React, and Gemini.

## Features
- **RAG-Powered Q&A**: Upload documents (PDF, TXT, MD, DOCX) and ask questions.
- **Safety First**: Prompt injection detection, response grounding, confidence scores, and source citations.
- **Authentication**: Built-in login system with multiple roles.
- **Beautiful UI**: Modern dark glassmorphism design.

## How to Run Locally

### Start Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
> Note: To use the AI capabilities, update the `GEMINI_API_KEY` in `backend/main.py` or set it in your environment.

### Start Frontend
```bash
cd frontend
npm install
npm run dev
```

## Demo Credentials
- Admin: `admin` / `admin123`
- Demo User: `demo` / `demo123`
- Guest User: `guest` / `guest123`
