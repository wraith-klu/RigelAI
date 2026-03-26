import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendFollowUp } from "../services/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import "./Results.css";

export default function Results({ data }) {
  if (!data) return null;

  const llm = data?.llm_analysis || {};

  const ast = llm.ast_findings || [];
  const insights = llm.llm_response || "";
  const prediction = llm.model_prediction || {};
  const optimized = llm.optimized_code || "";
  const sessionId = llm.session_id;
  const language = llm.language || "plaintext";

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await sendFollowUp(input, sessionId);

      const botText =
        res?.llm_analysis?.llm_response ||
        JSON.stringify(res, null, 2);

      const botMsg = { role: "bot", text: botText };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Server error." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="results-container">
      <div className="results-card">

        <div className="results-header">
          <h2>Analysis Results</h2>
          <p>Code quality insights and improvements.</p>
        </div>

        {/* AST FINDINGS */}
        <section className="result-section">
          <h3>AST Findings</h3>

          {ast.length ? (
            <ul className="ast-list">
              {ast.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="empty">No AST issues detected</p>
          )}
        </section>

        {/* LLM INSIGHTS */}
        <section className="result-section">
          <h3>LLM Insights</h3>

          <div className="insights-box markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {insights}
            </ReactMarkdown>
          </div>
        </section>

        {/* MODEL PREDICTION */}
        <section className="result-section">
          <h3>Model Prediction</h3>

          <div className="metrics-grid">
            <div className="metric-card">
              <span>Smell Type</span>
              <strong>{prediction.smell_type || "N/A"}</strong>
            </div>

            <div className="metric-card">
              <span>Confidence</span>
              <strong>
                {prediction.confidence
                  ? prediction.confidence.toFixed(2)
                  : "0.00"}
              </strong>
            </div>
          </div>

          {prediction.all_probs && (
            <pre className="prob-box">
              {JSON.stringify(prediction.all_probs, null, 2)}
            </pre>
          )}
        </section>

        {/* OPTIMIZED CODE */}
        <section className="result-section">
          <h3>Optimized / Refactored Code</h3>

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
            <p className="empty">No optimized code generated</p>
          )}
        </section>

        {/* FOLLOW-UP CHAT */}
        <section className="result-section">
          <h3>Follow-Up Discussion</h3>

          <div className="chat-container">

            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.role}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                </div>
              ))}

              {loading && (
                <div className="chat-message bot">Thinking...</div>
              )}
            </div>

            <div className="chat-input">
              <input
                type="text"
                placeholder="Ask anything about the analyzed code..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
              />

              <button onClick={sendMessage}>Send</button>
            </div>

          </div>
        </section>

      </div>
    </div>
  );
}