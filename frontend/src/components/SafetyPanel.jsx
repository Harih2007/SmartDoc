import { useState } from "react";

export default function SafetyPanel({ safety, sources }) {
  const [expanded, setExpanded] = useState(false);

  if (!safety) return null;

  const level = safety.confidence_level || "low";

  return (
    <div className="safety-panel">
      <div className="safety-header" onClick={() => setExpanded(!expanded)}>
        <div className="safety-header-left">
          <span className={`confidence-badge ${level}`}>
            {level === "blocked" ? "🛡️ Blocked" : `${safety.confidence}% confidence`}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {safety.sources_used || 0} sources
          </span>
        </div>
        <span className="safety-toggle">{expanded ? "▲" : "▼"}</span>
      </div>

      {expanded && (
        <div className="safety-details">
          {safety.show_warning && safety.warning_message && (
            <div className="safety-warning">{safety.warning_message}</div>
          )}

          <div className="safety-metrics">
            <div className="safety-metric">
              <span className="safety-metric-label">Confidence</span>
              <span className="safety-metric-value">{safety.confidence}%</span>
            </div>
            <div className="safety-metric">
              <span className="safety-metric-label">Groundedness</span>
              <span className="safety-metric-value">
                {safety.groundedness != null ? `${safety.groundedness}%` : "N/A"}
              </span>
            </div>
            <div className="safety-metric">
              <span className="safety-metric-label">Max Relevance</span>
              <span className="safety-metric-value">
                {safety.max_relevance != null ? safety.max_relevance : "N/A"}
              </span>
            </div>
            <div className="safety-metric">
              <span className="safety-metric-label">Sources Used</span>
              <span className="safety-metric-value">{safety.sources_used || 0}</span>
            </div>
          </div>

          {sources && sources.length > 0 && (
            <div className="source-references">
              <div className="source-references-title">Source References</div>
              {sources.map((src, i) => (
                <div key={i} className="source-item">
                  <div className="source-item-header">
                    <span className="source-item-file">
                      📖 {src.file} — Page {src.page}, §{src.section}
                    </span>
                    <span className="source-item-score">
                      {(src.relevance * 100).toFixed(0)}% match
                    </span>
                  </div>
                  <div className="source-item-text">{src.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
