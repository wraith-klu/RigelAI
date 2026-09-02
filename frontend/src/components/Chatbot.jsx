import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Send,
  Trash2,
  Sparkles,
  Code2,
  ShieldCheck,
  Cpu,
  Lightbulb,
  Copy,
  Check,
  RotateCcw,
  Zap,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  GitBranch,
  Layers,
  Clock,
} from "lucide-react";
import { sendChatMessage } from "../services/api";
import "./Chatbot.css";

const STORAGE_KEY = "rigelai_chat_history";

const STARTER_PROMPTS = [
  {
    icon: Code2,
    color: "blue",
    title: "Refactor God Class",
    desc: "How do I refactor a god class using Dependency Injection and the Strategy Pattern?",
  },
  {
    icon: ShieldCheck,
    color: "emerald",
    title: "Security Vulnerability Review",
    desc: "What are the key pitfalls when handling unvalidated deserialization in Java/Python?",
  },
  {
    icon: Cpu,
    color: "violet",
    title: "Algorithmic Complexity",
    desc: "How do I reduce nested O(n²) iterations into linear O(n) hash map lookups?",
  },
  {
    icon: Lightbulb,
    color: "amber",
    title: "Unit Testing Strategy",
    desc: "Provide best practices and fixtures for mocking external API dependencies.",
  },
  {
    icon: GitBranch,
    color: "cyan",
    title: "Code Smell Detection",
    desc: "What are the most common code smells in large Python codebases and how to fix them?",
  },
  {
    icon: Layers,
    color: "rose",
    title: "Design Pattern Advice",
    desc: "When should I use Observer vs Event Bus patterns for decoupled components?",
  },
];

const THINKING_LINES = [
  "Parsing your query with AST analysis engine…",
  "Consulting RoBERTa smell classification model…",
  "Generating refactoring recommendations…",
  "Synthesizing quality engineering insights…",
];

function ThinkingIndicator() {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIdx((i) => (i + 1) % THINKING_LINES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="thinking-indicator">
      <div className="thinking-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="thinking-label">{THINKING_LINES[lineIdx]}</span>
    </div>
  );
}

function MessageBubble({ msg, index, copiedIndex, onCopy, onRetry, isLast }) {
  const isAssistant = msg.role === "assistant";
  const isError = msg.isError;

  return (
    <div className={`chat-message-row ${msg.role} ${isLast ? "is-last" : ""}`}>
      {/* Avatar */}
      <div className={`message-avatar ${isAssistant ? "avatar-bot" : "avatar-user"}`}>
        {isAssistant ? (
          <Bot size={15} />
        ) : (
          <span className="user-initial">
            {msg.userInitial || "U"}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="message-bubble-wrapper">
        <div className="message-meta-row">
          <span className="message-sender">
            {isAssistant ? "RigelAI Copilot" : "You"}
          </span>
          {msg.time && <span className="message-timestamp">{msg.time}</span>}
          {isError && (
            <span className="error-tag">
              <AlertCircle size={10} />
              Failed
            </span>
          )}
        </div>

        <div className={`message-text markdown-body ${isError ? "error-bubble" : ""}`}>
          {isAssistant ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{msg.text}</span>
          )}
        </div>

        {/* Actions below AI message */}
        {isAssistant && !isError && (
          <div className="message-actions-bar">
            <button
              type="button"
              className="btn-msg-action"
              onClick={() => onCopy(msg.text, index)}
              title="Copy response"
            >
              {copiedIndex === index ? (
                <>
                  <Check size={11} className="text-emerald" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={11} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Retry on error */}
        {isError && onRetry && (
          <div className="message-actions-bar">
            <button
              type="button"
              className="btn-msg-action retry"
              onClick={onRetry}
            >
              <RefreshCw size={11} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

const isSessionExpired = (timestamp) => {
  if (!timestamp) return false;
  return Date.now() - Number(timestamp) >= ONE_HOUR_MS;
};

export default function Chatbot({ initialInput }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialInput || "");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [charCount, setCharCount] = useState((initialInput || "").length);
  const [lastFailedQuery, setLastFailedQuery] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const canvasRef = useRef(null);

  // Auto-fill and resize when initialInput changes
  useEffect(() => {
    if (initialInput) {
      setInput(initialInput);
      setCharCount(initialInput.length);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${Math.min(160, textareaRef.current.scrollHeight)}px`;
          textareaRef.current.focus({ preventScroll: true });
        }
      });
    }
  }, [initialInput]);

  // ── Persistence with 1-Hour Expiration ──────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          if (isSessionExpired(parsed.lastUpdatedAt)) {
            localStorage.removeItem(STORAGE_KEY);
            setMessages([]);
          } else {
            setMessages(parsed.messages || []);
          }
        } else if (Array.isArray(parsed)) {
          // Upgrade legacy array format with timestamp
          setMessages(parsed);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lastUpdatedAt: Date.now(), messages: parsed })
          );
        }
      }
    } catch { 
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            lastUpdatedAt: Date.now(),
            messages,
          })
        );
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch { /* ignore */ }

    // Scroll ONLY the internal chatbot canvas container — NEVER the main window viewport
    requestAnimationFrame(() => {
      if (canvasRef.current) {
        canvasRef.current.scrollTo({
          top: canvasRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    });
  }, [messages]);

  // Periodic expiration checker (every 15s)
  useEffect(() => {
    const checkExpiration = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.lastUpdatedAt && isSessionExpired(parsed.lastUpdatedAt)) {
            localStorage.removeItem(STORAGE_KEY);
            setMessages([]);
          }
        }
      } catch { /* ignore */ }
    };

    const timer = setInterval(checkExpiration, 15000);
    return () => clearInterval(timer);
  }, []);

  // ── Textarea auto-resize ─────────────────────────────────────────
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(160, el.scrollHeight)}px`;
  }, []);

  // ── Copy handler ─────────────────────────────────────────────────
  const handleCopy = useCallback((text, idx) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // ── Send message ─────────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideText) => {
    const textToSend = (overrideText ?? input).trim();
    if (!textToSend || loading) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg = {
      role: "user",
      text: textToSend,
      time: now,
      userInitial: "U",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setCharCount(0);
    setLoading(true);
    setLastFailedQuery(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const data = await sendChatMessage(textToSend);
      const botText =
        data?.llm_analysis?.llm_response ||
        data?.response ||
        "No response returned from the model.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setLastFailedQuery(textToSend);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "**Connection error.** Could not reach the backend.\n\nMake sure the FastAPI server is running:\n```bash\nuvicorn main:app --reload\n```",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(resizeTextarea);
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [input, loading, resizeTextarea]);

  // ── Retry last failed query ──────────────────────────────────────
  const handleRetry = useCallback(() => {
    if (!lastFailedQuery) return;
    // Remove the last error message before retrying
    setMessages((prev) => prev.slice(0, -1));
    sendMessage(lastFailedQuery);
  }, [lastFailedQuery, sendMessage]);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  const handleKey = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ── Clear chat ───────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
    setLastFailedQuery(null);
    textareaRef.current?.focus({ preventScroll: true });
  }, []);

  const isEmpty = messages.length === 0;
  const MAX_CHARS = 2000;

  return (
    <div className="chatbot-studio-wrapper">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="bot-avatar-badge">
            <Sparkles size={16} className="text-violet" />
            <span className="bot-status-ring"></span>
          </div>
          <div className="chatbot-header-meta">
            <div className="chatbot-title-row">
              <h4>RigelAI Code Copilot</h4>
              <span className="copilot-pill">
                <Zap size={9} />
                LLM Review Mode
              </span>
              <span className="copilot-pill expire-pill" title="Sessions auto-delete 1 hour after last activity">
                <Clock size={9} />
                1h Auto-Expire
              </span>
            </div>
            <p className="chatbot-desc">
              Architectural review, smell refactoring &amp; quality engineering
            </p>
          </div>
        </div>

        <div className="chatbot-header-right">
          <div className="session-stats">
            <MessageSquare size={12} />
            <span>{messages.length} messages</span>
          </div>
          <button
            type="button"
            className="btn-clear-chat"
            onClick={clearChat}
            disabled={isEmpty}
            title="Clear session"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* ── Canvas ─────────────────────────────────────────────── */}
      <div className="chatbot-canvas" ref={canvasRef}>
        {isEmpty ? (
          /* ── Starter State ─────────────────────────────── */
          <div className="chat-starter-container">
            <div className="starter-hero">
              <div className="starter-icon-glow">
                <Bot size={30} />
              </div>
              <h3>How can RigelAI assist your code review?</h3>
              <p>
                Ask about design patterns, code smells, refactoring strategies, or security best practices.
              </p>
            </div>

            <div className="starter-grid">
              {STARTER_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`starter-card color-${item.color}`}
                    onClick={() => sendMessage(item.desc)}
                    disabled={loading}
                  >
                    <div className="starter-card-icon">
                      <Icon size={15} />
                    </div>
                    <div className="starter-card-content">
                      <span className="starter-card-title">{item.title}</span>
                      <span className="starter-card-desc">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* ── Messages ──────────────────────────────────── */
          <div className="chat-messages-container">
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                msg={msg}
                index={index}
                copiedIndex={copiedIndex}
                onCopy={handleCopy}
                onRetry={msg.isError ? handleRetry : undefined}
                isLast={index === messages.length - 1}
              />
            ))}

            {/* Typing indicator while loading */}
            {loading && (
              <div className="chat-message-row assistant">
                <div className="message-avatar avatar-bot">
                  <Bot size={15} />
                </div>
                <div className="message-bubble-wrapper">
                  <div className="message-meta-row">
                    <span className="message-sender">RigelAI Copilot</span>
                    <span className="generating-badge">
                      <span className="gen-dot"></span>
                      Generating…
                    </span>
                  </div>
                  <ThinkingIndicator />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input Bar ──────────────────────────────────────────── */}
      <div className="chatbot-input-container">
        <div className={`chatbot-input-inner ${loading ? "is-loading" : ""}`}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about patterns, smells, performance, or security…"
            value={input}
            onChange={(e) => {
              const val = e.target.value;
              if (val.length <= MAX_CHARS) {
                setInput(val);
                setCharCount(val.length);
                resizeTextarea();
              }
            }}
            onKeyDown={handleKey}
            disabled={loading}
            aria-label="Chat input"
          />

          <div className="input-actions">
            {input.trim() && (
              <button
                type="button"
                className="btn-clear-input"
                onClick={() => {
                  setInput("");
                  setCharCount(0);
                  resizeTextarea();
                  textareaRef.current?.focus({ preventScroll: true });
                }}
                title="Clear input"
                tabIndex={-1}
              >
                <RotateCcw size={13} />
              </button>
            )}
            <button
              type="button"
              className={`btn-chat-send ${loading ? "is-loading" : ""} ${input.trim() && !loading ? "ready" : ""}`}
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              {loading ? (
                <span className="send-spinner"></span>
              ) : (
                <Send size={14} />
              )}
            </button>
          </div>
        </div>

        {/* Footer meta */}
        <div className="chat-footer-row">
          <span className="chat-footer-hint">
            <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
          </span>
          <span className={`char-counter ${charCount > MAX_CHARS * 0.9 ? "warn" : ""}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>
    </div>
  );
}
