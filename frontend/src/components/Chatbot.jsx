import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  IconSend,
  IconTrash,
  IconCopy,
  IconCheck,
  IconChat,
  IconAlertTriangle,
  IconDownload
} from "./Icons";
import { sendChatMessage, downloadPDF } from "../services/api";
import "./Chatbot.css";

const STORAGE_KEY = "rigelai_chat_history";

const STARTER_PROMPTS = [
  {
    title: "Refactor Long Method",
    desc: "How do I decompose a high-cognitive-complexity batch processor into small single-responsibility functions?",
  },
  {
    title: "Eliminate Data Clumps",
    desc: "What parameter object patterns should be used when multiple functions share identical signature groups?",
  },
  {
    title: "Cyclomatic Complexity Reduction",
    desc: "Provide techniques to flatten deeply nested conditional loops into early returns or lookup strategies.",
  },
  {
    title: "Dependency Injection Design",
    desc: "How can I decouple external API clients in Python or TypeScript to make unit testing deterministic?",
  },
];

export default function Chatbot({ initialInput = null }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);

  // Safe array reference
  const safeMessages = Array.isArray(messages) ? messages : [];

  useEffect(() => {
    try {
      if (Array.isArray(messages)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Could not save chat history to localStorage", e);
    }
  }, [messages]);

  useEffect(() => {
    if (initialInput && !loading) {
      setInput(initialInput);
    }
  }, [initialInput, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const data = await sendChatMessage(query);
      const assistantMessage = {
        role: "assistant",
        content: data.response || data.reply || "No response received.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err.message || "Failed to reach AI assistant. Ensure the backend is reachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleCopyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleExportPDF = async () => {
    if (messages.length === 0) return;
    const transcript = messages
      .map((m) => `[${m.role.toUpperCase()}] (${m.timestamp || ""}):\n${m.content}\n`)
      .join("\n---\n\n");
    await downloadPDF(transcript);
  };

  return (
    <div className="copilot-container card">
      {/* Header */}
      <div className="copilot-header">
        <div className="copilot-header-left">
          <div className="copilot-title-group">
            <h3>Rigel AI Copilot</h3>
            <span className="copilot-status-badge">Ready</span>
          </div>
          <p className="copilot-subtitle">
            Contextual code review assistant for refactoring strategy and architecture questions.
          </p>
        </div>

        <div className="copilot-header-actions">
          {safeMessages.length > 0 && (
            <>
              <button
                type="button"
                className="btn-secondary compact"
                onClick={handleExportPDF}
                title="Export discussion as PDF"
              >
                <IconDownload size={13} />
                <span>Export PDF</span>
              </button>
              <button
                type="button"
                className="btn-secondary compact"
                onClick={handleClearHistory}
                title="Clear discussion"
              >
                <IconTrash size={13} />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="copilot-messages-area">
        {safeMessages.length === 0 ? (
          <div className="copilot-empty-state">
            <div className="empty-copilot-text">
              <h4>Start a Technical Discussion</h4>
              <p>Ask questions about code smell remediation, performance bottlenecks, or clean architecture.</p>
            </div>

            <div className="starter-prompts-grid">
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="starter-prompt-card"
                  onClick={() => handleSend(prompt.desc)}
                >
                  <strong className="starter-title">{prompt.title}</strong>
                  <p className="starter-desc">{prompt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="message-stream">
            {safeMessages.map((m, idx) => (
              <div key={idx} className={`copilot-bubble-row ${m.role}`}>
                <div className="bubble-wrapper">
                  <div className="bubble-meta">
                    <span className="bubble-sender">{m.role === "user" ? "You" : "Rigel AI"}</span>
                    {m.timestamp && <span className="bubble-time">{m.timestamp}</span>}
                    <button
                      type="button"
                      className="btn-copy-bubble"
                      onClick={() => handleCopyMessage(m.content, idx)}
                      title="Copy response"
                    >
                      {copiedIndex === idx ? <IconCheck size={12} /> : <IconCopy size={12} />}
                    </button>
                  </div>
                  <div className="bubble-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="copilot-bubble-row assistant">
                <div className="bubble-wrapper">
                  <div className="bubble-meta">
                    <span className="bubble-sender">Rigel AI</span>
                    <span className="bubble-time">Processing...</span>
                  </div>
                  <div className="bubble-content loading-dots">
                    Thinking and reviewing code context...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Note */}
      {error && (
        <div className="copilot-error-banner" role="alert">
          <IconAlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Input Field */}
      <form
        className="copilot-input-bar"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="text"
          className="text-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a technical question about your code or architecture..."
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={!input.trim() || loading}
        >
          <IconSend size={14} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
