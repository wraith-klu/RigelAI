import { useState } from "react";
import { 
  UploadCloud, 
  GitBranch, 
  GitFork, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  RotateCcw, 
  Play, 
  Sparkles,
  Info,
  X
} from "lucide-react";
import { analyzeFile, analyzeRepository } from "../services/api";
import "./FileUpload.css";

const PRESET_QUERIES = [
  "Comprehensive code smell & anti-pattern review",
  "Refactoring, modularity & cognitive complexity audit",
  "Performance bottlenecks & edge-case vulnerabilities"
];

export default function FileUpload({ onResult, onRunStateChange }) {
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
      return "Unsupported format. RigelAI supports Python, Java, C/C++, JS, TS, Go, and Rust.";
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

  const handleDrop = (event) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileChange(event.dataTransfer.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select or drop a source code file.");
      return;
    }

    setLoading(true);
    setError("");
    onRunStateChange?.({
      label: `AST + ML Scan: ${file.name}`,
      estimateSeconds: 18,
      startedAt: Date.now(),
    });

    try {
      const data = await analyzeFile(file, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "File analysis pipeline failed. Ensure the backend server is running.");
    } finally {
      setLoading(false);
      onRunStateChange?.(null);
    }
  };

  const handleRepositoryAnalyze = async () => {
    if (!repoUrl.trim()) {
      setError("Please specify a valid public GitHub repository URL.");
      return;
    }

    setRepoLoading(true);
    setError("");
    onRunStateChange?.({
      label: `Repository Audit: ${repoUrl.replace("https://github.com/", "")}`,
      estimateSeconds: 32,
      startedAt: Date.now(),
    });

    try {
      const data = await analyzeRepository(repoUrl, query);
      onResult?.(data);
    } catch (e) {
      setError(e.message || "Repository audit failed. Check if the repo is public.");
    } finally {
      setRepoLoading(false);
      onRunStateChange?.(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRepoUrl("");
    setQuery("Analyze this code for code smells, anti-patterns, complexity, and refactoring opportunities.");
    setError("");
    onResult?.(null);
    onRunStateChange?.(null);
  };

  return (
    <div className="upload-audit-wrapper">
      {/* GitHub Repo Scanner */}
      <div className="audit-section-box">
        <div className="audit-section-header">
          <div className="audit-header-icon">
            <GitFork size={16} />
          </div>
          <div>
            <h4>Scan Remote GitHub Repository</h4>
            <p>Run AST parsing & smell classification across all source files in a public repo</p>
          </div>
        </div>

        <div className="repo-input-row">
          <div className="repo-url-field">
            <GitBranch size={15} className="repo-field-icon" />
            <input
              type="url"
              placeholder="https://github.com/organization/repository"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRepositoryAnalyze()}
              aria-label="GitHub Repository URL"
            />
          </div>
          <button
            type="button"
            className="btn-repo-scan"
            onClick={handleRepositoryAnalyze}
            disabled={repoLoading || loading}
          >
            {repoLoading ? (
              <>
                <div className="spinner-compact"></div>
                <span>Scanning Repo...</span>
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                <span>Audit Repo</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="or-divider">
        <span>OR UPLOAD LOCAL SOURCE</span>
      </div>

      {/* Local File Dropzone */}
      <div
        className={`file-dropzone-box ${file ? "has-file" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="source-file-input"
          accept=".py,.java,.cpp,.c,.js,.ts,.jsx,.tsx,.go,.rs"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          hidden
        />

        {file ? (
          <div className="file-active-card">
            <div className="file-active-info">
              <div className="file-icon-badge">
                <FileCode size={20} />
              </div>
              <div className="file-meta">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(1)} KB • Ready for AST & ML scan</span>
              </div>
            </div>
            <button
              type="button"
              className="file-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              title="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <label htmlFor="source-file-input" className="dropzone-label">
            <div className="dropzone-icon-glow">
              <UploadCloud size={28} />
            </div>
            <div className="dropzone-text">
              <h5>Drag and drop source code file here</h5>
              <p>or click to browse from your workstation</p>
            </div>
            <div className="supported-badges">
              <span>.py</span>
              <span>.java</span>
              <span>.ts</span>
              <span>.js</span>
              <span>.cpp</span>
              <span>.c</span>
              <span>.go</span>
              <span>.rs</span>
            </div>
          </label>
        )}
      </div>

      {/* Query Focus & Preset Chips */}
      <div className="query-config-section">
        <label className="config-label">
          <Sparkles size={13} className="text-cyan" />
          <span>Analysis Focus / Custom Instructions:</span>
        </label>
        <input
          type="text"
          className="custom-query-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Specify what RigelAI should focus on..."
        />

        <div className="query-preset-chips">
          <span className="chips-label">Presets:</span>
          {PRESET_QUERIES.map((p) => (
            <button
              key={p}
              type="button"
              className="query-chip"
              onClick={() => setQuery(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="upload-actions-bar">
        <button
          type="button"
          className="btn-reset"
          onClick={handleReset}
          disabled={loading || repoLoading}
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          className="btn-file-analyze"
          onClick={handleAnalyze}
          disabled={loading || repoLoading || !file}
        >
          {loading ? (
            <>
              <div className="spinner-compact"></div>
              <span>Processing AST & ML...</span>
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" />
              <span>Run File Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="audit-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
