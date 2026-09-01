import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import CodeInputPanel from "../components/CodeInputPanel";
import Results from "../components/Results";
import Chatbot from "../components/Chatbot";
import { 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  ExternalLink, 
  Layers, 
  Code2, 
  CheckCircle2, 
  Zap,
  GitBranch,
  ArrowRight
} from "lucide-react";
import "./Home.css";

const getInitialTheme = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("rigelai_theme");
    if (saved === "light" || saved === "dark") return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      return "light";
    }
  }
  return "dark";
};

export default function Home() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [mode, setMode] = useState("analyze"); // "analyze" | "chat"
  const [result, setResult] = useState(null);
  const [copiedCli, setCopiedCli] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.className = theme;
    localStorage.setItem("rigelai_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleAnalyze = (data) => {
    setResult(data);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const copyCliCommand = () => {
    navigator.clipboard.writeText("code --install-extension rigelai-code-review-0.2.1.vsix");
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="app-layout">
      {/* Universal Top Navigation */}
      <Navbar 
        mode={mode} 
        setMode={setMode} 
        theme={theme} 
        toggleTheme={toggleTheme} 
      />

      <main id="top" className="main-content">
        {/* Enterprise Studio Hero Section */}
        <section className="studio-hero-section">
          <div className="hero-badge-row">
            <span className="hero-status-pill">
              <span className="pulse-emerald"></span>
              <span>Production Code Intelligence Engine</span>
            </span>
            <span className="hero-tech-pill">AST v2.4 • PyTorch ML • Multi-Language</span>
          </div>

          <h1 className="hero-main-title">
            Enterprise Static AST & <span className="text-gradient">ML Code Smell</span> Detection
          </h1>

          <p className="hero-description">
            RigelAI combines deterministic AST syntax trees, deep machine learning smell classification, 
            and contextual LLM remediation to detect anti-patterns and optimize your codebase in seconds.
          </p>

          <div className="hero-metrics-ribbon">
            <div className="ribbon-item">
              <div className="ribbon-icon">
                <Terminal size={15} />
              </div>
              <div className="ribbon-meta">
                <strong>Multi-Language AST</strong>
                <span>Python, JS, TS, Java, C++, Go</span>
              </div>
            </div>

            <div className="ribbon-item">
              <div className="ribbon-icon">
                <Cpu size={15} />
              </div>
              <div className="ribbon-meta">
                <strong>RoBERTa ML Model</strong>
                <span>Smell pattern probability vectors</span>
              </div>
            </div>

            <div className="ribbon-item">
              <div className="ribbon-icon">
                <Sparkles size={15} />
              </div>
              <div className="ribbon-meta">
                <strong>AI Refactor Pipeline</strong>
                <span>Automatic clean-code remediation</span>
              </div>
            </div>

            <div className="ribbon-item">
              <div className="ribbon-icon">
                <Zap size={15} />
              </div>
              <div className="ribbon-meta">
                <strong>VS Code Extension</strong>
                <span>Command palette & context scan</span>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Workspace Section */}
        <section id="workspace" className="studio-workspace-section">
          <div className="section-title-bar">
            <div>
              <div className="section-eyebrow">
                <Layers size={13} className="text-cyan" />
                <span>Active Workspace</span>
              </div>
              <h2>{mode === "chat" ? "AI Architectural Copilot" : "Code Quality & Smell Analyzer"}</h2>
            </div>

            <div className="section-controls">
              <div className="mode-toggle-group">
                <button
                  type="button"
                  className={`mode-toggle-btn ${mode === "analyze" ? "active" : ""}`}
                  onClick={() => setMode("analyze")}
                >
                  <Terminal size={14} />
                  <span>Studio Analyzer</span>
                </button>
                <button
                  type="button"
                  className={`mode-toggle-btn ${mode === "chat" ? "active" : ""}`}
                  onClick={() => setMode("chat")}
                >
                  <Sparkles size={14} />
                  <span>Copilot Discussion</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workspace Body */}
          {mode === "chat" ? (
            <Chatbot />
          ) : (
            <div className="workspace-grid-layout">
              <div className="workspace-main-column">
                <CodeInputPanel onAnalyze={handleAnalyze} theme={theme} />
              </div>

              {/* Sidebar Capabilities */}
              <aside className="workspace-sidebar">
                <div className="sidebar-card">
                  <div className="sidebar-card-header">
                    <ShieldCheck size={16} className="text-cyan" />
                    <h4>Analysis Engine Specs</h4>
                  </div>
                  <ul className="specs-list">
                    <li>
                      <div className="spec-bullet">01</div>
                      <div className="spec-text">
                        <strong>Deterministic AST Engine</strong>
                        <span>Tokenizes syntax branches to detect long methods, complex conditionals, and dead code.</span>
                      </div>
                    </li>
                    <li>
                      <div className="spec-bullet">02</div>
                      <div className="spec-text">
                        <strong>Machine Learning Classifier</strong>
                        <span>Evaluates CodeSmell embeddings to predict maintainability smells with exact confidence %.</span>
                      </div>
                    </li>
                    <li>
                      <div className="spec-bullet">03</div>
                      <div className="spec-text">
                        <strong>Automated AI Remediation</strong>
                        <span>Generates refactored clean code, architectural tradeoffs, and unit tests.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="sidebar-card extension-mini-promo">
                  <div className="sidebar-card-header">
                    <Download size={16} className="text-emerald" />
                    <h4>VS Code Integration</h4>
                  </div>
                  <p className="mini-promo-text">
                    Analyze code directly inside your editor with real-time diagnostics.
                  </p>
                  <a href="#vscode-extension" className="btn-mini-extension">
                    <span>View Extension Details</span>
                    <ArrowRight size={13} />
                  </a>
                </div>
              </aside>
            </div>
          )}
        </section>

        {/* Results Dashboard Section */}
        {mode !== "chat" && (
          <section id="results" className="studio-results-section">
            <Results data={result} theme={theme} />
          </section>
        )}

        {/* VS Code Extension & IDE Integration Section */}
        <section id="vscode-extension" className="extension-showcase-section">
          <div className="extension-container-card">
            <div className="extension-content-col">
              <div className="extension-badge">
                <Download size={13} />
                <span>Official IDE Integration</span>
              </div>
              <h3>RigelAI Code Review for Visual Studio Code</h3>
              <p>
                Get instant code smell diagnostics and AI-powered refactor suggestions directly within VS Code. 
                Execute reviews from the command palette or context menu without switching windows.
              </p>

              <div className="cli-snippet-box">
                <div className="cli-label-row">
                  <span>Install via Terminal:</span>
                </div>
                <div className="cli-command-row">
                  <code>code --install-extension rigelai-code-review-0.2.1.vsix</code>
                  <button
                    type="button"
                    className="btn-copy-cli"
                    onClick={copyCliCommand}
                    title="Copy install command"
                  >
                    {copiedCli ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                    <span>{copiedCli ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="extension-download-row">
                <a
                  href="/extensions/rigelai-code-review-0.2.1.vsix"
                  download
                  className="btn-download-vsix"
                >
                  <Download size={16} />
                  <span>Download VSIX Package (v0.2.1)</span>
                </a>
                <span className="vsix-size-tag">7.4 KB • Signed Production Bundle</span>
              </div>
            </div>

            <div className="extension-features-col">
              <div className="feature-item-box">
                <CheckCircle2 size={16} className="text-emerald" />
                <div>
                  <strong>Right-Click File / Selection Scan</strong>
                  <span>Select any snippet in your editor and trigger "RigelAI: Analyze Code Quality".</span>
                </div>
              </div>
              <div className="feature-item-box">
                <CheckCircle2 size={16} className="text-emerald" />
                <div>
                  <strong>Inline Health Score & Smell Diagnostics</strong>
                  <span>Inspect severity ratings and model confidence directly in VS Code's output channel.</span>
                </div>
              </div>
              <div className="feature-item-box">
                <CheckCircle2 size={16} className="text-emerald" />
                <div>
                  <strong>One-Click Corrected Code Application</strong>
                  <span>Preview AI refactor diffs side-by-side and apply patches cleanly.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enterprise Platform Footer */}
      <footer className="platform-footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="footer-logo">
              <ShieldCheck size={18} className="text-cyan" />
              <strong>RigelAI</strong>
              <span className="footer-version">v2.0</span>
            </div>
            <p className="footer-tagline">
              Enterprise AST parsing, ML code smell classification, and AI refactoring intelligence.
            </p>
          </div>

          <div className="footer-meta-col">
            <div className="engine-status-row">
              <span className="pulse-emerald"></span>
              <span>FastAPI Backend Services: Connected</span>
            </div>
            <span className="footer-copyright">
              © {new Date().getFullYear()} RigelAI Studio. Designed for high-assurance software engineering.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
