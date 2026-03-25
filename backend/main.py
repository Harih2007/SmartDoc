"""
SmartDoc — Backend API
FastAPI application providing document upload, chat, and management endpoints.
"""

import os
import uuid
import secrets
import hashlib
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from document_parser import DocumentParser
from vector_store import VectorStore, vector_store
from ai_engine import AIEngine
from safety import SafetyGuard

# ── App Setup ────────────────────────────────────────────────────────────────

os.environ["GEMINI_API_KEY"] = "AIzaSyANftl-PpzryNh9QilH6-Au6XxwBlS9rCs"

app = FastAPI(
    title="SmartDoc",
    description="AI-Powered Document Q&A Assistant with Safety Guardrails",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── State ────────────────────────────────────────────────────────────────────

ai_engine = AIEngine(vector_store)

# Track uploaded documents metadata
documents_meta = {}  # doc_id -> {name, uploaded_at, chunks_count, size}

# Chat history per session
chat_histories = {}  # session_id -> [{role, content, timestamp, safety}]

# Active auth tokens
auth_tokens = {}  # token -> {username, login_time}

# Demo users
DEMO_USERS = {
    "admin": {"password": "admin123", "name": "Admin User", "role": "admin"},
    "demo": {"password": "demo123", "name": "Demo User", "role": "viewer"},
    "guest": {"password": "guest123", "name": "Guest User", "role": "viewer"},
}


# ── Models ───────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str

class ChatRequest(BaseModel):
    question: str
    doc_id: Optional[str] = None
    session_id: Optional[str] = "default"


class ChatResponse(BaseModel):
    answer: str
    sources: list
    safety: dict
    is_blocked: bool
    session_id: str


# ── Auth Helpers ─────────────────────────────────────────────────────────────

def verify_token(request: Request) -> dict:
    """Verify auth token from Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ", 1)[1]
    if token not in auth_tokens:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return auth_tokens[token]


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/auth/login")
async def login(request: LoginRequest):
    """Authenticate user with demo credentials."""
    user = DEMO_USERS.get(request.username)
    if not user or user["password"] != request.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = secrets.token_hex(32)
    auth_tokens[token] = {
        "username": request.username,
        "name": user["name"],
        "role": user["role"],
        "login_time": datetime.now().isoformat(),
    }

    return {
        "success": True,
        "token": token,
        "user": {
            "username": request.username,
            "name": user["name"],
            "role": user["role"],
        },
    }


@app.post("/auth/logout")
async def logout(request: Request):
    """Logout and invalidate token."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        auth_tokens.pop(token, None)
    return {"success": True}


@app.get("/auth/me")
async def get_current_user(user: dict = Depends(verify_token)):
    """Get current authenticated user."""
    return {"user": user}


@app.get("/")
async def root():
    return {
        "name": "SmartDoc",
        "version": "1.0.0",
        "status": "running",
        "gemini_configured": ai_engine.is_configured,
        "documents_loaded": len(documents_meta),
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a document."""
    # Validate file type
    filename = file.filename or "unknown"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in DocumentParser.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(DocumentParser.SUPPORTED_EXTENSIONS)}"
        )

    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB.")

    # Generate document ID
    doc_id = str(uuid.uuid4())[:8]

    try:
        # Parse document
        chunks = DocumentParser.parse(
            file_path="",
            file_bytes=content,
            filename=filename
        )

        if not chunks:
            raise HTTPException(status_code=400, detail="Could not extract any text from the document.")

        # Add to vector store
        vector_store.add_document(doc_id, chunks)

        # Store metadata
        documents_meta[doc_id] = {
            "id": doc_id,
            "name": filename,
            "uploaded_at": datetime.now().isoformat(),
            "chunks_count": len(chunks),
            "size": len(content),
            "size_formatted": _format_size(len(content)),
            "total_text_length": sum(len(c.text) for c in chunks),
        }

        return {
            "success": True,
            "doc_id": doc_id,
            "filename": filename,
            "chunks_count": len(chunks),
            "message": f"Successfully processed '{filename}' into {len(chunks)} searchable sections.",
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Chat with the AI about uploaded documents."""
    if not documents_meta:
        return ChatResponse(
            answer="Please upload a document first before asking questions.",
            sources=[],
            safety={
                "confidence": 0,
                "confidence_level": "low",
                "show_warning": False,
                "warning_message": "",
                "flags": [],
                "sources_used": 0,
            },
            is_blocked=False,
            session_id=request.session_id,
        )

    # Get AI response
    result = await ai_engine.answer_question(
        question=request.question,
        doc_id=request.doc_id
    )

    # Store in chat history
    session_id = request.session_id or "default"
    if session_id not in chat_histories:
        chat_histories[session_id] = []

    chat_histories[session_id].append({
        "role": "user",
        "content": request.question,
        "timestamp": datetime.now().isoformat(),
    })
    chat_histories[session_id].append({
        "role": "assistant",
        "content": result["answer"],
        "timestamp": datetime.now().isoformat(),
        "safety": result["safety"],
        "sources": result["sources"],
    })

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        safety=result["safety"],
        is_blocked=result["is_blocked"],
        session_id=session_id,
    )


@app.get("/documents")
async def list_documents():
    """List all uploaded documents."""
    return {
        "documents": list(documents_meta.values()),
        "total": len(documents_meta),
    }


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete an uploaded document."""
    if doc_id not in documents_meta:
        raise HTTPException(status_code=404, detail="Document not found.")

    vector_store.remove_document(doc_id)
    name = documents_meta[doc_id]["name"]
    del documents_meta[doc_id]

    return {"success": True, "message": f"Document '{name}' deleted."}


@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session."""
    return {
        "session_id": session_id,
        "messages": chat_histories.get(session_id, []),
    }


@app.delete("/chat/history/{session_id}")
async def clear_chat_history(session_id: str):
    """Clear chat history for a session."""
    if session_id in chat_histories:
        del chat_histories[session_id]
    return {"success": True, "message": "Chat history cleared."}


# ── Helpers ──────────────────────────────────────────────────────────────────

def _format_size(size_bytes: int) -> str:
    """Format file size in human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


# ── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
