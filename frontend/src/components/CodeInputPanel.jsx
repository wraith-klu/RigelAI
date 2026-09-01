import { useCallback, useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { 
  Code2, 
  Upload, 
  Play, 
  Trash2, 
  BookOpen, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Cpu, 
  Clock, 
  FileCode2,
  Layers,
  ChevronRight
} from "lucide-react";
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
    long_method: `# Smell Example: Long Method & High Cognitive Complexity
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
    data_clump: `# Smell Example: Data Clumps & Feature Envy
class ReportGenerator:
    def __init__(self, db_conn):
        self.db = db_conn

    def generate_invoice(self, user_name, user_email, user_address, user_city, user_zip, user_country, items):
        # Repeated parameter groups across multiple reporting functions
        header = f"Invoice for {user_name} <{user_email}>\\n{user_address}, {user_city} {user_zip}, {user_country}"
        lines = [header, "=" * 40]
        total = sum(i["price"] * i["qty"] for i in items)
        for i in items:
            lines.append(f"{i['name']} x{i['qty']} - \${i['price']}")
        lines.append(f"Total: \${total}")
        return "\\n".join(lines)`
  },
  javascript: {
    long_method: `// Smell Example: Complex Nested Callbacks & Long Function
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

  if (promoCode === "CYBER15" && subtotal > 100) {
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
  { id: "ast", title: "AST Syntax & Tree Parsing", desc: "Extracting symbol tokens and cyclomatic branches" },
  { id: "ml", title: "Smell Classifier Inference", desc: "Running CodeSmell-RoBERTa / AST pattern vector model" },
  { id: "llm", title: "AI Remediation Analysis", desc: "Evaluating maintainability, bugs, and refactoring pathways" },
  { id: "report", title: "Compiling Quality Matrix", desc: "Synthesizing health scorecard, diffs, and remediation" },
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
  const eta = Math.max(2, estimate - elapsed);

  return (
    <div className="telemetry-hud" role="status" aria-live="polite">
      <div className="telemetry-hud-top">
        <div className="telemetry-title-group">
          <div className="telemetry-pulse-orb">
            <Cpu size={16} className="text-cyan" />
          </div>
          <div>
            <div className="telemetry-tag">
              <span className="dot-active"></span>
              Execution Pipeline Active
            </div>
            <h4>{run.label}</h4>
          </div>
        </div>
        <div className="telemetry-stats">
          <div className="stat-unit">
            <Clock size={13} />
            <span>Elapsed: <strong>{elapsed}s</strong></span>
          </div>
          <div className="stat-unit eta">
            <span>ETA: ~<strong>{eta}s</strong></span>
          </div>
          <div className="telemetry-percent">{progressPercent}%</div>
        </div>
      </div>

      <div className="telemetry-progress-track">
        <div 
          className="telemetry-progress-fill" 
          style={{ width: `${progressPercent}%` }}
        >
          <span className="telemetry-shimmer"></span>
        </div>
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
                  {isComplete ? <CheckCircle2 size={12} /> : idx + 1}
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

export default function CodeInputPanel({ onAnalyze, theme = "dark" }) {
  const [inputMode, setInputMode] = useState("upload"); // "upload" | "editor"
  const [lang, setLang] = useState("python");
  const [code, setCode] = useState(CODE_PRESETS.python.long_method);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeRun, setActiveRun] = useState(null);

  // Line count and character statistics
  const stats = useMemo(() => {
    const lines = code ? code.split("\n").length : 0;
    const chars = code ? code.length : 0;
    return { lines, chars };
  }, [code]);

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      setError("Please input or paste code before triggering analysis.");
      return;
    }

    setLoading(true);
    setError("");
    setActiveRun({
      label: `Deep AST + ML Scan (${lang.toUpperCase()})`,
      estimateSeconds: 16,
      startedAt: Date.now(),
    });

    try {
      const query = `Analyze this ${lang} code for code smells, anti-patterns, AST anomalies, bugs, cyclomatic complexity, and refactoring solutions.`;
      const data = await analyzeEditor(code, query);
      onAnalyze?.(data);
    } catch (e) {
      setError(e.message || "Analysis pipeline error. Verify the FastAPI backend is running.");
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

  // Keyboard shortcut: Ctrl/Cmd + Enter to run analysis
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
    <div className="input-studio-card">
      {/* Studio Header & Modality Switch */}
      <div className="studio-card-header">
        <div className="studio-header-left">
          <div className="studio-mode-pills" role="tablist" aria-label="Input modality">
            <button
              type="button"
              className={`mode-pill ${inputMode === "upload" ? "active" : ""}`}
              onClick={() => setInputMode("upload")}
              role="tab"
              aria-selected={inputMode === "upload"}
            >
              <Upload size={15} />
              <span>File & Repository Audit</span>
            </button>
            <button
              type="button"
              className={`mode-pill ${inputMode === "editor" ? "active" : ""}`}
              onClick={() => setInputMode("editor")}
              role="tab"
              aria-selected={inputMode === "editor"}
            >
              <Code2 size={15} />
              <span>Interactive Monaco IDE</span>
            </button>
          </div>
        </div>

        <div className="studio-header-right">
          <span className="engine-badge">
            <Cpu size={12} />
            <span>AST v2.4 + PyTorch ML</span>
          </span>
        </div>
      </div>

      {inputMode === "editor" && (
        <div className="studio-editor-container">
          {/* Editor Control Toolbar */}
          <div className="editor-control-bar">
            <div className="control-bar-left">
              {/* Language Selector */}
              <div className="select-wrapper">
                <FileCode2 size={14} className="select-icon" />
                <select
                  value={lang}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="modern-select"
                  aria-label="Select source language"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label} ({l.ext})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sample Presets */}
              {CODE_PRESETS[lang] && (
                <div className="preset-buttons">
                  <span className="preset-label">Smell Presets:</span>
                  {Object.keys(CODE_PRESETS[lang]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => handlePresetSelect(k)}
                    >
                      <BookOpen size={12} />
                      <span>{k.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="control-bar-right">
              <button
                type="button"
                className="btn-toolbar"
                onClick={handleClear}
                title="Clear code editor"
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>

              <button
                type="button"
                className="btn-run-analysis"
                onClick={handleAnalyze}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-compact"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>Run AST + ML Analysis</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor Pane */}
          <div className="monaco-pane-frame">
            <Editor
              height="480px"
              language={lang}
              theme={theme === "light" ? "vs" : "vs-dark"}
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
                lineHeight: 22,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: "all",
                cursorBlinking: "smooth",
                smoothScrolling: true,
                padding: { top: 14, bottom: 14 },
                bracketPairColorization: { enabled: true },
                guides: { indentation: true, bracketPairs: true },
              }}
            />
          </div>

          {/* Editor Status Bar */}
          <div className="editor-status-bar">
            <div className="status-bar-left">
              <span className="status-item">
                <FileCode2 size={12} />
                <span>{lang.toUpperCase()}</span>
              </span>
              <span className="status-separator">•</span>
              <span className="status-item">{stats.lines} lines</span>
              <span className="status-separator">•</span>
              <span className="status-item">{stats.chars} characters</span>
            </div>
            <div className="status-bar-right">
              <kbd className="hotkey-pill">⌘/Ctrl + Enter</kbd>
              <span className="hotkey-hint">to run analysis</span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="studio-error-banner" role="alert">
              <AlertCircle size={16} />
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
          />
        </div>
      )}

      {/* Real-time Telemetry Pipeline HUD */}
      <PipelineExecutionHUD run={activeRun} />
    </div>
  );
}
