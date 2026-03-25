export default function DocumentList({ documents, activeDocId, onSelect, onDelete }) {
  const getIcon = (name) => {
    const ext = name.split(".").pop().toLowerCase();
    const icons = { pdf: "📕", txt: "📝", md: "📘", docx: "📄" };
    return icons[ext] || "📄";
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="documents-section">
        <div className="section-title">Documents</div>
        <div className="no-documents">
          <div className="no-documents-icon">📂</div>
          <div>No documents uploaded yet.<br />Upload a file to get started.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-section">
      <div className="section-title">Documents ({documents.length})</div>
      <div className="document-list">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className={`document-item ${activeDocId === doc.id ? "active" : ""}`}
            onClick={() => onSelect(doc.id)}
          >
            <div className="doc-icon">{getIcon(doc.name)}</div>
            <div className="doc-info">
              <div className="doc-name">{doc.name}</div>
              <div className="doc-meta">
                {doc.chunks_count} sections • {doc.size_formatted}
              </div>
            </div>
            <button
              className="doc-delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(doc.id);
              }}
              title="Delete document"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
