import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Lightbulb, 
  Info, 
  Download, 
  Copy, 
  Check, 
  Code2, 
  FileText, 
  BarChart3, 
  MessageSquareCode, 
  ChevronRight, 
  Send, 
  Bot, 
  Sparkles,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Terminal
} from "lucide-react";
import { downloadPDF, sendFollowUp } from "../services/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Results.css";

export default function Results({ data, theme = "dark" }) {
  const [activeTab, setActiveTab] = useState("findings"); // "findings" | "probabilities" | "code" | "notes" | "chat"
  const [severityFilter, setSeverityFilter] = useState("all"); // "all" | "critical" | "warning" | "suggestion"
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const llm = data?.llm_analysis || {};
  const ast = llm.ast_findings || [];
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

  // Stable references for derived arrays — prevents useMemo deps changing every render
  const findings = useMemo(() => report.findings || [], [report.findings]);
  const severityCounts = useMemo(() => report.severity_counts || {
    critical: findings.filter(f => f.severity === "critical").length,
    warning:  findings.filter(f => f.severity === "warning").length,
    suggestion: findings.filter(f => f.severity === "suggestion").length,
    info:     findings.filter(f => f.severity === "info").length,
  }, [report.severity_counts, findings]);

  // Model probabilities sorted descending
  const probabilityRows = useMemo(() => {
    if (!prediction.all_probs) return [];
    return Object.entries(prediction.all_probs)
      .map(([label, value]) => ({
        label,
        value: typeof value === "number" ? value : Number(value) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [prediction.all_probs]);

  // Filtered findings
  const filteredFindings = useMemo(() => {
    if (severityFilter === "all") return findings;
    return findings.filter(f => f.severity === severityFilter);
  }, [findings, severityFilter]);

  // Health score grade & color
  const healthBadge = useMemo(() => {
    if (healthScore === null) return { grade: "--", label: "Pending", color: "neutral" };
    if (healthScore >= 90) return { grade: "A+", label: "Excellent Health", color: "emerald" };
    if (healthScore >= 80) return { grade: "A", label: "Good Health", color: "emerald" };
    if (healthScore >= 70) return { grade: "B", label: "Moderate Risk", color: "amber" };
    if (healthScore >= 50) return { grade: "C", label: "High Technical Debt", color: "amber" };
    return { grade: "F", label: "Critical Risk", color: "rose" };
  }, [healthScore]);

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

  const sendMessage = async (overrideText) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || !sessionId || loadingChat) return;

    const userMsg = { role: "user", text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoadingChat(true);

    try {
      const res = await sendFollowUp(textToSend, sessionId);
      const botText = res?.llm_analysis?.llm_response || JSON.stringify(res, null, 2);
      setMessages((prev) => [...prev, { role: "assistant", text: botText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Follow-up discussion request failed. Verify the backend connection." },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  const exportReport = async () => {
    setPdfGenerating(true);
    try {
      const lines = [
        "RIGEL AI / CODESENTINEL CODE QUALITY AUDIT REPORT",
        "==================================================",
        projectName ? `Project: ${projectName}` : "Scope: Single Source Module",
        llm.repository_url ? `Repository: ${llm.repository_url}` : "",
        branch ? `Branch: ${branch}` : "",
        filesAnalyzed ? `Files Analyzed: ${filesAnalyzed}` : "",
        healthScore !== null ? `Health Score: ${healthScore}/100 (${healthBadge.grade} - ${healthBadge.label})` : "",
        `Smell Classification: ${prediction.smell_type || "None"} (${((prediction.confidence || 0) * 100).toFixed(1)}% confidence)`,
        "",
        "SEVERITY SUMMARY",
        `• Critical Issues: ${severityCounts.critical || 0}`,
        `• Complexity Warnings: ${severityCounts.warning || 0}`,
        `• Optimization Suggestions: ${severityCounts.suggestion || 0}`,
        `• Info Findings: ${severityCounts.info || 0}`,
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
        "AI ARCHITECTURAL REVIEW NOTES",
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
      <div className="results-empty-container">
        <div className="empty-studio-banner">
          <div className="empty-banner-icon">
            <ShieldCheck size={28} />
          </div>
          <div className="empty-banner-text">
            <h3>Audit Results Dashboard</h3>
            <p>Run AST analysis or ML smell classification from the workspace above to populate interactive telemetry, line-level findings, and AI remediation diffs.</p>
          </div>
          <div className="empty-pills-row">
            <span className="empty-pill"><Terminal size={13} /> AST Syntax Tree</span>
            <span className="empty-pill"><BarChart3 size={13} /> Smell Confidence</span>
            <span className="empty-pill"><Code2 size={13} /> Remediation Diff</span>
            <span className="empty-pill"><MessageSquareCode size={13} /> Copilot Follow-up</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-dashboard-wrapper">
      {/* Executive Header */}
      <div className="results-executive-header">
        <div className="header-meta-left">
          <div className="header-eyebrow">
            <span className="live-status-dot"></span>
            <span>Audit Report Completed</span>
            <span className="header-scope-tag">
              {projectName ? `Repo: ${projectName}` : `Language: ${language.toUpperCase()}`}
            </span>
          </div>
          <h2>{projectName ? `${projectName} Code Intelligence Report` : "Static & ML Code Quality Audit"}</h2>
        </div>

        <div className="header-actions-right">
          <button
            type="button"
            className="btn-export-pdf"
            onClick={exportReport}
            disabled={pdfGenerating}
          >
            {pdfGenerating ? (
              <div className="spinner-compact"></div>
            ) : (
              <Download size={14} />
            )}
            <span>Export Official PDF</span>
          </button>
        </div>
      </div>

      {/* Hero Metric Cards Grid */}
      <div className="results-metrics-grid">
        {/* Health Score */}
        <div className={`metric-card health-metric ${healthBadge.color}`}>
          <div className="metric-header">
            <span className="metric-title">Health Score</span>
            <span className={`grade-badge ${healthBadge.color}`}>{healthBadge.grade}</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">{healthScore !== null ? healthScore : "--"}</span>
            <span className="metric-denominator">/ 100</span>
          </div>
          <span className="metric-subtext">{healthBadge.label}</span>
        </div>

        {/* Primary Smell Prediction */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">ML Smell Classifier</span>
            <span className="metric-pill">RoBERTa</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-smell-name">{prediction.smell_type || "No Smell Detected"}</span>
          </div>
          <div className="metric-confidence-bar">
            <div 
              className="metric-confidence-fill" 
              style={{ width: `${Math.min(100, (prediction.confidence || 0) * 100)}%` }}
            ></div>
          </div>
          <span className="metric-subtext">
            Confidence: <strong>{((prediction.confidence || 0) * 100).toFixed(1)}%</strong>
          </span>
        </div>

        {/* Total Findings Breakdown */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Severity Matrix</span>
            <span className="metric-pill">Issues</span>
          </div>
          <div className="severity-mini-bar">
            <div className="mini-badge critical" title="Critical Issues">
              <AlertOctagon size={12} />
              <span>{severityCounts.critical || 0}</span>
            </div>
            <div className="mini-badge warning" title="Warnings">
              <AlertTriangle size={12} />
              <span>{severityCounts.warning || 0}</span>
            </div>
            <div className="mini-badge suggestion" title="Suggestions">
              <Lightbulb size={12} />
              <span>{severityCounts.suggestion || 0}</span>
            </div>
          </div>
          <span className="metric-subtext">
            Total Anomaly Flags: <strong>{(findings.length || ast.length)}</strong>
          </span>
        </div>

        {/* Scope / AST Tokens */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Analysis Scope</span>
            <span className="metric-pill">AST Engine</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">{filesAnalyzed || 1}</span>
            <span className="metric-denominator">{filesAnalyzed ? "files" : "source module"}</span>
          </div>
          <span className="metric-subtext">
            AST Checkers: <strong>{ast.length} patterns verified</strong>
          </span>
        </div>
      </div>

      {/* Tabbed Explorer Navigation */}
      <div className="results-tab-bar">
        <button
          type="button"
          className={`tab-button ${activeTab === "findings" ? "active" : ""}`}
          onClick={() => setActiveTab("findings")}
        >
          <AlertTriangle size={15} />
          <span>Issues & Findings</span>
          <span className="tab-count">{findings.length || ast.length}</span>
        </button>

        {probabilityRows.length > 0 && (
          <button
            type="button"
            className={`tab-button ${activeTab === "probabilities" ? "active" : ""}`}
            onClick={() => setActiveTab("probabilities")}
          >
            <BarChart3 size={15} />
            <span>Smell Spectrum</span>
          </button>
        )}

        <button
          type="button"
          className={`tab-button ${activeTab === "code" ? "active" : ""}`}
          onClick={() => setActiveTab("code")}
        >
          <Code2 size={15} />
          <span>Remediated Code</span>
          {optimized && <span className="tab-pill-ready">Ready</span>}
        </button>

        <button
          type="button"
          className={`tab-button ${activeTab === "notes" ? "active" : ""}`}
          onClick={() => setActiveTab("notes")}
        >
          <FileText size={15} />
          <span>AI Architecture Review</span>
        </button>

        <button
          type="button"
          className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquareCode size={15} />
          <span>Copilot Discussion</span>
          {messages.length > 0 && <span className="tab-count">{messages.length}</span>}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="results-panel-content">
        {/* TAB 1: Findings Matrix */}
        {activeTab === "findings" && (
          <div className="tab-panel findings-panel">
            {/* Filter controls */}
            {findings.length > 0 && (
              <div className="findings-filter-row">
                <span className="filter-label">Filter Severity:</span>
                <button
                  type="button"
                  className={`filter-pill ${severityFilter === "all" ? "active" : ""}`}
                  onClick={() => setSeverityFilter("all")}
                >
                  All ({findings.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill critical ${severityFilter === "critical" ? "active" : ""}`}
                  onClick={() => setSeverityFilter("critical")}
                >
                  Critical ({severityCounts.critical || 0})
                </button>
                <button
                  type="button"
                  className={`filter-pill warning ${severityFilter === "warning" ? "active" : ""}`}
                  onClick={() => setSeverityFilter("warning")}
                >
                  Warnings ({severityCounts.warning || 0})
                </button>
                <button
                  type="button"
                  className={`filter-pill suggestion ${severityFilter === "suggestion" ? "active" : ""}`}
                  onClick={() => setSeverityFilter("suggestion")}
                >
                  Suggestions ({severityCounts.suggestion || 0})
                </button>
              </div>
            )}

            {filteredFindings.length > 0 ? (
              <div className="findings-list">
                {filteredFindings.map((f, index) => (
                  <div className={`finding-card ${f.severity || "warning"}`} key={f.id || index}>
                    <div className="finding-card-header">
                      <div className="finding-title-group">
                        <span className={`finding-severity-tag ${f.severity || "warning"}`}>
                          {f.severity || "issue"}
                        </span>
                        <h4 className="finding-title">{f.title}</h4>
                      </div>
                      <span className="finding-location">
                        {f.file || "source"}{f.line ? `:${f.line}` : ""}
                      </span>
                    </div>

                    <p className="finding-message">{f.message}</p>

                    {f.suggestion && (
                      <div className="finding-recommendation-box">
                        <div className="rec-icon">
                          <Lightbulb size={14} />
                        </div>
                        <div className="rec-content">
                          <span className="rec-label">Recommended Fix:</span>
                          <span className="rec-text">{f.suggestion}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : ast.length > 0 ? (
              <div className="ast-raw-list">
                {ast.map((item, idx) => (
                  <div className="ast-item-row" key={idx}>
                    <ChevronRight size={14} className="text-cyan" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-findings-state">
                <Check size={28} className="text-emerald" />
                <h4>No Code Smells or Anomaly Flags Detected</h4>
                <p>AST analysis and ML classification did not trigger any severity rules on this snippet.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ML Probability Spectrum */}
        {activeTab === "probabilities" && (
          <div className="tab-panel probabilities-panel">
            <div className="panel-intro-header">
              <h4>CodeSmell-RoBERTa Multi-Label Classification</h4>
              <p>Model output distribution across recognized code smell categories</p>
            </div>

            <div className="probability-spectrum-list">
              {probabilityRows.map((row) => {
                const percent = (row.value * 100).toFixed(1);
                const isDominant = row.label === prediction.smell_type;
                return (
                  <div className={`spectrum-row ${isDominant ? "dominant" : ""}`} key={row.label}>
                    <div className="spectrum-row-info">
                      <span className="spectrum-label">{row.label}</span>
                      <div className="spectrum-value-group">
                        {isDominant && <span className="dominant-tag">Dominant Smell</span>}
                        <span className="spectrum-percent">{percent}%</span>
                      </div>
                    </div>
                    <div className="spectrum-track">
                      <div 
                        className={`spectrum-fill ${isDominant ? "dominant-fill" : ""}`} 
                        style={{ width: `${Math.max(4, row.value * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Remediated Code */}
        {activeTab === "code" && (
          <div className="tab-panel code-panel">
            {optimized ? (
              <div className="code-viewer-card">
                <div className="code-viewer-toolbar">
                  <div className="viewer-toolbar-left">
                    <span className="code-lang-tag">{language.toUpperCase()}</span>
                    <span className="code-status-tag">Refactored Clean Architecture</span>
                  </div>
                  <button
                    type="button"
                    className="btn-copy-code"
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copiedCode ? "Copied to Clipboard!" : "Copy Code"}</span>
                  </button>
                </div>

                <div className="syntax-highlighter-wrapper">
                  <SyntaxHighlighter
                    language={language}
                    style={theme === "light" ? oneLight : vscDarkPlus}
                    showLineNumbers
                    wrapLongLines
                    customStyle={{
                      margin: 0,
                      padding: "18px 20px",
                      background: theme === "light" ? "#f8fafc" : "#090d16",
                      fontSize: "13px",
                      fontFamily: "'JetBrains Mono', Consolas, Monaco, monospace",
                      lineHeight: "20px",
                      borderRadius: "0 0 8px 8px",
                    }}
                  >
                    {optimized}
                  </SyntaxHighlighter>
                </div>
              </div>
            ) : (
              <div className="empty-findings-state">
                <Info size={28} className="text-cyan" />
                <h4>No Refactored Code Available</h4>
                <p>Run a full analysis with remediation enabled to generate optimized code.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI Review Notes */}
        {activeTab === "notes" && (
          <div className="tab-panel notes-panel">
            <div className="notes-markdown-box markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {insights || "No comprehensive review notes were returned for this execution."}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* TAB 5: Copilot Discussion */}
        {activeTab === "chat" && (
          <div className="tab-panel copilot-panel">
            <div className="copilot-thread-container">
              {messages.length === 0 ? (
                <div className="copilot-welcome-box">
                  <div className="copilot-avatar-glow">
                    <Bot size={24} />
                  </div>
                  <h4>Contextual Review Copilot</h4>
                  <p>Ask follow-up questions regarding the AST findings, model smell analysis, performance trade-offs, or unit testing.</p>

                  <div className="copilot-prompt-suggestions">
                    <button
                      type="button"
                      className="prompt-suggestion-pill"
                      onClick={() => sendMessage("Explain the architectural tradeoffs of this refactored code.")}
                    >
                      <span>Explain architectural tradeoffs</span>
                    </button>
                    <button
                      type="button"
                      className="prompt-suggestion-pill"
                      onClick={() => sendMessage("Generate comprehensive unit tests for this remediated code.")}
                    >
                      <span>Generate unit tests</span>
                    </button>
                    <button
                      type="button"
                      className="prompt-suggestion-pill"
                      onClick={() => sendMessage("How does this refactoring improve time & space complexity?")}
                    >
                      <span>Complexity improvements</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="copilot-messages-list">
                  {messages.map((msg, i) => (
                    <div className={`copilot-message-bubble ${msg.role}`} key={i}>
                      <div className="msg-header">
                        <span className="msg-role">{msg.role === "assistant" ? "RigelAI Copilot" : "You"}</span>
                      </div>
                      <div className="msg-content markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}
                  {loadingChat && (
                    <div className="copilot-message-bubble assistant">
                      <div className="msg-header">
                        <span className="msg-role">RigelAI Copilot</span>
                      </div>
                      <div className="copilot-thinking-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="copilot-input-row">
              <input
                type="text"
                className="copilot-input-field"
                placeholder="Ask Copilot about this code review session..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />
              <button
                type="button"
                className="btn-copilot-send"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loadingChat}
              >
                <Send size={15} />
                <span>Send</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
