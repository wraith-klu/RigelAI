import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import FileUpload from "./FileUpload";
import { analyzeEditor } from "../services/api";
import "./CodeInputPanel.css";

const LANGUAGES = [
  "python",
  "java",
  "cpp",
  "javascript",
  "csharp",
  "go",
  "rust",
  "typescript",
  "php",
  "ruby",
];

const SAMPLE_CODE = {
  python: `def calculate_discount(items):
    total = 0
    for item in items:
        if item["active"]:
            total = total + item["price"]

    if total > 500:
        total = total - 50

    return total`,

  javascript: `function calculateDiscount(items) {
  let total = 0;

  for (let i = 0; i < items.length; i++) {
    if (items[i].active) {
      total = total + items[i].price;
    }
  }

  if (total > 500) {
    total = total - 50;
  }

  return total;
}`,
};

const AGENT_STAGES = [
  "Preparing source context",
  "Sending request to backend",
  "Running AST analyzer",
  "Checking smell classifier",
  "Drafting AI review notes",
  "Formatting result report",
];

function AgentProgress({ run }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!run) return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);

    return () => window.clearInterval(timer);
  }, [run]);

  const elapsed = run ? Math.max(0, Math.floor((now - run.startedAt) / 1000)) : 0;
  const progress = useMemo(() => {
    if (!run) return 0;
    const estimate = run.estimateSeconds || 18;
    return Math.min(96, Math.round((elapsed / estimate) * 100));
  }, [elapsed, run]);

  if (!run) return null;

  const stageIndex = Math.min(
    AGENT_STAGES.length - 1,
    Math.floor((progress / 100) * AGENT_STAGES.length)
  );
  const eta = Math.max(3, (run.estimateSeconds || 18) - elapsed);

  return (
    <div className="agent-progress" role="status" aria-live="polite">
      <div className="agent-orb" aria-hidden="true">
        <span></span>
      </div>
      <div className="agent-progress-main">
        <div className="agent-progress-topline">
          <div>
            <span className="panel-label">Backend agent active</span>
            <h4>{run.label}</h4>
          </div>
          <strong>{progress}%</strong>
        </div>
        <div className="agent-progress-track">
          <span style={{ width: `${progress}%` }}></span>
        </div>
        <div className="agent-stage-grid">
          {AGENT_STAGES.map((stage, index) => (
            <div
              className={
                index < stageIndex
                  ? "complete"
                  : index === stageIndex
                    ? "active"
                    : ""
              }
              key={stage}
            >
              <span>{index + 1}</span>
              {stage}
            </div>
          ))}
        </div>
        <div className="agent-time-row">
          <span>Working on: {AGENT_STAGES[stageIndex]}</span>
          <span>Wait about {eta}s more</span>
        </div>
      </div>
    </div>
  );
}

export default function CodeInputPanel({ onAnalyze }) {
  const [mode, setMode] = useState("upload");
  const [code, setCode] = useState(SAMPLE_CODE.python);
  const [lang, setLang] = useState("python");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRun, setActiveRun] = useState(null);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError("Add code before running analysis.");
      return;
    }

    setLoading(true);
    setError("");
    setActiveRun({
      label: "Editor analysis",
      estimateSeconds: 18,
      startedAt: Date.now(),
    });

    try {
      const query = `Analyze this ${lang} code for bugs, smells, complexity, and refactoring improvements.`;
      const data = await analyzeEditor(code, query);
      onAnalyze?.(data);
    } catch (e) {
      setError(e.message || "Analysis failed. Check that the backend is running.");
    } finally {
      setLoading(false);
      setActiveRun(null);
    }
  };

  const clearEditor = () => {
    setCode("");
    setError("");
  };

  const loadSample = () => {
    setCode(SAMPLE_CODE[lang] || SAMPLE_CODE.python);
    setError("");
  };

  const handleLanguageChange = (nextLanguage) => {
    setLang(nextLanguage);
    if (SAMPLE_CODE[nextLanguage] && Object.values(SAMPLE_CODE).includes(code)) {
      setCode(SAMPLE_CODE[nextLanguage]);
    }
  };

  return (
    <div className="input-panel">
      <div className="input-panel-header">
        <div>
          <span className="panel-label">Source input</span>
          <h3>Review code instantly</h3>
        </div>

        <div className="input-tabs" role="tablist" aria-label="Input type">
          <button
            className={mode === "upload" ? "active" : ""}
            onClick={() => setMode("upload")}
            type="button"
          >
            Upload
          </button>
          <button
            className={mode === "editor" ? "active" : ""}
            onClick={() => setMode("editor")}
            type="button"
          >
            Editor
          </button>
        </div>
      </div>

      {mode === "editor" && (
        <div className="editor-block">
          <div className="editor-toolbar">
            <label>
              Language
              <select
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>

            <div className="editor-actions">
              <button onClick={loadSample} type="button">
                Load sample
              </button>
              <button onClick={clearEditor} type="button">
                Clear
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="primary"
                type="button"
              >
                {loading ? "Analyzing..." : "Run analysis"}
              </button>
            </div>
          </div>

          <div className="editor-frame">
            <Editor
              height="460px"
              language={lang}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                fontSize: 14,
                lineHeight: 22,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 16, bottom: 16 },
              }}
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div className="hint">
            Tip: start with the sample, then replace it with code from your own
            project to create a stronger demo.
          </div>
        </div>
      )}

      {mode === "upload" && (
        <FileUpload
          onResult={onAnalyze}
          onRunStateChange={(run) => setActiveRun(run)}
        />
      )}

      <AgentProgress run={activeRun} />
    </div>
  );
}
