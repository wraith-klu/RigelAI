import { useState } from "react";
import Chatbot from "../components/Chatbot";
import CodeInputPanel from "../components/CodeInputPanel";
import Results from "../components/Results";
import "./Home.css";

export default function Home() {
  const [mode, setMode] = useState("analyze");
  const [result, setResult] = useState(null);

  const toggleMode = () => {
    setMode((current) => (current === "chat" ? "analyze" : "chat"));
  };

  const handleAnalyze = (data) => {
    setResult(data);

    setTimeout(() => {
      document
        .getElementById("results")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="RigelAI home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>RigelAI</strong>
            <small>Code Quality Studio</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#workspace">Workspace</a>
          <a href="#vscode-extension">Extension</a>
          <a href="#capabilities">Capabilities</a>
          <a href="#results">Results</a>
        </nav>

        <div className="mode-switch" role="group" aria-label="Mode switcher">
          <button
            className={mode === "analyze" ? "active" : ""}
            onClick={() => setMode("analyze")}
            type="button"
          >
            Analyze
          </button>
          <button
            className={mode === "chat" ? "active" : ""}
            onClick={() => setMode("chat")}
            type="button"
          >
            Discuss
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow">AI code review workspace</div>
            <h1>Find code smells faster, then turn feedback into better code.</h1>
            <p>
              RigelAI combines static analysis, model prediction, and
              conversational review so developers can spot risk, understand
              tradeoffs, and ship cleaner code from one focused workspace.
            </p>

            <div className="hero-actions">
              <a className="primary-action" href="#workspace">
                Start analysis
              </a>
              <button className="secondary-action" onClick={toggleMode} type="button">
                {mode === "chat" ? "Open analyzer" : "Open discussion"}
              </button>
              <a className="secondary-action" href="#vscode-extension">
                VS Code extension
              </a>
            </div>
          </div>

          <div className="agent-showcase" aria-label="RigelAI agent preview">
            <img
              className="agent-hero-image"
              src="/agent-hero.svg"
              alt="RigelAI agent reviewing code quality signals"
            />
            <div className="agent-chip agent-chip-top">
              <span></span>
              Agent online
            </div>
            <div className="agent-chip agent-chip-bottom">
              8 refactor ideas ready
            </div>
            <div className="hero-panel" aria-label="Product health summary">
              <div className="panel-toolbar">
                <span className="status-pill">Live scan</span>
                <span className="toolbar-dot"></span>
              </div>
              <div className="score-card">
                <span>Code health score</span>
                <strong>91</strong>
                <small>
                  12 signals grouped across maintainability, bugs, style, and risk.
                </small>
              </div>
              <div className="signal-list">
                <div>
                  <span className="signal critical"></span>
                  High-risk findings
                  <strong>3</strong>
                </div>
                <div>
                  <span className="signal warning"></span>
                  Complexity warnings
                  <strong>5</strong>
                </div>
                <div>
                  <span className="signal success"></span>
                  Refactor suggestions
                  <strong>8</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="vscode-extension" className="extension-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">IDE extension</span>
              <h2>Review code without leaving VS Code</h2>
            </div>
            <p>
              Install RigelAI in VS Code, connect it to the hosted backend, and run
              analysis from the command palette or editor context menu.
            </p>
          </div>

          <div className="extension-panel">
            <div className="extension-copy">
              <h3>RigelAI Code Review</h3>
              <p>
                Analyze the current file or selected code, then view health score,
                severity findings, and refactor suggestions in a VS Code panel.
              </p>
            </div>
            <div className="extension-actions">
              <a
                className="primary-action"
                href="/extensions/rigelai-code-review-0.1.0.vsix"
                download
              >
                Download VSIX
              </a>
              <a
                className="secondary-action"
                href="vscode://wraith-klu.rigelai-code-review/connect?apiUrl=https%3A%2F%2Frigelai.onrender.com"
              >
                Connect VS Code
              </a>
            </div>
          </div>
        </section>

        <section className="metrics-strip" aria-label="Platform metrics">
          <div>
            <strong>AST + ML</strong>
            <span>hybrid review engine</span>
          </div>
          <div>
            <strong>10+</strong>
            <span>language options</span>
          </div>
          <div>
            <strong>2 MB</strong>
            <span>quick file review limit</span>
          </div>
          <div>
            <strong>Chat</strong>
            <span>follow-up assistant</span>
          </div>
        </section>

        <section id="workspace" className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Workspace</span>
              <h2>{mode === "chat" ? "Discuss code decisions" : "Analyze code quality"}</h2>
            </div>
            <p>
              Paste source code, upload a file, or continue the review with
              targeted follow-up questions.
            </p>
          </div>

          {mode === "chat" ? (
            <Chatbot />
          ) : (
            <div className="analysis-layout">
              <div className="analysis-pane">
                <CodeInputPanel onAnalyze={handleAnalyze} />
              </div>

              <aside id="capabilities" className="capability-pane">
                <h3>Built for practical review work</h3>
                <ul>
                  <li>
                    <span>01</span>
                    Detect code smells, bugs, and maintainability issues.
                  </li>
                  <li>
                    <span>02</span>
                    Compare AST findings with AI-generated remediation advice.
                  </li>
                  <li>
                    <span>03</span>
                    Keep the conversation going after each RigelAI scan.
                  </li>
                </ul>
              </aside>
            </div>
          )}
        </section>

        {mode !== "chat" && (
          <section id="results" className="results-section">
            <Results data={result} />
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>RigelAI</span>
        <span>AI-assisted code quality reviews.</span>
      </footer>
    </div>
  );
}
