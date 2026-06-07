import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { downloadPDF, sendFollowUp } from "../services/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Results.css";

export default function Results({ data }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const llm = data?.llm_analysis || {};
  const ast = llm.ast_findings || [];
  const insights = llm.llm_response || "";
  const prediction = llm.model_prediction || {};
  const optimized = llm.optimized_code || "";
  const sessionId = llm.session_id;
  const language = llm.language || "plaintext";
  const report = llm.quality_report || {};
  const findings = report.findings || [];
  const fixes = report.fix_suggestions || [];
  const severityCounts = report.severity_counts || {};
  const healthScore = typeof report.health_score === "number" ? report.health_score : null;
  const projectName = llm.project_name || "";
  const filesAnalyzed = llm.files_analyzed || null;
  const branch = llm.branch || "";
  const hasData = Boolean(data);

  const probabilityRows = useMemo(() => {
    if (!prediction.all_probs) return [];
    return Object.entries(prediction.all_probs)
      .map(([label, value]) => ({
        label,
        value: typeof value === "number" ? value : Number(value) || 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [prediction.all_probs]);

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [sessionId]);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || loading) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendFollowUp(input, sessionId);
      const botText =
        res?.llm_analysis?.llm_response || JSON.stringify(res, null, 2);

      setMessages((prev) => [...prev, { role: "bot", text: botText }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "The follow-up request failed. Confirm the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (event) => {
    if (event.key === "Enter") sendMessage();
  };

  const exportReport = () => {
    const lines = [
      "RigelAI Code Quality Report",
      projectName ? `Project: ${projectName}` : "Project: Single source analysis",
      llm.repository_url ? `Repository: ${llm.repository_url}` : "",
      branch ? `Branch: ${branch}` : "",
      filesAnalyzed ? `Files analyzed: ${filesAnalyzed}` : "",
      healthScore !== null ? `Health score: ${healthScore}/100` : "",
      "",
      "Severity Summary",
      `Critical: ${severityCounts.critical || 0}`,
      `Warnings: ${severityCounts.warning || 0}`,
      `Suggestions: ${severityCounts.suggestion || 0}`,
      "",
      "Findings",
      ...(findings.length
        ? findings.map(
            (finding) =>
              `[${finding.severity}] ${finding.file || "source"}${
                finding.line ? `:${finding.line}` : ""
              } - ${finding.title}: ${finding.message}`
          )
        : ["No structured findings were reported."]),
      "",
      "Fix Suggestions",
      ...(fixes.length
        ? fixes.map((fix) => `${fix.title}: ${fix.recommendation}`)
        : ["No fix suggestions were generated."]),
      "",
      "AI Review Notes",
      insights || "No review notes were returned.",
      optimized ? `\nOptimized Code\n${optimized}` : "",
    ].filter(Boolean);

    downloadPDF(lines.join("\n"));
  };

  if (!hasData) {
    return (
      <div className="results-container">
        <div className="results-empty-card">
          <span className="panel-label">Result preview</span>
          <h3>Your analysis report will appear here</h3>
          <p>
            Run an editor or file analysis to generate AST findings, model
            confidence, LLM review notes, optimized code, and follow-up chat.
          </p>
          <div className="empty-report-grid">
            <span>AST findings</span>
            <span>Smell prediction</span>
            <span>Refactor plan</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      <div className="results-card">
        <div className="results-header">
          <div>
            <span className="panel-label">Analysis report</span>
            <h2>{projectName ? `${projectName} results` : "Code quality results"}</h2>
          </div>
          <div className="result-header-actions">
            <button onClick={exportReport} type="button">
              Export PDF
            </button>
            <div className="report-status">Completed</div>
          </div>
        </div>

        <div className="summary-grid">
          <div className="summary-card health-card">
            <span>Health score</span>
            <strong>{healthScore !== null ? healthScore : "--"}</strong>
          </div>
          <div className="summary-card">
            <span>Smell type</span>
            <strong>{prediction.smell_type || "Not detected"}</strong>
          </div>
          <div className="summary-card">
            <span>Confidence</span>
            <strong>
              {typeof prediction.confidence === "number"
                ? prediction.confidence.toFixed(2)
                : "0.00"}
            </strong>
          </div>
          <div className="summary-card">
            <span>{filesAnalyzed ? "Files analyzed" : "AST findings"}</span>
            <strong>{filesAnalyzed || ast.length}</strong>
          </div>
        </div>

        <section className="result-section">
          <h3>Severity dashboard</h3>
          <div className="severity-grid">
            <div className="severity-card critical">
              <span>Critical</span>
              <strong>{severityCounts.critical || 0}</strong>
            </div>
            <div className="severity-card warning">
              <span>Warnings</span>
              <strong>{severityCounts.warning || 0}</strong>
            </div>
            <div className="severity-card suggestion">
              <span>Suggestions</span>
              <strong>{severityCounts.suggestion || 0}</strong>
            </div>
            <div className="severity-card info">
              <span>Info</span>
              <strong>{severityCounts.info || 0}</strong>
            </div>
          </div>
        </section>

        <section className="result-section">
          <h3>Line-level findings</h3>
          {findings.length ? (
            <ul className="finding-list">
              {findings.map((finding, index) => (
                <li className={`finding-item ${finding.severity}`} key={finding.id || index}>
                  <div>
                    <span>{finding.severity}</span>
                    <strong>{finding.title}</strong>
                  </div>
                  <p>{finding.message}</p>
                  <small>
                    {finding.file || "source"}
                    {finding.line ? `:${finding.line}` : ""}
                  </small>
                  <em>{finding.suggestion}</em>
                </li>
              ))}
            </ul>
          ) : ast.length ? (
            <ul className="ast-list">
              {ast.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="empty">No structured issues detected.</p>
          )}
        </section>

        <section className="result-section">
          <h3>AI review notes</h3>
          <div className="insights-box markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {insights || "No review notes were returned for this run."}
            </ReactMarkdown>
          </div>
        </section>

        {probabilityRows.length > 0 && (
          <section className="result-section">
            <h3>Model probability breakdown</h3>
            <div className="probability-list">
              {probabilityRows.map((row) => (
                <div className="probability-row" key={row.label}>
                  <div>
                    <span>{row.label}</span>
                    <strong>{(row.value * 100).toFixed(1)}%</strong>
                  </div>
                  <progress value={row.value} max="1" />
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="result-section">
          <h3>Auto fix suggestions</h3>
          {fixes.length ? (
            <div className="fix-list">
              {fixes.map((fix, index) => (
                <article className={`fix-card ${fix.severity}`} key={`${fix.title}-${index}`}>
                  <div>
                    <span>{fix.severity}</span>
                    <strong>{fix.title}</strong>
                  </div>
                  <p>{fix.recommendation}</p>
                  <small>
                    {fix.file || "source"}
                    {fix.line ? `:${fix.line}` : ""}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty">No fix suggestions generated.</p>
          )}
        </section>

        <section className="result-section">
          <h3>Optimized code</h3>
          {optimized ? (
            <div className="code-block">
              <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                showLineNumbers
                wrapLongLines
              >
                {optimized}
              </SyntaxHighlighter>
            </div>
          ) : (
            <p className="empty">No optimized code generated.</p>
          )}
        </section>

        <section className="result-section">
          <h3>Follow-up discussion</h3>
          <div className="results-chat">
            <div className="results-chat-messages">
              {messages.length === 0 && (
                <div className="chat-placeholder">
                  Ask for a cleaner refactor, edge cases, or a short
                  explanation you can mention in your project demo.
                </div>
              )}

              {messages.map((message, index) => (
                <div key={index} className={`result-message ${message.role}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.text}
                  </ReactMarkdown>
                </div>
              ))}

              {loading && <div className="result-message bot">Thinking...</div>}
            </div>

            <div className="results-chat-input">
              <input
                type="text"
                placeholder="Ask about this analysis..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKey}
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading} type="button">
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
