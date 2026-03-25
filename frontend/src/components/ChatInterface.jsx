import { useState, useRef, useEffect } from "react";
import SafetyPanel from "./SafetyPanel";

export default function ChatInterface({
  messages,
  onSend,
  isLoading,
  hasDocuments,
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    onSend(text);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple markdown-to-HTML renderer
  const renderMarkdown = (text) => {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // Code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    // Blockquote
    html = html.replace(/^&gt;\s*(.+)$/gm, "<blockquote>$1</blockquote>");
    // Line breaks
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br/>");
    html = `<p>${html}</p>`;

    return html;
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <h2>💬 Chat</h2>
          <p>
            {hasDocuments
              ? "Ask questions about your uploaded documents"
              : "Upload a document to start chatting"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && !isLoading ? (
          <div className="welcome-screen">
            <div className="welcome-icon">🧠</div>
            <h2>Welcome to SmartDoc</h2>
            <p>
              Upload a document and ask questions. I'll find answers grounded in
              your content with full transparency on confidence and sources.
            </p>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-card-icon">📄</div>
                <h4>Upload Docs</h4>
                <p>PDF, TXT, MD, DOCX</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">🔍</div>
                <h4>Smart Search</h4>
                <p>Semantic retrieval</p>
              </div>
              <div className="feature-card">
                <div className="feature-card-icon">🛡️</div>
                <h4>Safe AI</h4>
                <p>Grounded answers</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div>
                  <div
                    className="message-content"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(msg.content),
                    }}
                  />
                  {msg.role === "assistant" && msg.safety && (
                    <SafetyPanel safety={msg.safety} sources={msg.sources} />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar">🤖</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder={
              hasDocuments
                ? "Ask a question about your document..."
                : "Upload a document first to start asking questions..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={!hasDocuments || isLoading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !hasDocuments}
          >
            ➤
          </button>
        </div>
        <div className="input-hint">
          Press Enter to send • Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
