/**
 * SmartDoc — API Client
 * Handles all communication with the FastAPI backend, including auth.
 */

const API_BASE = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("smartdoc_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Login failed");
  }

  const data = await res.json();
  localStorage.setItem("smartdoc_token", data.token);
  localStorage.setItem("smartdoc_user", JSON.stringify(data.user));
  return data;
}

export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
  } catch {
    // ignore
  }
  localStorage.removeItem("smartdoc_token");
  localStorage.removeItem("smartdoc_user");
}

export function getStoredUser() {
  const data = localStorage.getItem("smartdoc_user");
  return data ? JSON.parse(data) : null;
}

export function isAuthenticated() {
  return !!getToken();
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: authHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }

  return res.json();
}

export async function sendMessage(question, docId = null, sessionId = "default") {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      question,
      doc_id: docId,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Chat request failed");
  }

  return res.json();
}

export async function getDocuments() {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

export async function deleteDocument(docId) {
  const res = await fetch(`${API_BASE}/documents/${docId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete document");
  return res.json();
}

export async function getServerStatus() {
  try {
    const res = await fetch(`${API_BASE}/`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
