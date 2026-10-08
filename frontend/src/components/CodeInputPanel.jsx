import React, { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { 
  IconUpload, 
  IconPlay, 
  IconTrash, 
  IconCheck, 
  IconCode,
  IconAlertTriangle,
  IconTerminal
} from "./Icons";
import FileUpload from "./FileUpload";
import { analyzeEditor } from "../services/api";
import "./CodeInputPanel.css";

const LANGUAGES = [
  { id: "python", label: "Python", ext: ".py" },
  { id: "javascript", label: "JavaScript", ext: ".js" },
  { id: "typescript", label: "TypeScript", ext: ".ts" },
  { id: "java", label: "Java", ext: ".java" },
  { id: "cpp", label: "C++", ext: ".cpp" },
  { id: "c", label: "C", ext: ".c" },
  { id: "go", label: "Go", ext: ".go" },
  { id: "rust", label: "Rust", ext: ".rs" },
];

const CODE_PRESETS = {
  python: {
    long_method: `# Example: Long Method and High Cognitive Complexity
def process_order_batch(orders, user, discount_tier, notify_webhook=True):
    total_revenue = 0
    valid_orders = []
    error_log = []
    
    for order in orders:
        if not order.get("id") or not order.get("items"):
            error_log.append(f"Invalid order payload: {order}")
            continue
            
        subtotal = 0
        for item in order["items"]:
            if item.get("active", False):
                price = item.get("price", 0)
                qty = item.get("quantity", 1)
                subtotal += (price * qty)
                if item.get("category") == "clearance":
                    subtotal -= 5.0
                    
        # Complex inline discount rules
        if discount_tier == "GOLD":
            if subtotal > 500:
                subtotal *= 0.85
            else:
                subtotal *= 0.90
        elif discount_tier == "SILVER":
            if subtotal > 300:
                subtotal *= 0.92
        elif discount_tier == "BRONZE":
            subtotal *= 0.97
            
        tax = subtotal * 0.0825
        grand_total = subtotal + tax
        total_revenue += grand_total
        
        valid_orders.append({
            "order_id": order["id"],
            "total": grand_total,
            "user_id": user.get("id")
        })
        
    return {
        "processed_count": len(valid_orders),
        "total_revenue": round(total_revenue, 2),
        "errors": error_log
    }`,
    data_clump: `# Example: Data Clumps and Feature Envy
class ReportGenerator:
    def __init__(self, db_conn):
        self.db = db_conn

    def generate_invoice(self, user_name, user_email, user_address, user_city, user_zip, user_country, items):
        # Repeated parameter groups across multiple functions
        header = f"Invoice for {user_name} <{user_email}>\\n{user_address}, {user_city} {user_zip}, {user_country}"
        lines = [header, "=" * 40]
        total = sum(i["price"] * i["qty"] for i in items)
        for i in items:
            lines.append(f"{i['name']} x{i['qty']} - \${i['price']}")
        lines.append(f"Total: \${total}")
        return "\\n".join(lines)`
  },
  javascript: {
    long_method: `// Example: Complex Nested Callbacks and Long Function
function calculateCartBreakdown(cart, customer, promoCode, callback) {
  let subtotal = 0;
  let appliedDiscount = 0;

  for (let i = 0; i < cart.items.length; i++) {
    const item = cart.items[i];
    if (item.available) {
      let itemPrice = item.unitPrice * item.quantity;
      if (item.isTaxExempt === false) {
        itemPrice += itemPrice * 0.08;
      }
      subtotal += itemPrice;
    }
  }

  if (promoCode === "SAVE15" && subtotal > 100) {
    appliedDiscount = subtotal * 0.15;
  } else if (promoCode === "SAVE5") {
    appliedDiscount = 5;
  }

  const finalTotal = Math.max(0, subtotal - appliedDiscount);
  callback(null, { subtotal, discount: appliedDiscount, total: finalTotal });
}`
  }
};

const AGENT_STAGES = [
  { id: "ast", title: "AST Syntax Parsing", desc: "Extracting symbol tokens and cyclomatic branches" },
  { id: "ml", title: "Smell Classifier Inference", desc: "Evaluating pattern vectors and code smell probabilities" },
  { id: "llm", title: "Refactoring Remediation", desc: "Generating modular structure and architectural diffs" },
  { id: "report", title: "Compiling Quality Matrix", desc: "Synthesizing health scorecard and findings" },
];

function PipelineExecutionHUD({ run }) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!run) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(interval);
  }, [run]);

  if (!run) return null;

  const elapsed = now && run.startedAt ? Math.max(0, Math.floor((now - run.startedAt) / 1000)) : 0;
  const estimate = run.estimateSeconds || 16;
  const progressPercent = Math.min(95, Math.max(8, Math.round((elapsed / estimate) * 100)));
  const stageIndex = Math.min(
    AGENT_STAGES.length - 1,
    Math.floor((progressPercent / 100) * AGENT_STAGES.length)
  );

  return (
    <div className="telemetry-hud" role="status" aria-live="polite">
      <div className="telemetry-hud-top">
        <div className="telemetry-title-group">
          <strong>Analysis Pipeline Active:</strong>
          <span>{run.label}</span>
        </div>
        <div className="telemetry-stats">
          <span>{elapsed}s elapsed</span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      <div className="telemetry-progress-track">
        <div 
          className="telemetry-progress-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="telemetry-stage-grid">
        {AGENT_STAGES.map((stage, idx) => {
          const isComplete = idx < stageIndex;
          const isActive = idx === stageIndex;
          return (
            <div 
              key={stage.id} 
              className={`stage-step ${isComplete ? "complete" : ""} ${isActive ? "active" : ""}`}
            >
              <div className="stage-step-header">
                <span className="stage-num">
                  {isComplete ? <IconCheck size={12} /> : idx + 1}
                </span>
                <span className="stage-title">{stage.title}</span>
              </div>
              <p className="stage-desc">{stage.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CodeInputPanel({ onAnalyze }) {
  const [inputMode, setInputMode] = useState("upload"); // Default to upload so File & Repo Audit is visible always
  const [lang, setLang] = useState("python");
  const [code, setCode] = useState(CODE_PRESETS.python.long_method);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRun, setActiveRun] = useState(null);

  const stats = useMemo(() => {
    const lines = code ? code.split("\n").length : 0;
    const chars = code ? code.length : 0;
    return { lines, chars };
  }, [code]);

  const handleOpenFileInEditor = (fileText, fileName) => {
    setCode(fileText);
    const ext = fileName.split(".").pop().toLowerCase();
    const langMap = {
      py: "python", js: "javascript", ts: "typescript", jsx: "javascript", tsx: "typescript",
      java: "java", cpp: "cpp", c: "c", go: "go", rs: "rust"
    };
    if (langMap[ext]) setLang(langMap[ext]);
    setInputMode("editor");
  };

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      setError("Please input or paste code before triggering analysis.");
      return;
    }

    setLoading(true);
    setError("");
    setActiveRun({
      label: `AST + ML Scan (${lang.toUpperCase()})`,
      estimateSeconds: 12,
      startedAt: Date.now(),
    });

    try {
      const query = `Analyze this ${lang} code for code smells, anti-patterns, AST anomalies, bugs, cyclomatic complexity, and refactoring solutions.`;
      const data = await analyzeEditor(code, query);
      onAnalyze?.(data);
    } catch (e) {
      setError(e.message || "Analysis error. Verify the backend service is running or inspect browser console.");
    } finally {
      setLoading(false);
      setActiveRun(null);
    }
  }, [code, lang, onAnalyze]);

  const handleClear = () => {
    setCode("");
    setError("");
  };

  const handlePresetSelect = (presetKey) => {
    const langPresets = CODE_PRESETS[lang] || CODE_PRESETS.python;
    const selectedCode = langPresets[presetKey] || CODE_PRESETS.python.long_method;
    setCode(selectedCode);
    setError("");
  };

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    if (CODE_PRESETS[newLang]) {
      const firstKey = Object.keys(CODE_PRESETS[newLang])[0];
      setCode(CODE_PRESETS[newLang][firstKey]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (inputMode === "editor" && !loading) {
          e.preventDefault();
          handleAnalyze();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputMode, loading, handleAnalyze]);

  return (
    <div className="input-studio-card card">
      {/* Studio Header & Modality Switch */}
      <div className="studio-card-header">
        <div className="studio-header-left">
          <div className="studio-tab-group" role="tablist" aria-label="Input modality">
            <button
              type="button"
              className={`studio-tab-btn tab-upload ${inputMode === "upload" ? "active" : ""}`}
              onClick={() => setInputMode("upload")}
              role="tab"
              aria-selected={inputMode === "upload"}
            >
              <span className="tab-icon-chip purple" aria-hidden="true">
                <IconUpload size={14} />
              </span>
              <span>File and Repository Audit</span>
              {inputMode === "upload" && <span className="tab-active-indicator" aria-hidden="true"></span>}
            </button>
            <button
              type="button"
              className={`studio-tab-btn tab-editor ${inputMode === "editor" ? "active" : ""}`}
              onClick={() => setInputMode("editor")}
              role="tab"
              aria-selected={inputMode === "editor"}
            >
              <span className="tab-icon-chip blue" aria-hidden="true">
                <IconCode size={14} />
              </span>
              <span>Interactive Code Editor</span>
              {inputMode === "editor" && <span className="tab-active-indicator" aria-hidden="true"></span>}
            </button>
          </div>
        </div>

        <div className="studio-header-right">
          <span className="engine-badge active-engine">
            <span className="engine-status-dot" aria-hidden="true"></span>
            <span>AST Engine Active · Deterministic</span>
          </span>
        </div>
      </div>

      {inputMode === "editor" && (
        <div className="studio-editor-container">
          {/* Editor Control Toolbar */}
          <div className="editor-control-bar">
            <div className="control-bar-left">
              <label htmlFor="language-select" className="visually-hidden">Programming Language</label>
              <select
                id="language-select"
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="select-input"
                aria-label="Select source language"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} ({l.ext})
                  </option>
                ))}
              </select>

              {/* Sample Presets */}
              {CODE_PRESETS[lang] && (
                <div className="preset-buttons">
                  <span className="preset-label">Presets:</span>
                  {Object.keys(CODE_PRESETS[lang]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="preset-btn"
                      onClick={() => handlePresetSelect(k)}
                    >
                      {k === "long_method" ? "Long Method" : "Data Clump"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="control-bar-right">
              <button
                type="button"
                className="btn-switch-upload-chip"
                onClick={() => setInputMode("upload")}
                title="Switch back to File and Repository Audit"
              >
                <span>📁 File &amp; Repo Audit</span>
              </button>

              <button
                type="button"
                className="btn-text"
                onClick={handleClear}
                title="Clear code editor"
              >
                <IconTrash size={13} />
                <span>Clear</span>
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? (
                  <span>Analyzing...</span>
                ) : (
                  <>
                    <IconPlay size={12} />
                    <span>Run Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor Pane */}
          <div className="monaco-pane-frame">
            <Editor
              height="420px"
              language={lang}
              theme="vs"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                fontSize: 13,
                fontFamily: "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace",
                lineHeight: 20,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: "all",
                cursorBlinking: "solid",
                smoothScrolling: false,
                padding: { top: 12, bottom: 12 },
                bracketPairColorization: { enabled: true },
                guides: { indentation: true, bracketPairs: true },
              }}
            />
          </div>

          {/* Editor Status Bar */}
          <div className="editor-status-bar">
            <div className="status-bar-left">
              <span>{lang.toUpperCase()}</span>
              <span>•</span>
              <span>{stats.lines} lines</span>
              <span>•</span>
              <span>{stats.chars} characters</span>
            </div>
            <div className="status-bar-right">
              <kbd className="hotkey-pill">Ctrl+Enter</kbd>
              <span className="hotkey-hint">to run analysis</span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="studio-error-banner" role="alert">
              <IconAlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {inputMode === "upload" && (
        <div className="studio-upload-container">
          <FileUpload
            onResult={onAnalyze}
            onRunStateChange={(run) => setActiveRun(run)}
            onSwitchToEditor={() => setInputMode("editor")}
            onOpenFileInEditor={handleOpenFileInEditor}
          />
        </div>
      )}

      {/* Execution HUD */}
      <PipelineExecutionHUD run={activeRun} />
    </div>
  );
}
