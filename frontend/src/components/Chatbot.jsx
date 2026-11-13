import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconSend, IconTrash, IconCopy, IconCheck,
  IconAlertTriangle, IconDownload, IconRefresh
} from "./Icons";
import { sendChatMessage, downloadPDF } from "../services/api";
import CodeBlock from "./CodeBlock";
import "./Chatbot.css";

/* ── Constants ─────────────────────────────────── */
const STORAGE_KEY = "rigelai_chat_v2";
const MAX_HISTORY  = 50;

const STARTER_PROMPTS = [
  { icon: "🔧", title: "Refactor Long Method",        desc: "How do I break a high-complexity batch processor into single-responsibility helpers?" },
  { icon: "🔍", title: "Detect Code Clones",          desc: "What patterns help identify and eliminate semantic code duplication across modules?" },
  { icon: "⚡", title: "Cyclomatic Complexity",       desc: "How do I flatten deeply nested conditionals to reduce cyclomatic complexity below 10?" },
  { icon: "🏛", title: "Dependency Injection",        desc: "How do I decouple external API clients in Python to make unit tests deterministic?" },
  { icon: "🔐", title: "Credential Security",         desc: "What entropy thresholds does Rigel AI use to detect hardcoded API keys and tokens?" },
  { icon: "📊", title: "SQALE Debt Score",            desc: "Explain the SQALE remediation formula and how maintainability grades A–F are calculated." },
];

const PERSONA_OPTIONS = [
  { id: "architect", label: "🏛 Staff Architect", desc: "Deep technical, enterprise-grade" },
  { id: "student",   label: "🎓 ELI5 Student",   desc: "Friendly analogies, beginner-safe" },
];

/* ── Smart Markdown Preprocessor ───────────────── */
function normalizeMarkdown(text) {
  if (!text) return "";
  let s = String(text);

  // 1. Normalize escaped newlines
  s = s.replace(/\\n/g, "\n");

  // 2. Clean weird trailing pipes in headers: '| | |---' -> '|\n|---'
  s = s.replace(/\|\s*\|\s*\|-+/g, "|\n|---");
  s = s.replace(/\|\s*\|-+/g, "|\n|---");

  // 3. Split multiple table rows joined on a single line: '||' or '| |'
  s = s.replace(/\|\s*\|\s*/g, "|\n| ");

  // 4. Ensure table headers have clean blank line before table
  s = s.replace(/([^\n])\n*(\|[\s\S]*?\|)/g, (match, prefix, tablePart) => {
    if (tablePart.includes("|---") || tablePart.includes("|:---") || tablePart.includes("| ---")) {
      return `${prefix}\n\n${tablePart}`;
    }
    return match;
  });

  // 5. Ensure table separator row has proper newlines
  s = s.replace(/\n\s*\|[-| :]{3,}\|\s*/g, (match) => {
    return "\n" + match.trim() + "\n";
  });

  // 6. Ensure lines with multiple pipes are proper rows with leading and trailing pipes
  const lines = s.split("\n");
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed && trimmed.includes("|") && !trimmed.startsWith("```")) {
      let l = trimmed;
      if (!l.startsWith("|")) l = "| " + l;
      if (!l.endsWith("|")) l = l + " |";
      return l;
    }
    return line;
  });
  s = processed.join("\n");

  // 7. Fix headers stuck directly to preceding text
  s = s.replace(/([^\n])\n(#{1,4}\s+[^\n]+)/g, "$1\n\n$2");

  // 8. Fix lists stuck directly to preceding text
  s = s.replace(/([^\n])\n([*-]\s+[^\n]+)/g, "$1\n\n$2");

  return s;
}

/* ── Markdown renderer ──────────────────────────── */
function MarkdownMessage({ content }) {
  const normalized = useMemo(() => normalizeMarkdown(content), [content]);

  const components = {
    h1({ children }) {
      return <h2 className="chat-msg-h1">{children}</h2>;
    },
    h2({ children }) {
      return <h3 className="chat-msg-h2">{children}</h3>;
    },
    h3({ children }) {
      return <h4 className="chat-msg-h3">{children}</h4>;
    },
    h4({ children }) {
      return <h5 className="chat-msg-h4">{children}</h5>;
    },
    p({ children }) {
      return <p className="chat-msg-p">{children}</p>;
    },
    ul({ children }) {
      return <ul className="chat-msg-ul">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="chat-msg-ol">{children}</ol>;
    },
    li({ children }) {
      return <li className="chat-msg-li">{children}</li>;
    },
    blockquote({ children }) {
      return <blockquote className="chat-msg-quote">{children}</blockquote>;
    },
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const str = String(children).replace(/\n$/, "");
      if (!inline && (match || str.includes("\n"))) {
        return <CodeBlock code={str} language={match?.[1] || "python"} showLineNumbers />;
      }
      return <code className="chat-inline-code" {...props}>{children}</code>;
    },
    table({ children }) {
      return (
        <div className="chat-table-wrap">
          <table className="chat-table">{children}</table>
        </div>
      );
    },
    th({ children }) {
      return <th className="chat-th">{children}</th>;
    },
    td({ children }) {
      return <td className="chat-td">{children}</td>;
    },
    strong({ children }) {
      return <strong className="chat-strong">{children}</strong>;
    },
    hr() {
      return <hr className="chat-hr" />;
    },
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {normalized}
    </ReactMarkdown>
  );
}

/* ── Typing indicator ───────────────────────────── */
function TypingIndicator({ stage }) {
  const stages = [
    "Analyzing context…",
    "Running slot-fill check…",
    "Querying LLM…",
    "Composing response…",
  ];
  return (
    <div className="chat-typing-indicator">
      <div className="chat-typing-dots">
        <span /><span /><span />
      </div>
      <span className="chat-typing-stage">{stages[stage % stages.length]}</span>
    </div>
  );
}

/* ── Message bubble ─────────────────────────────── */
function MessageBubble({ msg, idx, onCopy, copied, isClarifying }) {
  const isUser = msg.role === "user";
  return (
    <div className={`chat-bubble-row ${isUser ? "user" : "assistant"}${isClarifying ? " clarifying" : ""}`}>
      {!isUser && (
        <div className="chat-avatar ai-avatar" aria-hidden="true">
          <span>R</span>
        </div>
      )}
      <div className="chat-bubble-wrap">
        <div className="chat-bubble-meta">
          <span className="chat-sender">{isUser ? "You" : "Rigel AI"}</span>
          {msg.timestamp && <span className="chat-time">{msg.timestamp}</span>}
          {isClarifying && <span className="chat-clarify-tag">Needs clarification</span>}
          <button
            className="chat-copy-btn"
            onClick={() => onCopy(msg.content, idx)}
            title="Copy"
          >
            {copied ? <IconCheck size={11} /> : <IconCopy size={11} />}
          </button>
        </div>
        <div className={`chat-bubble ${isUser ? "bubble-user" : "bubble-ai"}`}>
          {isUser
            ? <p>{msg.content}</p>
            : <MarkdownMessage content={msg.content} />
          }
        </div>
      </div>
      {isUser && (
        <div className="chat-avatar user-avatar" aria-hidden="true">
          <span>U</span>
        </div>
      )}
    </div>
  );
}

/* ── Main Chatbot ───────────────────────────────── */
export default function Chatbot({ initialInput = null }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const [input,       setInput]       = useState("");
  const [persona,     setPersona]     = useState("architect");
  const [loading,     setLoading]     = useState(false);
  const [typingStage, setTypingStage] = useState(0);
  const [error,       setError]       = useState("");
  const [copiedIdx,   setCopiedIdx]   = useState(null);
  const [showPersona, setShowPersona] = useState(false);
  const [charCount,   setCharCount]   = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const typingTimer    = useRef(null);

  const safeMessages = Array.isArray(messages) ? messages : [];

  /* Persist to localStorage */
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(safeMessages.slice(-MAX_HISTORY))); }
    catch { /* ignore */ }
  }, [messages]);

  /* Auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Typing stage animation while loading */
  useEffect(() => {
    if (loading) {
      typingTimer.current = setInterval(() => setTypingStage(s => s + 1), 1200);
    } else {
      clearInterval(typingTimer.current);
      setTypingStage(0);
    }
    return () => clearInterval(typingTimer.current);
  }, [loading]);

  /* Seed initialInput */
  useEffect(() => {
    if (initialInput && !loading) setInput(initialInput);
  }, [initialInput, loading]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    setCharCount(e.target.value.length);
  };

  /* ── Send message ── */
  const handleSend = useCallback(async (overrideText) => {
    const query = (overrideText ?? input).trim();
    if (!query || loading) return;

    const userMsg = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...safeMessages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setCharCount(0);
    setError("");
    setLoading(true);
    inputRef.current?.focus();

    try {
      // Send full history for multi-turn context (last 50)
      const data = await sendChatMessage(query, nextMessages, persona);
      const reply = data.response || data.reply || data.llm_analysis?.llm_response || "No response received.";
      const isClarifying = Boolean(data.clarifying || data.llm_analysis?.clarifying);

      const aiMsg = {
        role: "assistant",
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        clarifying: isClarifying,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message || "Failed to reach Rigel AI backend. Is the server running on port 8000?");
    } finally {
      setLoading(false);
    }
  }, [input, loading, safeMessages, persona]);

  /* ── Keyboard shortcuts ── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    setError("");
    inputRef.current?.focus();
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleExport = async () => {
    if (safeMessages.length === 0) return;
    const transcript = safeMessages
      .map(m => `[${m.role.toUpperCase()}] ${m.timestamp || ""}\n${m.content}`)
      .join("\n\n---\n\n");
    await downloadPDF(transcript);
  };

  const selectedPersona = PERSONA_OPTIONS.find(p => p.id === persona);

  /* ── Render ── */
  return (
    <div className="copilot-root">

      {/* ── Header ── */}
      <div className="copilot-header">
        <div className="copilot-header-left">
          <div className="copilot-logo">
            <div className="copilot-logo-ring">R</div>
          </div>
          <div>
            <div className="copilot-title-row">
              <h3 className="copilot-title">Rigel AI Copilot</h3>
              <span className={`copilot-status ${loading ? "status-thinking" : "status-ready"}`}>
                {loading ? "Thinking…" : "Ready"}
              </span>
            </div>
            <p className="copilot-subtitle">
              Multi-turn · Slot-fill · Last {Math.min(safeMessages.length, MAX_HISTORY)} messages in context
            </p>
          </div>
        </div>

        <div className="copilot-header-actions">
          {/* Persona selector */}
          <div className="persona-dropdown-wrap">
            <button
              className="persona-toggle-btn"
              onClick={() => setShowPersona(p => !p)}
              title="Switch persona"
            >
              <span>{selectedPersona?.label}</span>
              <span className="persona-caret">{showPersona ? "▲" : "▼"}</span>
            </button>
            {showPersona && (
              <div className="persona-dropdown">
                {PERSONA_OPTIONS.map(p => (
                  <button
                    key={p.id}
                    className={`persona-option${persona === p.id ? " active" : ""}`}
                    onClick={() => { setPersona(p.id); setShowPersona(false); }}
                  >
                    <span className="persona-opt-label">{p.label}</span>
                    <span className="persona-opt-desc">{p.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {safeMessages.length > 0 && (
            <>
              <button className="copilot-action-btn" onClick={handleExport} title="Export PDF">
                <IconDownload size={13} />
              </button>
              <button className="copilot-action-btn" onClick={handleClear} title="Clear chat">
                <IconTrash size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Context counter */}
      {safeMessages.length > 0 && (
        <div className="copilot-context-bar">
          <span className="context-dot" />
          <span>{Math.min(safeMessages.length, MAX_HISTORY)} messages in context — Rigel AI remembers this conversation</span>
        </div>
      )}

      {/* ── Messages area ── */}
      <div className="copilot-messages">
        {safeMessages.length === 0 ? (
          <div className="copilot-empty">
            <div className="copilot-empty-logo">✦</div>
            <h4 className="copilot-empty-title">Start a Technical Discussion</h4>
            <p className="copilot-empty-desc">
              Multi-turn conversations, slot-filling for ambiguous queries, and deep context from your last {MAX_HISTORY} messages.
            </p>
            <div className="starter-grid">
              {STARTER_PROMPTS.map((s, i) => (
                <button
                  key={i}
                  className="starter-card"
                  onClick={() => handleSend(s.desc)}
                >
                  <span className="starter-icon">{s.icon}</span>
                  <span className="starter-title">{s.title}</span>
                  <span className="starter-desc">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-stream">
            {safeMessages.map((msg, idx) => (
              <MessageBubble
                key={idx}
                msg={msg}
                idx={idx}
                onCopy={handleCopy}
                copied={copiedIdx === idx}
                isClarifying={Boolean(msg.clarifying)}
              />
            ))}

            {loading && (
              <div className="chat-bubble-row assistant">
                <div className="chat-avatar ai-avatar"><span>R</span></div>
                <div className="chat-bubble-wrap">
                  <div className="chat-bubble-meta">
                    <span className="chat-sender">Rigel AI</span>
                  </div>
                  <div className="chat-bubble bubble-ai">
                    <TypingIndicator stage={typingStage} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="copilot-error-bar">
          <IconAlertTriangle size={14} />
          <span>{error}</span>
          <button className="error-dismiss" onClick={() => setError("")}>✕</button>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="copilot-input-wrap">
        <form
          className="copilot-input-bar"
          onSubmit={e => { e.preventDefault(); handleSend(); }}
        >
          <div className="copilot-textarea-wrap">
            <textarea
              ref={inputRef}
              className="copilot-textarea"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — coding, architecture, sports, science, or general questions… (Shift+Enter for newline)"
              disabled={loading}
              rows={1}
              maxLength={4000}
            />
            <span className="char-count">{charCount > 0 ? `${charCount}/4000` : ""}</span>
          </div>

          <button
            type="submit"
            className="copilot-send-btn"
            disabled={!input.trim() || loading}
            title="Send (Enter)"
          >
            {loading
              ? <span className="send-spinner" />
              : <IconSend size={16} />
            }
          </button>
        </form>

        <div className="copilot-footer-note">
          <span>⌨ <strong>Enter</strong> to send · <strong>Shift+Enter</strong> for newline · Persona: {selectedPersona?.label}</span>
        </div>
      </div>

    </div>
  );
}
