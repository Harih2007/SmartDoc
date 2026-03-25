import { useState, useRef } from "react";

export default function DocumentUpload({ onUpload, isUploading }) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleClick = () => fileInputRef.current?.click();

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleFile = async (file) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const allowed = ["pdf", "txt", "md", "docx"];
    if (!allowed.includes(ext)) {
      onUpload(null, `Unsupported format: .${ext}`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      onUpload(null, "File too large (max 10MB)");
      return;
    }

    setProgress(30);
    setStatusText("Uploading...");

    try {
      setProgress(60);
      setStatusText("Processing document...");
      await onUpload(file);
      setProgress(100);
      setStatusText("Done!");
      setTimeout(() => {
        setProgress(0);
        setStatusText("");
      }, 1500);
    } catch (err) {
      setProgress(0);
      setStatusText("");
    }
  };

  return (
    <div className="upload-section">
      <div
        className={`upload-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="upload-icon">📄</div>
        <div className="upload-text">
          <strong>Drop a file</strong> or click to upload
        </div>
        <div className="upload-formats">PDF, TXT, MD, DOCX • Max 10MB</div>

        {progress > 0 && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="upload-status">{statusText}</div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>
    </div>
  );
}
