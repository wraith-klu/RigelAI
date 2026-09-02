import { useState } from "react";
import { 
  ShieldCheck, 
  Terminal, 
  MessageSquareCode, 
  Download, 
  GitBranch, 
  Activity,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import "./Navbar.css";

export default function Navbar({ mode = "analyze", setMode, theme = "dark", toggleTheme, onOpenIdeModal }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleModeChange = (newMode) => {
    setMode?.(newMode);
    setMobileOpen(false);
  };

  const handleOpenIdeHub = () => {
    setMobileOpen(false);
    if (onOpenIdeModal) {
      onOpenIdeModal();
    }
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand */}
        <a href="#top" className="navbar-brand" aria-label="RigelAI Platform">
          <div className="brand-icon-wrapper">
            <ShieldCheck className="brand-icon" size={20} />
            <span className="brand-glow-orb"></span>
          </div>
          <div className="brand-meta">
            <div className="brand-title">
              <span>Rigel</span><span className="brand-ai">AI</span>
              <span className="brand-version">v2.0</span>
            </div>
            <span className="brand-subtitle">Code Intelligence Studio</span>
          </div>
        </a>

        {/* Engine Status */}
        <div className="engine-status-pill" title="AST parser & ML smell classifier loaded">
          <span className="pulse-dot"></span>
          <span className="status-label">AST + ML Engine Active</span>
        </div>

        {/* Navigation / Mode Switcher */}
        <nav className="navbar-nav desktop-only" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab ${mode === "analyze" ? "active" : ""}`}
            onClick={() => handleModeChange("analyze")}
          >
            <Terminal size={16} />
            <span>Studio Workspace</span>
          </button>

          <button
            type="button"
            className={`nav-tab ${mode === "chat" ? "active" : ""}`}
            onClick={() => handleModeChange("chat")}
          >
            <MessageSquareCode size={16} />
            <span>AI Copilot</span>
            <span className="tab-pill">Interactive</span>
          </button>

          <button
            type="button"
            className="nav-tab"
            onClick={handleOpenIdeHub}
            title="Open Universal IDE Integration Guide"
          >
            <Download size={16} />
            <span>IDE Extension Hub</span>
          </button>
        </nav>

        {/* Action buttons */}
        <div className="navbar-actions desktop-only">
          <button
            type="button"
            className="btn-icon theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <a
            href="https://github.com/wraith-klu/RigelAI"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-icon"
            title="View RigelAI on GitHub"
            aria-label="GitHub Repository"
          >
            <GitBranch size={18} />
          </a>
          <a
            href="#workspace"
            className="btn-primary-compact"
            onClick={() => handleModeChange("analyze")}
          >
            <Sparkles size={15} />
            <span>Run Analysis</span>
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="mobile-toggle mobile-only"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <div className="mobile-drawer-inner">
            <button
              type="button"
              className={`mobile-nav-btn ${mode === "analyze" ? "active" : ""}`}
              onClick={() => handleModeChange("analyze")}
            >
              <Terminal size={18} />
              <span>Studio Workspace</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-btn ${mode === "chat" ? "active" : ""}`}
              onClick={() => handleModeChange("chat")}
            >
              <MessageSquareCode size={18} />
              <span>AI Copilot Review</span>
            </button>

            <button
              type="button"
              className="mobile-nav-btn"
              onClick={handleOpenIdeHub}
            >
              <Download size={18} />
              <span>IDE Extension Setup Hub</span>
            </button>

            <button
              type="button"
              className="mobile-nav-btn"
              onClick={() => {
                toggleTheme?.();
              }}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}</span>
            </button>

            <div className="mobile-divider"></div>

            <div className="mobile-engine-row">
              <Activity size={16} className="text-emerald" />
              <span>Backend Status: Online</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
