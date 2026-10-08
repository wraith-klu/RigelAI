import React, { useState } from "react";
import { 
  IconUpload, 
  IconPlay, 
  IconAlertTriangle, 
  IconCheck, 
  IconClose,
  IconRefresh
} from "./Icons";
import { analyzeFile, analyzeRepository } from "../services/api";
import "./FileUpload.css";

const PRESET_QUERIES = [
  "Comprehensive code smell and anti-pattern review",
  "Refactoring, modularity, and cognitive complexity audit",
  "Performance bottlenecks and edge-case vulnerabilities"
];

export default function FileUpload({ onResult, onRunStateChange, onSwitchToEditor, onOpenFileInEditor }) {
  const [file, setFile] = useState(null);
  const [query, setQuery] = useState(
    "Analyze this code for code smells, anti-patterns, complexity, and refactoring opportunities."
  );
  const [loading, setLoading] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoUrl, setRepoUrl] = useState("https://github.com/wraith-klu/RigelAI");
  const [error, setError] = useState("");

  const MAX_SIZE_MB = 4;

  const validateFile = (selectedFile) => {
    if (!selectedFile) return "No file selected.";

    const allowed = [".py", ".java", ".cpp", ".c", ".js", ".ts", ".jsx", ".tsx", ".go", ".rs"];
    const ext = "." + selectedFile.name.split(".").pop().toLowerCase();

    if (!allowed.includes(ext)) {
      return "Unsupported format. Rigel AI supports Python, Java, C/C++, JS, TS, Go, and Rust.";
    }

    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File exceeds ${MAX_SIZE_MB}MB size limit.`;
    }

    return null;
  };

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError("");
    setFile(selectedFile);
  };

  const handleOpenInEditor = async () => {
    if (!file) return;
    try {
      const text = await file.text();
      onOpenFileInEditor?.(text, file.name);
    } catch {
      setError("Unable to read file contents into editor.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileAnalyze = async () => {
    if (!file) {
      setError("Please choose a source file first.");
      return;
    }

    setLoading(true);
    setError("");
    onRunStateChange?.({
      label: `AST File Scan: ${file.name}`,
      estimateSeconds: 16,
      startedAt: Date.now(),
    });

    try {
      const data = await analyzeFile(file, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "File analysis failed. Check backend connection.");
    } finally {
      setLoading(false);
      onRunStateChange?.(null);
    }
  };

  const handleRepoAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError("Please provide a valid GitHub repository URL.");
      return;
    }

    setRepoLoading(true);
    setError("");
    onRunStateChange?.({
      label: `Cloning & Multi-File AST Scan (${repoUrl.replace("https://github.com/", "")})`,
      estimateSeconds: 30,
      startedAt: Date.now(),
    });

    try {
      const data = await analyzeRepository(repoUrl, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "Repository analysis failed. Verify the repository is public and accessible.");
    } finally {
      setRepoLoading(false);
      onRunStateChange?.(null);
    }
  };

  return (
    <div className="upload-wrapper">
      {/* Quick Switch to Code Editor Banner */}
      <div className="switch-editor-banner">
        <div className="switch-editor-left">
          <div className="switch-badge-icon" aria-hidden="true">⚡</div>
          <div className="switch-copy">
            <strong>Prefer writing or testing raw code snippets?</strong>
            <p>Switch to the interactive Monaco code editor anytime to edit line-by-line and test AST logic.</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-switch-editor"
          onClick={onSwitchToEditor}
        >
          <span>Open Code Editor</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="upload-grid">
        {/* Option A: Single Source File Audit */}
        <div className="upload-column option-file-card">
          <div className="column-header">
            <span className="column-icon-chip blue" aria-hidden="true">📄</span>
            <div>
              <label className="column-label">Option A: Single Source File Audit</label>
              <span className="column-sublabel">Direct syntax tree & vector inspection</span>
            </div>
          </div>

          <div
            className={`drop-zone ${file ? "has-file" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              type="file"
              id="file-input-elem"
              className="visually-hidden"
              onChange={(e) => handleFileChange(e.target.files[0])}
            />
            {file ? (
              <div className="file-info-box">
                <div className="file-name-row">
                  <div className="file-name-group">
                    <span className="file-icon-badge">✓</span>
                    <strong className="file-name-text">{file.name}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn-icon-subtle"
                    onClick={() => setFile(null)}
                    aria-label="Remove file"
                    title="Remove file"
                  >
                    <IconClose size={15} />
                  </button>
                </div>
                <div className="file-meta-row">
                  <span className="file-size-meta">{(file.size / 1024).toFixed(1)} KB</span>
                  <span className="file-status-tag">Ready for AST Analysis</span>
                </div>
              </div>
            ) : (
              <label htmlFor="file-input-elem" className="drop-prompt">
                <div className="drop-icon-circle blue">
                  <IconUpload size={22} className="drop-icon" />
                </div>
                <span className="drop-main-text">Click to browse or drag file here</span>
                <div className="language-badge-strip">
                  <span className="lang-tag blue">Python</span>
                  <span className="lang-tag amber">JavaScript</span>
                  <span className="lang-tag violet">TypeScript</span>
                  <span className="lang-tag orange">Java</span>
                  <span className="lang-tag teal">C++ / Go</span>
                  <span className="lang-tag coral">Rust</span>
                </div>
              </label>
            )}
          </div>

          <div className="action-button-row">
            <button
              type="button"
              className="btn-file-analyze"
              onClick={handleFileAnalyze}
              disabled={!file || loading}
            >
              <IconPlay size={14} />
              <span>{loading ? "Analyzing File..." : "Run File Analysis"}</span>
            </button>
            {file && (
              <button
                type="button"
                className="btn-open-editor"
                onClick={handleOpenInEditor}
                title="Open this file in the interactive Monaco editor"
              >
                <span>Edit in Code Editor</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </div>

        {/* Option B: Public Git Repository URL */}
        <div className="upload-column option-repo-card">
          <div className="column-header">
            <span className="column-icon-chip purple" aria-hidden="true">🐙</span>
            <div>
              <label htmlFor="repo-url-input" className="column-label">Option B: Public Git Repository URL</label>
              <span className="column-sublabel">Deep repository clone & multi-module audit</span>
            </div>
          </div>

          <div className="repo-input-card">
            <div className="repo-input-row">
              <span className="repo-prefix-badge">git://</span>
              <input
                id="repo-url-input"
                type="url"
                className="text-input repo-text-input"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
              />
            </div>
            <p className="repo-help-text">
              Clones repository into an ephemeral sandbox, extracts AST branches, and returns architectural findings.
            </p>
            <div className="repo-features-strip">
              <span className="repo-feature-pill">Branch Analysis</span>
              <span className="repo-feature-pill">Dependency Graph</span>
              <span className="repo-feature-pill">Zero Retention</span>
            </div>
          </div>

          <button
            type="button"
            className="btn-repo-analyze"
            onClick={handleRepoAnalyze}
            disabled={!repoUrl.trim() || repoLoading}
          >
            <IconPlay size={14} />
            <span>{repoLoading ? "Cloning and Analyzing..." : "Run Repository Scan"}</span>
          </button>
        </div>
      </div>

      {/* Query Customization */}
      <div className="query-selector-row">
        <div className="query-label-group">
          <label className="query-label">Review Scope Focus</label>
          <span className="query-hint">Select audit depth:</span>
        </div>
        <div className="preset-queries-list">
          {PRESET_QUERIES.map((p, i) => {
            const colorClass = i === 0 ? "scope-blue" : i === 1 ? "scope-purple" : "scope-emerald";
            const icon = i === 0 ? "🔍" : i === 1 ? "⚡" : "🛡️";
            return (
              <button
                key={i}
                type="button"
                className={`preset-query-btn ${colorClass} ${query === p ? "active" : ""}`}
                onClick={() => setQuery(p)}
              >
                <span className="query-icon" aria-hidden="true">{icon}</span>
                <span>{p}</span>
                {query === p && <span className="query-check-chip">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="upload-error-box" role="alert">
          <IconAlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
