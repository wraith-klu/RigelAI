import React, { useState, useEffect } from "react";
import { 
  IconTerminal, 
  IconChat, 
  IconDownload, 
  IconExternalLink,
  IconClose,
  IconGlobe,
  IconSun,
  IconMoon
} from "./Icons";
import "./Navbar.css";

export default function Navbar({ 
  mode = "analyze", 
  setMode, 
  onOpenIdeModal,
  onOpenDomainModal,
  onOpenPalette
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("rigel_theme");
      if (saved) return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    localStorage.setItem("rigel_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const handleModeChange = (newMode) => {
    setMode?.(newMode);
    setMobileOpen(false);
  };

  const handleOpenIdeHub = () => {
    setMobileOpen(false);
    onOpenIdeModal?.();
  };

  const handleOpenDomain = () => {
    setMobileOpen(false);
    onOpenDomainModal?.();
  };

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand */}
        <a href="#top" className="navbar-brand" aria-label="Rigel AI Homepage">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="brand-symbol" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="#1d1d1f"/>
            <path d="M16 6L24 16L16 26L8 16Z" stroke="#fbfbfa" strokeWidth="2" strokeLinejoin="round"/>
            <circle cx="16" cy="16" r="3" fill="#0066cc"/>
          </svg>
          <span className="brand-name">Rigel AI</span>
        </a>

        {/* Navigation / Mode Switcher */}
        <nav className="navbar-nav desktop-only" aria-label="Main Navigation">
          <a href="#overview" className="nav-link">
            Overview
          </a>
          <button
            type="button"
            className={`nav-link-btn ${mode === "analyze" ? "active" : ""}`}
            onClick={() => handleModeChange("analyze")}
          >
            Live Studio
          </button>
          <button
            type="button"
            className={`nav-link-btn ${mode === "chat" ? "active" : ""}`}
            onClick={() => handleModeChange("chat")}
            data-mode="chat"
          >
            Copilot Chat
          </button>
          <button
            type="button"
            className="nav-link-btn"
            onClick={handleOpenIdeHub}
          >
            IDE Extension
          </button>
          <button
            type="button"
            className="nav-link-btn"
            onClick={handleOpenDomain}
            title="Custom Domain Verification"
          >
            Domain Setup
          </button>
        </nav>

        {/* Action buttons */}
        <div className="navbar-actions desktop-only">
          <button
            type="button"
            className="nav-cmd-k-btn"
            onClick={onOpenPalette}
            title="Open Command Palette (⌘K or Ctrl+K)"
          >
            <span className="cmd-k-text">Quick Actions</span>
            <kbd className="cmd-k-chip">⌘K</kbd>
          </button>

          <a
            href="https://github.com/wraith-klu/RigelAI"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-secondary-link"
            title="Source Code Repository"
          >
            <span>GitHub</span>
            <IconExternalLink size={13} />
          </a>

          {/* Master 36x36px Square Sun/Moon Theme Switcher */}
          <button
            type="button"
            className="nav-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to Japanese Linen light mode" : "Switch to Obsidian dark mode"}
          >
            {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
          </button>

          <button
            type="button"
            className={`btn-copilot${mode === "chat" ? " nav-btn-active" : ""}`}
            onClick={() => { handleModeChange("chat"); window.location.hash = "workspace"; }}
          >
            <IconChat size={13} />
            <span>Copilot Chat</span>
          </button>
          <a
            href="#workspace"
            className="btn-primary"
            onClick={() => handleModeChange("analyze")}
          >
            Run Analysis
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="mobile-toggle mobile-only"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open navigation menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <IconClose size={20} /> : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="mobile-drawer">
          <div className="mobile-drawer-inner">
            <a 
              href="#overview" 
              className="mobile-nav-btn"
              onClick={() => setMobileOpen(false)}
            >
              Overview
            </a>
            <button
              type="button"
              className={`mobile-nav-btn ${mode === "analyze" ? "active" : ""}`}
              onClick={() => handleModeChange("analyze")}
            >
              <IconTerminal size={16} />
              <span>Live Studio</span>
            </button>

            <button
              type="button"
              className={`mobile-nav-btn ${mode === "chat" ? "active" : ""}`}
              onClick={() => handleModeChange("chat")}
            >
              <IconChat size={16} />
              <span>Copilot Chat</span>
            </button>

            <button
              type="button"
              className="mobile-nav-btn"
              onClick={handleOpenIdeHub}
            >
              <IconDownload size={16} />
              <span>IDE Extension</span>
            </button>

            <button
              type="button"
              className="mobile-nav-btn"
              onClick={handleOpenDomain}
            >
              <IconGlobe size={16} />
              <span>Domain Setup Guide</span>
            </button>

            <div className="mobile-divider"></div>

            <a
              href="https://github.com/wraith-klu/RigelAI"
              target="_blank"
              rel="noopener noreferrer"
              className="mobile-nav-btn"
            >
              <span>GitHub Repository</span>
              <IconExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
