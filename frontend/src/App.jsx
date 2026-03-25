import { useState, useEffect, useCallback } from "react";
import "./index.css";
import LoginPage from "./components/LoginPage";
import DocumentUpload from "./components/DocumentUpload";
import DocumentList from "./components/DocumentList";
import ChatInterface from "./components/ChatInterface";
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated,
  getStoredUser,
  uploadDocument,
  sendMessage,
  getDocuments,
  deleteDocument,
  getServerStatus,
} from "./api";

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === "success" && "✅ "}
          {t.type === "error" && "❌ "}
          {t.type === "info" && "ℹ️ "}
          {t.message}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [user, setUser] = useState(getStoredUser());
  const [documents, setDocuments] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Check server status
  useEffect(() => {
    const check = async () => {
      const status = await getServerStatus();
      setServerStatus(status);
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load documents when logged in and server available
  useEffect(() => {
    if (serverStatus && loggedIn) {
      loadDocuments();
    }
  }, [serverStatus, loggedIn]);

  const loadDocuments = async () => {
    try {
      const data = await getDocuments();
      setDocuments(data.documents || []);
    } catch {
      // Server not ready
    }
  };

  const handleLogin = async (username, password) => {
    const result = await apiLogin(username, password);
    setUser(result.user);
    setLoggedIn(true);
    addToast(`Welcome back, ${result.user.name}!`, "success");
  };

  const handleLogout = async () => {
    await apiLogout();
    setLoggedIn(false);
    setUser(null);
    setMessages([]);
    setDocuments([]);
    setActiveDocId(null);
  };

  const handleUpload = async (file, error) => {
    if (error) {
      addToast(error, "error");
      return;
    }
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      addToast(result.message, "success");
      await loadDocuments();
      setActiveDocId(result.doc_id);
    } catch (err) {
      addToast(err.message || "Upload failed", "error");
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await deleteDocument(docId);
      addToast("Document deleted", "info");
      if (activeDocId === docId) setActiveDocId(null);
      await loadDocuments();
    } catch {
      addToast("Failed to delete document", "error");
    }
  };

  const handleSend = async (question) => {
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);

    try {
      const result = await sendMessage(question, activeDocId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          safety: result.safety,
          sources: result.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Sorry, I encountered an error. Please check if the backend server is running.",
          safety: {
            confidence: 0,
            confidence_level: "low",
            show_warning: true,
            warning_message: err.message,
            sources_used: 0,
          },
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const isConnected = !!serverStatus;

  // Show login page if not authenticated
  if (!loggedIn) {
    return (
      <>
        <Toast toasts={toasts} />
        <LoginPage onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Toast toasts={toasts} />

      <div className="app">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo">
              <div className="logo-icon">🧠</div>
              <span className="logo-text">SmartDoc</span>
            </div>
            <div className="logo-tagline">Intelligent Document Q&A</div>

            <div className="server-status">
              <div className={`status-dot ${isConnected ? "connected" : ""}`} />
              {isConnected
                ? `Connected${serverStatus.gemini_configured ? " • Gemini Active" : " • Demo Mode"}`
                : "Backend disconnected"}
            </div>
          </div>

          {/* User info + logout */}
          <div className="user-section">
            <div className="user-info">
              <div className="user-avatar">
                {user?.role === "admin" ? "👑" : "👤"}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">{user?.role}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              ⏻
            </button>
          </div>

          <DocumentUpload onUpload={handleUpload} isUploading={isUploading} />

          <DocumentList
            documents={documents}
            activeDocId={activeDocId}
            onSelect={setActiveDocId}
            onDelete={handleDelete}
          />
        </aside>

        {/* Main Chat Area */}
        <ChatInterface
          messages={messages}
          onSend={handleSend}
          isLoading={isLoading}
          hasDocuments={documents.length > 0}
        />
      </div>
    </>
  );
}
