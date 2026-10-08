import React, { useState, useEffect, useRef } from "react";
import { 
  IconCode, 
  IconUpload, 
  IconChat, 
  IconPlay, 
  IconDownload, 
  IconGlobe, 
  IconExternalLink,
  IconClose
} from "./Icons";
import "./CommandPalette.css";

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  onSelectAction 
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const ACTIONS = [
    {
      id: "studio-upload",
      title: "File & Repository Audit",
      desc: "Upload local source file or scan a public GitHub repository",
      icon: "📄",
      action: () => onSelectAction("studio-upload")
    },
    {
      id: "studio-editor",
      title: "Interactive Code Editor",
      desc: "Open live Monaco editor to inspect syntax trees and smells",
      icon: "⚡",
      action: () => onSelectAction("studio-editor")
    },
    {
      id: "load-sample",
      title: "Inspect Sample Demonstration Finding",
      desc: "Instant evaluation with verified Cognitive Complexity smell",
      icon: "🔍",
      action: () => onSelectAction("load-sample")
    },
    {
      id: "copilot-chat",
      title: "Copilot AI Chatbot",
      desc: "Ask technical architecture questions and refactoring guidance",
      icon: "💬",
      action: () => onSelectAction("copilot-chat")
    },
    {
      id: "ide-hub",
      title: "Editor Extensions Setup (VS Code, Cursor, Antigravity)",
      desc: "Download .VSIX and configure line-level diagnostics",
      icon: "🔌",
      action: () => onSelectAction("ide-hub")
    },
    {
      id: "domain-guide",
      title: "Custom Domain Setup Guide",
      desc: "Cloudflare, Render, and Vercel CNAME instructions",
      icon: "🌐",
      action: () => onSelectAction("domain-guide")
    },
    {
      id: "github-repo",
      title: "GitHub Repository",
      desc: "Inspect open-source code and issue tracker",
      icon: "🐙",
      action: () => window.open("https://github.com/wraith-klu/RigelAI", "_blank")
    },
    {
      id: "fastapi-docs",
      title: "FastAPI Swagger Documentation",
      desc: "Interactive OpenAPI documentation and REST schemas",
      icon: "📖",
      action: () => window.open("https://rigelai.onrender.com/docs", "_blank")
    }
  ];

  const filtered = ACTIONS.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.desc.toLowerCase().includes(query.toLowerCase())
  );

  // Adjust state during render when isOpen changes (React recommended pattern for prop synchronization)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }

  // Effect only handles DOM side-effects (focusing the search input)
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      filtered[selectedIndex].action();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="palette-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="palette-window" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <div className="palette-input-row">
          <span className="palette-search-icon" aria-hidden="true">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type a command or jump to feature..."
            aria-label="Command search"
          />
          <kbd className="palette-esc-chip" onClick={onClose}>esc</kbd>
        </div>

        <div className="palette-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="palette-empty">No matching actions found.</div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`palette-item ${selectedIndex === idx ? "active" : ""}`}
                onClick={() => { item.action(); onClose(); }}
                onMouseEnter={() => setSelectedIndex(idx)}
                role="option"
                aria-selected={selectedIndex === idx}
              >
                <span className="palette-item-icon" aria-hidden="true">{item.icon}</span>
                <div className="palette-item-text">
                  <strong className="palette-item-title">{item.title}</strong>
                  <span className="palette-item-desc">{item.desc}</span>
                </div>
                {selectedIndex === idx && <span className="palette-item-arrow" aria-hidden="true">↵</span>}
              </button>
            ))
          )}
        </div>

        <div className="palette-footer">
          <div className="palette-keys">
            <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
            <span><kbd>↵</kbd> select</span>
            <span><kbd>esc</kbd> dismiss</span>
          </div>
          <span className="palette-brand">Rigel Spotlight</span>
        </div>
      </div>
    </div>
  );
}
