import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { analyzeEditor } from "../services/api";
import "./MacStudioPanel.css";

/* ── Constants ─────────────────────────────────────── */
const LANGUAGES = [
  { id: "python",     label: "Python",     ext: ".py"   },
  { id: "javascript", label: "JavaScript", ext: ".js"   },
  { id: "typescript", label: "TypeScript", ext: ".ts"   },
  { id: "java",       label: "Java",       ext: ".java" },
  { id: "cpp",        label: "C++",        ext: ".cpp"  },
  { id: "go",         label: "Go",         ext: ".go"   },
];

const STUDIO_TABS = [
  { id: "editor",     label: "Editor",      icon: "⌨" },
  { id: "audit",      label: "Audit",       icon: "⚡" },
  { id: "terminal",   label: "Terminal",    icon: "⌃" },
  { id: "ai",         label: "AI Insights", icon: "✦" },
  { id: "team",       label: "Team",        icon: "◎" },
];

const DEFAULT_CODE = `# Paste your code here or use the language selector
def process_order_batch(orders, user, discount_tier):
    total_revenue = 0
    valid_orders = []
    
    for order in orders:
        if not order.get("id") or not order.get("items"):
            continue
        subtotal = 0
        for item in order["items"]:
            if item.get("active", False):
                subtotal += item.get("price", 0) * item.get("quantity", 1)
        if discount_tier == "GOLD":
            subtotal *= 0.85
        elif discount_tier == "SILVER":
            subtotal *= 0.92
        total_revenue += subtotal * 1.0825
        valid_orders.append({"order_id": order["id"], "total": total_revenue})
    
    return {"processed": len(valid_orders), "revenue": round(total_revenue, 2)}
`;

/* ── Gauge helpers ──────────────────────────────────── */
const CIRCUMFERENCE = 2 * Math.PI * 54; // r=54

function gaugeColor(score) {
  if (score === null) return "#94a3b8";
  if (score >= 80)   return "#34d399";
  if (score >= 60)   return "#fbbf24";
  return "#f87171";
}
function gaugeGrade(score) {
  if (score === null) return { grade: "--", label: "Pending" };
  if (score >= 90)   return { grade: "A+", label: "Excellent" };
  if (score >= 80)   return { grade: "A",  label: "Good" };
  if (score >= 70)   return { grade: "B",  label: "Moderate" };
  if (score >= 50)   return { grade: "C",  label: "High Debt" };
  return               { grade: "F",  label: "Critical" };
}
function gaugeGlow(score) {
  if (score === null) return "";
  if (score >= 70)   return "glow-emerald";
  if (score >= 50)   return "glow-amber";
  return "glow-rose";
}

/* ── Component ──────────────────────────────────────── */
export default function MacStudioPanel({ onAnalyze, initialData }) {
  const [activeTab,   setActiveTab]   = useState("editor");
  const [language,    setLanguage]    = useState("python");
  const [code,        setCode]        = useState(DEFAULT_CODE);
  const [persona,     setPersona]     = useState("architect");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [auditData,   setAuditData]   = useState(initialData || null);
  const editorRef = useRef(null);

  /* Sync when parent loads a sample */
  useEffect(() => {
    if (initialData) setAuditData(initialData);
  }, [initialData]);

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  /* ── Run analysis ── */
  const handleRun = useCallback(async () => {
    const src = editorRef.current?.getValue() || code;
    if (!src.trim()) return;
    setLoading(true);
    setError(null);
    setActiveTab("audit");
    try {
      const result = await analyzeEditor({ code: src, language, persona });
      setAuditData(result);
      onAnalyze?.(result);
    } catch (err) {
      setError(err?.message || "Analysis failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }, [code, language, persona, onAnalyze]);

  /* ── Derived audit data ── */
  const llm        = auditData?.llm_analysis || {};
  const report     = llm.quality_report     || {};
  const findings   = report.findings        || [];
  const healthScore= typeof report.health_score === "number" ? report.health_score : null;
  const { grade, label: gradeLabel } = gaugeGrade(healthScore);
  const fillColor  = gaugeColor(healthScore);
  const glowClass  = gaugeGlow(healthScore);
  const dashOffset = healthScore === null
    ? CIRCUMFERENCE
    : CIRCUMFERENCE - (healthScore / 100) * CIRCUMFERENCE;

  const currentLang = LANGUAGES.find(l => l.id === language) || LANGUAGES[0];

  /* ── Micro-pills derived from data ── */
  const pills = useMemo(() => {
    const defectConf = llm.defect_confidence || llm.model_prediction?.confidence;
    const cloneConf  = llm.clone_confidence;
    const techDebt   = report.technical_debt;
    const p = [];
    p.push({ label: "GraphCodeBERT INT8", cls: "pill-ai" });
    if (findings.filter(f => f.severity === "critical").length === 0)
      p.push({ label: "Zero CVEs", cls: "pill-green" });
    if (techDebt)
      p.push({ label: `SQALE ${techDebt}`, cls: "pill-amber" });
    else if (healthScore !== null)
      p.push({ label: healthScore >= 70 ? "Healthy Quality" : "High Debt", cls: healthScore >= 70 ? "pill-green" : "pill-amber" });
    p.push({ label: "EPS Tagged",  cls: "pill-cyan" });
    p.push({ label: "HRF 1s",      cls: "pill-orange" });
    return p;
  }, [llm, report, findings, healthScore]);

  /* ── File name displayed ── */
  const fileName = llm.project_name || `main${currentLang.ext}`;

  return (
    <div className="mac-studio-stage">
      <div className="mac-studio-window">

        {/* ── Title Bar ── */}
        <div className="mac-studio-titlebar">
          <div className="mac-traffic-lights" aria-hidden="true">
            <span className="mac-dot mac-dot-close">✕</span>
            <span className="mac-dot mac-dot-minimize">−</span>
            <span className="mac-dot mac-dot-expand">+</span>
          </div>

          <div className="mac-title-file-tab">
            <span className="mac-title-file-dot" />
            <span>{fileName}</span>
          </div>

          <div className="mac-title-center">CodeSentinel AI · Neural Studio</div>

          <div className="mac-engine-pill">
            <span className="mac-engine-pill-dot" />
            MoS · INT8
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="mac-tab-bar" role="tablist">
          {STUDIO_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`mac-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="mac-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}

          {/* Language selector — right-aligned */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                background: "var(--app-surface)",
                border: "1px solid var(--app-rule-hover)",
                borderRadius: 5,
                color: "var(--app-ink-muted)",
                fontSize: 11,
                padding: "3px 6px",
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              {LANGUAGES.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading bar */}
        {loading && <div className="mac-loading-bar" />}

        {/* ── Split Body ── */}
        <div className="mac-studio-body">

          {/* ── Left: Editor ── */}
          <div className="mac-editor-pane">
            <div className="mac-editor-header">
              <div className="mac-editor-breadcrumb">
                <span>src</span>
                <span className="sep">/</span>
                <span>{fileName}</span>
              </div>
              <span className="mac-lang-badge">{currentLang.label}</span>
            </div>

            <div className="mac-editor-wrap">
              <Editor
                height="100%"
                language={language === "cpp" ? "cpp" : language}
                value={code}
                onChange={val => setCode(val || "")}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, monospace",
                  fontLigatures: true,
                  minimap:         { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers:     "on",
                  glyphMargin:     false,
                  folding:         true,
                  renderLineHighlight: "gutter",
                  scrollbar:       { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
                  padding:         { top: 10, bottom: 10 },
                  bracketPairColorization: { enabled: true },
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  lineHeight: 20,
                  overviewRulerBorder: false,
                  hideCursorInOverviewRuler: true,
                  renderWhitespace: "none",
                  wordWrap: "on",
                }}
              />
            </div>

            {/* ── Editor Footer: Persona + Run button ── */}
            <div className="mac-editor-footer">
              <div className="mac-persona-row">
                <button
                  className={`mac-persona-btn${persona === "architect" ? " selected" : ""}`}
                  onClick={() => setPersona("architect")}
                >
                  🏛 Architect
                </button>
                <button
                  className={`mac-persona-btn${persona === "student" ? " selected" : ""}`}
                  onClick={() => setPersona("student")}
                >
                  🎓 ELI5 Student
                </button>
              </div>

              <button
                className="mac-run-btn"
                onClick={handleRun}
                disabled={loading}
              >
                <span>⚡</span>
                <span>{loading ? "Analyzing…" : "Run Neural Analysis"}</span>
              </button>
            </div>
          </div>

          {/* ── Right: Audit Panel ── */}
          <div className="mac-audit-pane">
            <div className="mac-audit-header">
              <div className="mac-audit-title">Architecture &amp; DevSecOps Audit</div>
              <div className="mac-audit-subtitle">
                {auditData
                  ? `${findings.length} finding${findings.length !== 1 ? "s" : ""} · ${llm.language || language}`
                  : "Submit code to begin analysis"}
              </div>
            </div>

            {/* ── Gauge + Pills ── */}
            <div className="mac-gauge-wrap">
              <div className={`mac-gauge-svg-wrap ${auditData ? glowClass : ""}`}>
                <svg className="mac-gauge-svg" viewBox="0 0 120 120">
                  <circle
                    className="mac-gauge-track"
                    cx="60" cy="60" r="54"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset="0"
                  />
                  <circle
                    className="mac-gauge-fill"
                    cx="60" cy="60" r="54"
                    stroke={fillColor}
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={dashOffset}
                    style={{ filter: auditData ? `drop-shadow(0 0 6px ${fillColor})` : "none" }}
                  />
                </svg>
                <div className="mac-gauge-center">
                  <div className="mac-gauge-score" style={{ color: auditData ? fillColor : "var(--app-ink-subtle)" }}>
                    {healthScore ?? "--"}
                  </div>
                  <div className="mac-gauge-grade" style={{ color: fillColor }}>
                    {auditData ? `Grade ${grade}` : "No Data"}
                  </div>
                </div>
              </div>

              {/* Micro-pills */}
              <div className="mac-micro-pills">
                {auditData
                  ? pills.map((p, i) => (
                      <span key={i} className={`mac-pill ${p.cls}`}>{p.label}</span>
                    ))
                  : (
                    <>
                      <span className="mac-pill pill-ai">GraphCodeBERT INT8</span>
                      <span className="mac-pill pill-cyan">MoS · 4 Models</span>
                      <span className="mac-pill pill-orange">SQALE Engine</span>
                    </>
                  )
                }
              </div>
            </div>

            <div className="mac-audit-divider" />

            {/* ── Findings list ── */}
            {error && (
              <div style={{ padding: "14px 18px", color: "var(--status-critical)", fontSize: 12 }}>
                ⚠ {error}
              </div>
            )}

            {!auditData && !loading && !error && (
              <div className="mac-audit-idle">
                <div className="mac-audit-idle-icon">⚡</div>
                <div className="mac-audit-idle-title">Neural Analysis Ready</div>
                <div className="mac-audit-idle-desc">
                  Paste your code in the editor and click <strong>Run Neural Analysis</strong> to get real-time defect detection, clone analysis, and SQALE debt scoring.
                </div>
              </div>
            )}

            {auditData && findings.length > 0 && (
              <div className="mac-findings-list">
                {findings.map((f, i) => (
                  <div key={i} className="mac-finding-item">
                    <div className={`mac-finding-sev sev-${f.severity}`} />
                    <div className="mac-finding-body">
                      <div className="mac-finding-title">{f.title}</div>
                      <div className="mac-finding-meta">{f.file}</div>
                    </div>
                    {f.line && (
                      <div className="mac-finding-line-badge">L{f.line}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {auditData && findings.length === 0 && (
              <div className="mac-audit-idle">
                <div className="mac-audit-idle-icon">✅</div>
                <div className="mac-audit-idle-title">No Issues Found</div>
                <div className="mac-audit-idle-desc">Code passed all neural checks. Grade {grade}.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Status Bar ── */}
        <div className="mac-studio-statusbar">
          <div className="mac-statusbar-left">
            <span className="mac-statusbar-dot" />
            <span>MoS Pipeline Ready</span>
            <span>GraphCodeBERT · CodeBERT · CodeT5 · LLM</span>
          </div>
          <div className="mac-statusbar-right">
            <span>UTF-8</span>
            <span>LF</span>
            <span>{currentLang.label}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
