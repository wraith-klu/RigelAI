import { useState } from "react";
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

export default function CodeInputPanel({ onAnalyze }) {
  const [mode, setMode] = useState("upload");
  const [code, setCode] = useState(SAMPLE_CODE.python);
  const [lang, setLang] = useState("python");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setError("Add code before running analysis.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const query = `Analyze this ${lang} code for bugs, smells, complexity, and refactoring improvements.`;
      const data = await analyzeEditor(code, query);
      onAnalyze?.(data);
    } catch (e) {
      setError(e.message || "Analysis failed. Check that the backend is running.");
    } finally {
      setLoading(false);
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

      {mode === "upload" && <FileUpload onResult={onAnalyze} />}
    </div>
  );
}
