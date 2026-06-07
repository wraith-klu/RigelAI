import { useState } from "react";
import "./FileUpload.css";
import { analyzeFile, analyzeRepository } from "../services/api";

export default function FileUpload({ onResult }) {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState(
    "Analyze this code for smells, bugs, complexity, and refactoring opportunities."
  );
  const [loading, setLoading] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState("");
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

  const handleRepositoryAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError("Paste a public GitHub repository URL before running analysis.");
      return;
    }

    setRepoLoading(true);
    setError("");

    try {
      const data = await analyzeRepository(repoUrl, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "Repository analysis failed. Confirm the repo is public.");
    } finally {
      setRepoLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRepoUrl("");
    setQuery("Analyze this code for smells, bugs, complexity, and refactoring opportunities.");
    setError("");
    onResult?.(null);
  };

  const handleKey = (event) => {
    if (event.key === "Enter") handleAnalyze();
  };

  const handleRepoKey = (event) => {
    if (event.key === "Enter") handleRepositoryAnalyze();
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h3>Upload code or scan a repository</h3>
        <p>Use a source file for focused review, or paste a public GitHub URL for a project-level scan.</p>
      </div>

      <div className="repo-analyzer">
        <label>
          GitHub repository
          <input
            type="url"
            placeholder="https://github.com/owner/repository"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            onKeyDown={handleRepoKey}
          />
        </label>
        <button
          className="repo-btn"
          onClick={handleRepositoryAnalyze}
          disabled={repoLoading || loading}
          type="button"
        >
          {repoLoading ? "Scanning..." : "Analyze repo"}
        </button>
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
            disabled={loading || repoLoading || !file}
            type="button"
          >
            {loading ? "Analyzing..." : "Analyze file"}
          </button>

          <button
            className="reset-btn"
            onClick={handleReset}
            disabled={loading || repoLoading}
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
