import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import CodeInputPanel from "../components/CodeInputPanel";
import Results from "../components/Results";
import Chatbot from "../components/Chatbot";
import IdeIntegrationModal from "../components/IdeIntegrationModal";
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
  ArrowRight,
  Monitor,
  HelpCircle,
  MessageSquareCode
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
  const [isIdeModalOpen, setIsIdeModalOpen] = useState(false);
  const [initialCopilotQuery, setInitialCopilotQuery] = useState(null);

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
    navigator.clipboard.writeText("code --install-extension vscode-extension/rigelai-code-review-0.3.0.vsix");
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const handleOpenCopilotForIde = (query) => {
    setInitialCopilotQuery(query);
    setMode("chat");
    setTimeout(() => {
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  return (
    <div className="app-layout">
      {/* Universal Top Navigation */}
      <Navbar 
        mode={mode} 
        setMode={setMode} 
        theme={theme} 
        toggleTheme={toggleTheme}
        onOpenIdeModal={() => setIsIdeModalOpen(true)}
      />

      <main id="top" className={`main-content ${mode === "chat" ? "copilot-fullscreen-view" : ""}`}>
        {/* Enterprise Studio Hero Section — Only shown in Analyzer mode */}
        {mode === "analyze" && (
          <section className="studio-hero-section">
            <div className="hero-badge-row">
              <span className="hero-status-pill">
                <span className="pulse-emerald"></span>
                <span>Production Code Intelligence Engine</span>
              </span>
              <span className="hero-tech-pill">AST v2.4 • PyTorch ML • Multi-Language</span>
            </div>

            <h1 className="hero-main-title">
              Enterprise Static AST &amp; <span className="text-gradient">ML Code Smell</span> Detection
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

              <div className="ribbon-item ribbon-clickable" onClick={() => setIsIdeModalOpen(true)} role="button" tabIndex={0}>
                <div className="ribbon-icon">
                  <Code2 size={15} />
                </div>
                <div className="ribbon-meta">
                  <strong>IDE Integration Hub</strong>
                  <span>VS Code, Cursor, Antigravity</span>
                </div>
                <span className="ribbon-arrow">→</span>
              </div>
            </div>
          </section>
        )}

        {/* Studio Workspace Section */}
        <section id="workspace" className={`studio-workspace-section ${mode === "chat" ? "chat-mode" : ""}`}>
          {mode === "analyze" && (
            <div className="section-title-bar">
              <div>
                <div className="section-eyebrow">
                  <Layers size={13} className="text-cyan" />
                  <span>Active Workspace</span>
                </div>
                <h2>Code Quality &amp; Smell Analyzer</h2>
              </div>

              <div className="section-controls">
                <div className="mode-toggle-group">
                  <button
                    type="button"
                    className="mode-toggle-btn active"
                    onClick={() => setMode("analyze")}
                  >
                    <Terminal size={14} />
                    <span>Studio Analyzer</span>
                  </button>
                  <button
                    type="button"
                    className="mode-toggle-btn"
                    onClick={() => setMode("chat")}
                  >
                    <Sparkles size={14} />
                    <span>Copilot Discussion</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Body */}
          {mode === "chat" ? (
            <Chatbot initialInput={initialCopilotQuery} />
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

                {/* IDE Integration Promo Box */}
                <div className="sidebar-card extension-mini-promo">
                  <div className="sidebar-card-header">
                    <Code2 size={16} className="text-emerald" />
                    <h4>Universal IDE Integration</h4>
                  </div>
                  <p className="mini-promo-text">
                    Integrate RigelAI with <strong>VS Code</strong>, <strong>Cursor</strong>, <strong>Antigravity</strong>, and <strong>Windsurf</strong>.
                  </p>
                  <button 
                    type="button" 
                    className="btn-mini-extension"
                    onClick={() => setIsIdeModalOpen(true)}
                  >
                    <span>Open IDE Setup Hub</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </aside>
            </div>
          )}
        </section>

        {/* Results Dashboard Section — Only shown in Analyzer mode */}
        {mode === "analyze" && (
          <section id="results" className="studio-results-section">
            <Results data={result} theme={theme} />
          </section>
        )}

        {/* IDE Integration Showcase Section — Only shown in Analyzer mode */}
        {mode === "analyze" && (
          <section id="vscode-extension" className="extension-showcase-section">
            <div className="extension-container-card">
              <div className="extension-content-col">
                <div className="extension-badge">
                  <Download size={13} />
                  <span>Multi-IDE Support Hub</span>
                </div>
                <h3>RigelAI Code Review for Modern IDEs</h3>
                <p>
                  Get real-time code smell diagnostics and AI-powered refactor diffs inside 
                  <strong> VS Code</strong>, <strong>Cursor AI</strong>, <strong>Antigravity IDE</strong>, and <strong>Windsurf</strong>.
                </p>

                <div className="cli-snippet-box">
                  <div className="cli-label-row">
                    <span>Standard CLI Command (Run inside workspace):</span>
                  </div>
                  <div className="cli-command-row">
                    <code>code --install-extension rigelai-code-review-0.3.0.vsix</code>
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
                  <button
                    type="button"
                    className="btn-open-ide-hub"
                    onClick={() => setIsIdeModalOpen(true)}
                  >
                    <Code2 size={16} />
                    <span>Open Multi-IDE Installation Guide</span>
                  </button>

                  <a
                    href="/extensions/rigelai-code-review-0.3.0.vsix"
                    download
                    className="btn-download-vsix"
                  >
                    <Download size={16} />
                    <span>Download .VSIX (v0.3.0)</span>
                  </a>
                </div>

                {/* Direct Copilot Help Link */}
                <div className="ide-copilot-link-row">
                  <HelpCircle size={14} className="text-violet" />
                  <span>Got an install or path error?</span>
                  <button
                    type="button"
                    className="btn-link-copilot"
                    onClick={() => handleOpenCopilotForIde("I am trying to install the RigelAI IDE extension and need help. Could you assist me?")}
                  >
                    Ask Copilot for instant help →
                  </button>
                </div>
              </div>

              <div className="extension-features-col">
                <div className="feature-item-box">
                  <CheckCircle2 size={16} className="text-emerald" />
                  <div>
                    <strong>Universal Compatibility</strong>
                    <span>Seamlessly works across all VS Code core engines (Cursor, Antigravity, VSCodium, Windsurf).</span>
                  </div>
                </div>
                <div className="feature-item-box">
                  <CheckCircle2 size={16} className="text-emerald" />
                  <div>
                    <strong>Both CLI &amp; GUI VSIX Workflows</strong>
                    <span>Install via command line or standard Extension GUI manager without marketplace limits.</span>
                  </div>
                </div>
                <div className="feature-item-box">
                  <CheckCircle2 size={16} className="text-emerald" />
                  <div>
                    <strong>Contextual Diagnostics &amp; Lightbulb Fixes</strong>
                    <span>Hover over flagged smells, view model confidence ratings, and apply AI refactors in 1 click.</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Global IDE Integration Modal */}
      <IdeIntegrationModal
        isOpen={isIdeModalOpen}
        onClose={() => setIsIdeModalOpen(false)}
        onOpenCopilot={handleOpenCopilotForIde}
      />

      {/* Enterprise Platform Footer — Shown only in Analyzer mode */}
      {mode === "analyze" && (
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
      )}
    </div>
  );
}
