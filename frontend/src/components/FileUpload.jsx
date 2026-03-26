import { useState } from "react";
import "./FileUpload.css";
import { analyzeFile } from "../services/api";

export default function FileUpload({ onResult }) {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState(
    "Analyze this code for smells and improvements"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const MAX_SIZE_MB = 2;

  const validateFile = (f) => {
    if (!f) return "No file selected";

    const allowed = [".py", ".java", ".cpp", ".c", ".js", ".ts"];
    const ext = "." + f.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      return "Unsupported file type";
    }

    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large (max ${MAX_SIZE_MB}MB)`;
    }

    return null;
  };

  const handleFileChange = (f) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      setFile(null);
      return;
    }

    setError("");
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFileChange(e.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await analyzeFile(file, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setQuery("");
    setError("");
    onResult?.(null);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleAnalyze();
  };

  return (
    <div className="upload-container">
      <div className="upload-card">

        <div className="upload-header">
          <h2>Upload & Analyze Code</h2>
          <p>Drag a file or paste code to detect smells and improvements.</p>
        </div>

        {/* Upload area */}
        <label
          className={`upload-dropzone ${file ? "active" : ""}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".py,.java,.cpp,.c,.js,.ts"
            onChange={(e) => handleFileChange(e.target.files[0])}
            hidden
          />

          {file ? (
            <div className="file-selected">
              <span className="file-icon">📄</span>
              <span className="file-name">{file.name}</span>
            </div>
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">⬆</div>
              <p>Drag & Drop your code file</p>
              <span>or click to browse</span>
            </div>
          )}
        </label>

        {/* Query input */}
        <div className="upload-controls">
          <input
            className="query-input"
            placeholder="Ask something about the code..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
          />

          <div className="button-group">
            <button
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={loading || !file}
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>

            <button
              className="reset-btn"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </button>
          </div>
        </div>

        {error && <div className="upload-error">{error}</div>}

      </div>
    </div>
  );
}