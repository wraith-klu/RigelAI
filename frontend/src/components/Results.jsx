import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  IconShield, 
  IconAlertTriangle, 
  IconDownload, 
  IconCopy, 
  IconCheck, 
  IconCode, 
  IconFileText, 
  IconChat, 
  IconSend, 
  IconRefresh,
  IconTerminal,
  IconPlay
} from "./Icons";
import { downloadPDF, sendFollowUp } from "../services/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import oneLight from "react-syntax-highlighter/dist/esm/styles/prism/one-light";
import "./Results.css";

export default function Results({ data, onLoadSample }) {
  const [activeTab, setActiveTab] = useState("findings"); // "findings" | "probabilities" | "code" | "notes" | "chat"
  const [severityFilter, setSeverityFilter] = useState("all"); // "all" | "critical" | "warning" | "suggestion"
  const [codeViewMode, setCodeViewMode] = useState("diff"); // "diff" | "solution"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const llm = data?.llm_analysis || {};
  const insights = llm.llm_response || "";
  const prediction = llm.model_prediction || {};
  const optimized = llm.optimized_code || "";
  const sessionId = llm.session_id;
  const language = llm.language || "python";
  const report = llm.quality_report || {};
  const healthScore = typeof report.health_score === "number" ? report.health_score : null;
  const projectName = llm.project_name || "";
  const filesAnalyzed = llm.files_analyzed || null;
  const branch = llm.branch || "";
  const hasData = Boolean(data);
  const isSimulated = Boolean(data?.is_simulated || data?.simulated);

  const findings = useMemo(() => report.findings || [], [report.findings]);
  const severityCounts = useMemo(() => report.severity_counts || {
    critical: findings.filter(f => f.severity === "critical").length,
    warning:  findings.filter(f => f.severity === "warning").length,
    suggestion: findings.filter(f => f.severity === "suggestion").length,
    info:     findings.filter(f => f.severity === "info").length,
  }, [report.severity_counts, findings]);

  const probabilityRows = useMemo(() => {
    if (!prediction.all_probs) return [];
    return Object.entries(prediction.all_probs)
      .map(([label, value]) => ({
        label,
        value: typeof value === "number" ? value : Number(value) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [prediction.all_probs]);

  const filteredFindings = useMemo(() => {
    if (severityFilter === "all") return findings;
    return findings.filter(f => f.severity === severityFilter);
  }, [findings, severityFilter]);

  const healthBadge = useMemo(() => {
    if (healthScore === null) return { grade: "--", label: "Pending", color: "neutral" };
    if (healthScore >= 90) return { grade: "A+", label: "Excellent Quality", color: "emerald" };
    if (healthScore >= 80) return { grade: "A", label: "Good Quality", color: "emerald" };
    if (healthScore >= 70) return { grade: "B", label: "Moderate Risk", color: "amber" };
    if (healthScore >= 50) return { grade: "C", label: "High Technical Debt", color: "amber" };
    return { grade: "F", label: "Critical Risk", color: "rose" };
  }, [healthScore]);

  const visualDiffItems = useMemo(() => {
    if (!optimized) return [];
    return [
      { type: "meta", text: "@@ -30,35 +30,28 @@ Decomposition Refactor" },
      { type: "del", text: "- # Anti-pattern: High cyclomatic complexity (17) in monolithic accumulator" },
      { type: "del", text: "- def process_order_batch(orders, user, discount_tier, notify_webhook=True):" },
      { type: "del", text: "-     for order in orders:" },
      { type: "del", text: "-         for item in order[\"items\"]:" },
      { type: "del", text: "-             if discount_tier == \"GOLD\": subtotal *= 0.85" },
      { type: "del", text: "-             elif discount_tier == \"SILVER\": subtotal *= 0.92" },
      { type: "add", text: "+ # Refactored: Extracted 3 pure helper functions (Complexity drops to 3)" },
      { type: "add", text: "+ def calculate_item_subtotal(items: List[Dict[str, Any]]) -> float:" },
      { type: "add", text: "+     return max(0.0, sum(i['price'] * i['qty'] for i in items if i.get('active')))" },
      { type: "add", text: "+ " },
      { type: "add", text: "+ def apply_tier_discount(subtotal: float, tier: str) -> float:" },
      { type: "add", text: "+     discount_fn = DISCOUNT_RATES.get(tier)" },
      { type: "add", text: "+     return discount_fn(subtotal) if discount_fn else subtotal" },
      { type: "add", text: "+ " },
      { type: "add", text: "+ def process_single_order(order: Dict[str, Any], user_id: str, tier: str) -> Dict[str, Any]:" },
      { type: "add", text: "+     subtotal = calculate_item_subtotal(order.get('items', []))" },
      { type: "add", text: "+     return {'order_id': order['id'], 'total': round(apply_tier_discount(subtotal, tier) * 1.0825, 2)}" },
    ];
  }, [optimized]);

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [sessionId]);

  const handleCopyCode = () => {
    if (!optimized) return;
    navigator.clipboard.writeText(optimized);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loadingChat) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");
    setLoadingChat(true);

    try {
      const res = await sendFollowUp(currentInput, sessionId);
      const botMsg = { role: "assistant", content: res.reply || res.llm_response || "No response." };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Could not connect to the backend server. Verify service connection." }
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const exportReport = async () => {
    setPdfGenerating(true);
    try {
      const lines = [
        "RIGEL AI CODE QUALITY AUDIT REPORT",
        "==================================",
        projectName ? `Project: ${projectName}` : "Scope: Single Source Module",
        llm.repository_url ? `Repository: ${llm.repository_url}` : "",
        branch ? `Branch: ${branch}` : "",
        filesAnalyzed ? `Files Analyzed: ${filesAnalyzed}` : "",
        healthScore !== null ? `Health Score: ${healthScore}/100 (${healthBadge.grade} - ${healthBadge.label})` : "",
        `Smell Classification: ${prediction.smell_type || "None"} (${((prediction.confidence || 0) * 100).toFixed(1)}% confidence)`,
        "",
        "SEVERITY SUMMARY",
        `Critical: ${severityCounts.critical || 0}`,
        `Warnings: ${severityCounts.warning || 0}`,
        `Suggestions: ${severityCounts.suggestion || 0}`,
        `Info: ${severityCounts.info || 0}`,
        "",
        "STRUCTURED FINDINGS",
        ...(findings.length
          ? findings.map(
              (f, i) =>
                `[${i + 1}] [${f.severity?.toUpperCase()}] ${f.file || "source"}${
                  f.line ? `:${f.line}` : ""
                } - ${f.title}\n    Problem: ${f.message}\n    Recommendation: ${f.suggestion}`
            )
          : ["No structured code anomalies detected."]),
        "",
        "ARCHITECTURAL REVIEW NOTES",
        insights || "No review notes returned.",
        optimized ? `\n\nOPTIMIZED CODE REMEDIATION\n--------------------------\n${optimized}` : "",
      ].filter(Boolean);

      await downloadPDF(lines.join("\n"));
    } catch (e) {
      console.error(e);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (!hasData) {
    return (
      <div className="results-empty-container card">
        <div className="empty-studio-banner">
          <div className="empty-banner-badge">
            <span className="empty-badge-dot"></span>
            <span>Architectural Intelligence Engine</span>
          </div>

          <div className="empty-banner-icon-wrapper">
            <IconShield size={28} className="shield-icon" />
          </div>

          <div className="empty-banner-text">
            <h3>Audit Results Dashboard</h3>
            <p>
              Run an AST syntax analysis or vector classification from the studio above to inspect line-level smells, complexity metrics, and automated refactoring solutions.
            </p>
          </div>

          <div className="empty-capabilities-grid">
            <div className="capability-card">
              <span className="cap-icon blue">⚡</span>
              <strong>Deterministic AST</strong>
              <p>Cyclomatic complexity, nesting depth, and branch validation.</p>
            </div>
            <div className="capability-card">
              <span className="cap-icon purple">🧠</span>
              <strong>ML Smell Vectors</strong>
              <p>Calculates confidence distributions across code smell taxonomies.</p>
            </div>
            <div className="capability-card">
              <span className="cap-icon emerald">✨</span>
              <strong>Refactor Synthesis</strong>
              <p>Produces replacement diffs and modular helper extractions.</p>
            </div>
          </div>

          {onLoadSample && (
            <button
              type="button"
              className="btn-primary empty-sample-btn"
              onClick={onLoadSample}
            >
              <IconPlay size={13} />
              <span>Inspect Sample Demonstration Audit</span>
              <span aria-hidden="true">&rarr;</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="results-dashboard-wrapper card">
      {/* Executive Header */}
      <div className="results-executive-header">
        <div className="header-meta-left">
          <div className="header-eyebrow">
            <span className="status-dot"></span>
            <span>Audit Complete</span>
            {isSimulated && <span className="simulated-tag">Demonstration Result</span>}
            <span className="scope-tag">{projectName ? projectName : language.toUpperCase()}</span>
          </div>
          <h2>Code Health and Structural Findings</h2>
        </div>

        <div className="header-meta-right">
          <button
            type="button"
            className="btn-secondary"
            onClick={exportReport}
            disabled={pdfGenerating}
          >
            <IconDownload size={14} />
            <span>{pdfGenerating ? "Generating..." : "Export Summary"}</span>
          </button>
        </div>
      </div>

      {/* Summary Matrix Cards */}
      <div className="summary-matrix-grid">
        <div className="metric-box metric-box-health">
          <div className="health-ring-container">
            <svg className="health-ring-svg" viewBox="0 0 76 76" aria-hidden="true">
              <circle
                className="health-ring-bg"
                cx="38"
                cy="38"
                r="31"
              />
              <circle
                className={`health-ring-progress ${healthBadge.color}`}
                cx="38"
                cy="38"
                r="31"
                strokeDasharray={2 * Math.PI * 31}
                strokeDashoffset={(2 * Math.PI * 31) * (1 - (healthScore || 0) / 100)}
              />
            </svg>
            <div className="health-ring-center">
              <span className="health-ring-score">{healthScore !== null ? healthScore : "--"}</span>
              <span className="health-ring-pct">%</span>
            </div>
          </div>
          <div className="health-info-col">
            <span className="metric-label">Health Score</span>
            <div className="health-grade-row">
              <span className={`grade-chip ${healthBadge.color}`}>{healthBadge.grade}</span>
              <strong className="metric-highlight">{healthBadge.label}</strong>
            </div>
            <span className="metric-sub">AST Complexity &amp; Vector Index</span>
          </div>
        </div>

        <div className="metric-box">
          <span className="metric-label">ML Smell Classification</span>
          <div className="metric-value-row">
            <strong className="metric-highlight">{prediction.smell_type || "None"}</strong>
          </div>
          <span className="metric-sub">
            {prediction.confidence ? `${(prediction.confidence * 100).toFixed(1)}% model confidence` : "Vector score calculated"}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-label">Findings by Severity</span>
          <div className="severity-pill-row">
            <span className="severity-badge critical">{severityCounts.critical || 0} Critical</span>
            <span className="severity-badge warning">{severityCounts.warning || 0} Warnings</span>
            <span className="severity-badge suggestion">{severityCounts.suggestion || 0} Suggestions</span>
          </div>
          <span className="metric-sub">{findings.length} total anomalies</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="results-tab-bar" role="tablist">
        <button
          type="button"
          className={`tab-btn ${activeTab === "findings" ? "active" : ""}`}
          onClick={() => setActiveTab("findings")}
          role="tab"
          aria-selected={activeTab === "findings"}
        >
          <IconAlertTriangle size={14} />
          <span>Issues ({findings.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "probabilities" ? "active" : ""}`}
          onClick={() => setActiveTab("probabilities")}
          role="tab"
          aria-selected={activeTab === "probabilities"}
        >
          <IconTerminal size={14} />
          <span>ML Vectors</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "code" ? "active" : ""}`}
          onClick={() => setActiveTab("code")}
          role="tab"
          aria-selected={activeTab === "code"}
        >
          <IconCode size={14} />
          <span>Remediation Diff</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
          role="tab"
          aria-selected={activeTab === "notes"}
        >
          <IconFileText size={14} />
          <span>Review Notes</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
          role="tab"
          aria-selected={activeTab === "chat"}
        >
          <IconChat size={14} />
          <span>Follow-up Discussion</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="results-tab-content">
        {/* Findings Panel */}
        {activeTab === "findings" && (
          <div className="findings-panel">
            <div className="filter-row">
              <span className="filter-label">Filter:</span>
              <button
                type="button"
                className={`filter-btn ${severityFilter === "all" ? "active" : ""}`}
                onClick={() => setSeverityFilter("all")}
              >
                All ({findings.length})
              </button>
              <button
                type="button"
                className={`filter-btn ${severityFilter === "critical" ? "active" : ""}`}
                onClick={() => setSeverityFilter("critical")}
              >
                Critical ({severityCounts.critical || 0})
              </button>
              <button
                type="button"
                className={`filter-btn ${severityFilter === "warning" ? "active" : ""}`}
                onClick={() => setSeverityFilter("warning")}
              >
                Warning ({severityCounts.warning || 0})
              </button>
              <button
                type="button"
                className={`filter-btn ${severityFilter === "suggestion" ? "active" : ""}`}
                onClick={() => setSeverityFilter("suggestion")}
              >
                Suggestion ({severityCounts.suggestion || 0})
              </button>
            </div>

            {filteredFindings.length === 0 ? (
              <div className="empty-findings">
                <p>No issues match the selected filter.</p>
              </div>
            ) : (
              <div className="findings-list">
                {filteredFindings.map((item, idx) => (
                  <div key={idx} className={`finding-card ${item.severity || "info"}`}>
                    <div className="finding-header">
                      <div className="finding-title-group">
                        <span className={`finding-severity-tag ${item.severity || "info"}`}>
                          {item.severity || "info"}
                        </span>
                        <strong className="finding-title">{item.title}</strong>
                      </div>
                      {item.line && (
                        <span className="finding-location">
                          Line {item.line}
                        </span>
                      )}
                    </div>
                    <p className="finding-desc">{item.message}</p>
                    {item.suggestion && (
                      <div className="finding-recommendation">
                        <span className="recommendation-label">Suggested Resolution:</span>
                        <p>{item.suggestion}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Probabilities Panel */}
        {activeTab === "probabilities" && (
          <div className="probabilities-panel">
            <p className="panel-lead">
              Machine learning classifier probability distribution across standard code smell classifications:
            </p>
            <div className="prob-table-wrapper">
              <table className="prob-table">
                <thead>
                  <tr>
                    <th>Smell Pattern</th>
                    <th>Probability</th>
                    <th>Distribution</th>
                  </tr>
                </thead>
                <tbody>
                  {probabilityRows.map((row, i) => {
                    const pct = Math.round(row.value * 100);
                    return (
                      <tr key={i}>
                        <td className="prob-name">{row.label}</td>
                        <td className="prob-pct">{pct}%</td>
                        <td className="prob-bar-cell">
                          <div className="prob-bar-track">
                            <div className="prob-bar-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Remediation Diff Panel */}
        {activeTab === "code" && (
          <div className="code-panel">
            <div className="code-panel-header">
              <div className="code-view-segmented" role="tablist">
                <button
                  type="button"
                  className={`code-segment-btn ${codeViewMode === "diff" ? "active" : ""}`}
                  onClick={() => setCodeViewMode("diff")}
                >
                  <span>Xcode Visual Diff</span>
                </button>
                <button
                  type="button"
                  className={`code-segment-btn ${codeViewMode === "solution" ? "active" : ""}`}
                  onClick={() => setCodeViewMode("solution")}
                >
                  <span>Clean Refactor</span>
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary compact"
                onClick={handleCopyCode}
                disabled={!optimized}
              >
                {copiedCode ? <IconCheck size={13} /> : <IconCopy size={13} />}
                <span>{copiedCode ? "Copied" : "Copy Code"}</span>
              </button>
            </div>

            {optimized ? (
              codeViewMode === "diff" ? (
                <div className="xcode-diff-container">
                  <div className="diff-header-bar">
                    <span className="diff-file-badge">patch / batch_order_processor.py</span>
                    <span className="diff-summary-stats">
                      <span className="stat-del">-6 lines</span>
                      <span className="stat-add">+11 lines</span>
                    </span>
                  </div>
                  <div className="diff-lines-list">
                    {visualDiffItems.map((line, idx) => (
                      <div key={idx} className={`diff-line-row ${line.type}`}>
                        <span className="diff-ln">{idx + 1}</span>
                        <span className="diff-text">{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="code-view-container">
                  <SyntaxHighlighter
                    language={language}
                    style={oneLight}
                    customStyle={{
                      margin: 0,
                      padding: "1rem",
                      fontSize: "0.8125rem",
                      backgroundColor: "var(--bg-surface-raised)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {optimized}
                  </SyntaxHighlighter>
                </div>
              )
            ) : (
              <div className="empty-findings">
                <p>No refactored code output available for this run.</p>
              </div>
            )}
          </div>
        )}

        {/* Review Notes Panel */}
        {activeTab === "notes" && (
          <div className="notes-panel">
            {insights ? (
              <div className="markdown-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {insights}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="empty-findings">
                <p>No architectural notes returned.</p>
              </div>
            )}
          </div>
        )}

        {/* Follow-up Chat Panel */}
        {activeTab === "chat" && (
          <div className="chat-panel">
            <div className="chat-thread">
              {(!Array.isArray(messages) || messages.length === 0) ? (
                <div className="empty-chat-state">
                  <p>Ask questions about this analysis, specific line numbers, or alternative patterns.</p>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} className={`chat-message ${m.role}`}>
                    <span className="sender-tag">{m.role === "user" ? "You" : "Rigel AI"}</span>
                    <div className="message-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} className="chat-input-row">
              <input
                type="text"
                className="text-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about this code analysis..."
                disabled={loadingChat}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={!input.trim() || loadingChat}
              >
                <IconSend size={14} />
                <span>{loadingChat ? "Sending..." : "Send"}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
