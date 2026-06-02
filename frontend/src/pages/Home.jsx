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
            <span className="brand-bot">🤖</span>
            <span className="orbit orbit-one"></span>
            <span className="orbit orbit-two"></span>
            <span className="logo-star"></span>
          </span>
          <span>
            <strong>RigelAI</strong>
            <small>Cosmic Code Quality</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#workspace">Workspace</a>
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
            <div className="eyebrow">Cosmic Intelligence for Code Quality</div>
            <h1>Navigate code smells with an AI co-pilot built for clarity.</h1>
            <p>
              RigelAI combines static analysis, model prediction, and
              conversational review to help developers improve quality,
              maintainability, and refactoring decisions in one focused
              workspace.
            </p>

            <div className="hero-actions">
              <a className="primary-action" href="#workspace">
                Start analysis
              </a>
              <button className="secondary-action" onClick={toggleMode} type="button">
                {mode === "chat" ? "Open analyzer" : "Open discussion"}
              </button>
            </div>
          </div>

          <div className="hero-panel" aria-label="Product health summary">
            <div className="panel-toolbar">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="score-card">
              <span>Quality orbit score</span>
              <strong>91</strong>
              <small>12 signals mapped across 4 review constellations</small>
            </div>
            <div className="signal-list">
              <div>
                <span className="signal critical"></span>
                Duplicate logic trail
                <strong>3</strong>
              </div>
              <div>
                <span className="signal warning"></span>
                Complexity asteroids
                <strong>5</strong>
              </div>
              <div>
                <span className="signal success"></span>
                Refactor routes
                <strong>8</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="metrics-strip" aria-label="Platform metrics">
          <div>
            <strong>AST + ML</strong>
            <span>hybrid intelligence engine</span>
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
            <span>cosmic review assistant</span>
          </div>
        </section>

        <section id="workspace" className="workspace-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Mission control</span>
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
                <h3>Built for practical code missions</h3>
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
        <span>🤖 RigelAI</span>
        <span>Cosmic Intelligence for Code Quality.</span>
      </footer>
    </div>
  );
}
