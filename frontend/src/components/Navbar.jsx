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

        {/* LOGO */}
        <div className="nav-logo">
          <span className="logo-icon">🧠</span>
          <span className="logo-text">RigelAI</span>
        </div>

        {/* DESKTOP NAV */}
        {setMode && (
          <nav className="nav-links desktop-nav">

            <button
              className={`nav-btn ${mode === "chat" ? "active" : ""}`}
              onClick={() => switchMode("chat")}
            >
              Chat
            </button>

            <button
              className={`nav-btn ${mode === "analyze" ? "active" : ""}`}
              onClick={() => switchMode("analyze")}
            >
              Analyze Code
            </button>

          </nav>
        )}

        {/* MOBILE MENU BUTTON */}
        <button
          className="menu-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

      </div>

      {/* MOBILE MENU */}
      {open && setMode && (
        <div className="mobile-menu">

          <button
            className={`nav-btn ${mode === "chat" ? "active" : ""}`}
            onClick={() => switchMode("chat")}
          >
            💬 Chat
          </button>

          <button
            className={`nav-btn ${mode === "analyze" ? "active" : ""}`}
            onClick={() => switchMode("analyze")}
          >
            ⚡ Analyze Code
          </button>

        </div>
      )}

    </header>
  );
}