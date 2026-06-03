import { useState } from "react";
import "./Navbar.css";

export default function Navbar({ mode, setMode }) {
  const [open, setOpen] = useState(false);

  const switchMode = (newMode) => {
    setMode?.(newMode);
    setOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="nav-logo">
          <span className="logo-icon" aria-hidden="true">
            R
          </span>
          <span className="logo-text">RigelAI</span>
        </div>

        {setMode && (
          <nav className="nav-links desktop-nav" aria-label="Review modes">
            <button
              className={`nav-btn ${mode === "chat" ? "active" : ""}`}
              onClick={() => switchMode("chat")}
              type="button"
            >
              Chat
            </button>

            <button
              className={`nav-btn ${mode === "analyze" ? "active" : ""}`}
              onClick={() => switchMode("analyze")}
              type="button"
            >
              Analyze Code
            </button>
          </nav>
        )}

        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          type="button"
        >
          Menu
        </button>
      </div>

      {open && setMode && (
        <div className="mobile-menu">
          <button
            className={`nav-btn ${mode === "chat" ? "active" : ""}`}
            onClick={() => switchMode("chat")}
            type="button"
          >
            Chat
          </button>

          <button
            className={`nav-btn ${mode === "analyze" ? "active" : ""}`}
            onClick={() => switchMode("analyze")}
            type="button"
          >
            Analyze Code
          </button>
        </div>
      )}
    </header>
  );
}
