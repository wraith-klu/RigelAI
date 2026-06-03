import { useState } from "react";
import "./FileUpload.css";
import { analyzeFile } from "../services/api";

export default function FileUpload({ onResult }) {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState(
    "Analyze this code for smells, bugs, complexity, and refactoring opportunities."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const MAX_SIZE_MB = 2;

  const validateFile = (selectedFile) => {
    if (!selectedFile) return "No file selected.";

    const allowed = [".py", ".java", ".cpp", ".c", ".js", ".ts"];
    const ext = "." + selectedFile.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      return "Unsupported file type. Use Python, Java, C, C++, JavaScript, or TypeScript.";
    }

    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File is too large. Maximum size is ${MAX_SIZE_MB} MB.`;
    }

    return null;
  };

  const handleFileChange = (selectedFile) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    handleFileChange(event.dataTransfer.files[0]);
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Upload a source file before running analysis.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await analyzeFile(file, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "Analysis failed. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setQuery("Analyze this code for smells, bugs, complexity, and refactoring opportunities.");
    setError("");
    onResult?.(null);
  };

  const handleKey = (event) => {
    if (event.key === "Enter") handleAnalyze();
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h3>Upload a code file</h3>
        <p>Use a small source file when you want a fast, focused review.</p>
      </div>

      <label
        className={`upload-dropzone ${file ? "active" : ""}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".py,.java,.cpp,.c,.js,.ts"
          onChange={(event) => handleFileChange(event.target.files[0])}
          hidden
        />

        {file ? (
          <div className="file-selected">
            <span className="file-icon">FILE</span>
            <span>
              <strong>{file.name}</strong>
              <small>{(file.size / 1024).toFixed(1)} KB selected</small>
            </span>
          </div>
        ) : (
          <div className="upload-placeholder">
            <img src="/agent-upload.svg" alt="" aria-hidden="true" />
            <p>Drop your code file here</p>
            <span>or click to browse from your device</span>
          </div>
        )}
      </label>

      <div className="upload-controls">
        <input
          className="query-input"
          placeholder="What should RigelAI focus on?"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKey}
        />

        <div className="button-group">
          <button
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !file}
            type="button"
          >
            {loading ? "Analyzing..." : "Analyze file"}
          </button>

          <button
            className="reset-btn"
            onClick={handleReset}
            disabled={loading}
            type="button"
          >
            Reset
          </button>
        </div>
      </div>

      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}
