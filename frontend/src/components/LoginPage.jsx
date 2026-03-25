import { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (user, pass) => {
    setUsername(user);
    setPassword(pass);
    setError("");
    setIsLoading(true);
    try {
      await onLogin(user, pass);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Animated bg orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🧠</div>
          <h1>SmartDoc</h1>
          <p>Intelligent Document Q&A</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="login-spinner" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="demo-section">
          <div className="demo-divider">
            <span>Demo Accounts</span>
          </div>
          <div className="demo-accounts">
            <button
              className="demo-account"
              onClick={() => handleDemoLogin("admin", "admin123")}
              disabled={isLoading}
            >
              <div className="demo-avatar">👑</div>
              <div className="demo-info">
                <span className="demo-name">Admin</span>
                <span className="demo-cred">admin / admin123</span>
              </div>
            </button>
            <button
              className="demo-account"
              onClick={() => handleDemoLogin("demo", "demo123")}
              disabled={isLoading}
            >
              <div className="demo-avatar">🧑‍💻</div>
              <div className="demo-info">
                <span className="demo-name">Demo User</span>
                <span className="demo-cred">demo / demo123</span>
              </div>
            </button>
            <button
              className="demo-account"
              onClick={() => handleDemoLogin("guest", "guest123")}
              disabled={isLoading}
            >
              <div className="demo-avatar">👤</div>
              <div className="demo-info">
                <span className="demo-name">Guest</span>
                <span className="demo-cred">guest / guest123</span>
              </div>
            </button>
          </div>
        </div>

        <div className="login-footer">
          <span>🛡️ Safe & Responsible AI</span>
          <span>•</span>
          <span>🔍 RAG-Powered Search</span>
        </div>
      </div>
    </div>
  );
}
