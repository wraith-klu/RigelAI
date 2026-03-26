import { useState } from "react";
import Chatbot from "../components/Chatbot";
import CodeInputPanel from "../components/CodeInputPanel";
import Results from "../components/Results";
import "./Home.css";

export default function Home() {
  const [mode, setMode] = useState("analyze");
  const [result, setResult] = useState(null);

  const toggleMode = () => {
    setMode(mode === "chat" ? "analyze" : "chat");
  };

  const handleAnalyze = (data) => {
    setResult(data);

    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: "smooth",
      });
    }, 120);
  };

  return (
    <div className="home-layout">

      {/* MOBILE MODE TOGGLE */}
      <button
        className="floating-mode-btn"
        onClick={toggleMode}
        aria-label="Toggle mode"
      >
        {mode === "chat" ? "← Analyze" : "💬 Discuss"}
      </button>

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="sidebar-header">
          <img
            src="https://cdn-icons-png.flaticon.com/512/3296/3296716.png"
            alt="avatar"
            className="avatar"
          />

          <h3>Project Overview</h3>
        </div>

        <ul className="feature-list">
          <li>🧩 Code smell detection</li>
          <li>🧠 AI refactoring advice</li>
          <li>🔍 AST + ML hybrid analysis</li>
          <li>💬 Multi-turn follow-up chat</li>
        </ul>

        <div className="sidebar-footer">

          <button
            className="mode-btn"
            onClick={toggleMode}
          >
            {mode === "chat"
              ? "← Switch to Analyze"
              : "💬 Switch to Discussion"}
          </button>

          <p className="dev">
            Built by <strong>Wraith</strong>
          </p>

        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        <header className="hero-header">

          <h1 className="hero-title">
            <span className="title-blue">🤖 Rigel</span>
            <span className="title-green">AI</span>
          </h1>

          <p className="hero-tagline">
            Cosmic Intelligence for Code Quality
          </p>

          <p className="hero-description">
            RigelAI is an intelligent code analysis agent that combines 
            <strong> Abstract Syntax Tree (AST) analysis</strong>, 
            <strong> Machine Learning</strong>, and 
            <strong> Large Language Models (LLMs)</strong> to detect code smells.
            {/* identify performance issues, and provide automated refactoring suggestions. */}
            <br /><br />
            {/* Designed for developers, RigelAI acts like a senior engineer reviewing your code —
            helping you understand complexity, detect hidden bugs, and improve maintainability
            with AI-powered insights. */}
          </p>

          <div className="hero-features">
            <span>🔍 Static Code Analysis</span>
            <span>🧠 AI Refactoring Suggestions</span>
            <span>⚡ Performance Insights</span>
            <span>💬 Follow-up Code Discussion</span>
            <span></span>
          </div>

        </header>

        {mode === "chat" ? (
          <Chatbot />
        ) : (
          <div className="analysis-section">

            <div className="analysis-card">
              <h2>📝 Paste Code for Analysis</h2>
              <CodeInputPanel onAnalyze={handleAnalyze} />
            </div>

            <Results data={result} />

          </div>
        )}

      </main>

    </div>
  );
}
