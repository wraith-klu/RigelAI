import { useEffect, useRef, useState } from "react";
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
  Clock, 
  Copy, 
  Check 
} from "lucide-react";
import { sendChatMessage } from "../services/api";
import "./Chatbot.css";

const STORAGE_KEY = "codesentinel_chat_history";

const STARTER_PROMPTS = [
  {
    icon: Code2,
    title: "Refactor Pattern Recommendation",
    desc: "How can I refactor a god class using Dependency Injection and Strategy Pattern?"
  },
  {
    icon: ShieldCheck,
    title: "Security & Vulnerability Review",
    desc: "What are the key security pitfalls when handling unvalidated deserialization?"
  },
  {
    icon: Cpu,
    title: "Algorithmic Complexity",
    desc: "How do I reduce nested O(n²) iterations into linear O(n) hash map lookups?"
  },
  {
    icon: Lightbulb,
    title: "Unit Testing Strategy",
    desc: "Provide best practices and template fixtures for mocking external API dependencies."
  }
];

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // fallback
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(180, el.scrollHeight)}px`;
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const sendMessage = async (overrideText) => {
    const textToSend = overrideText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      role: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(textToSend);
      const botText = data?.llm_analysis?.llm_response || "No response returned from the model.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: botText,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "The request failed. Confirm the FastAPI backend is running on `http://127.0.0.1:8000`.",
          time: "",
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(resizeTextarea);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  };

  return (
    <div className="chatbot-studio-wrapper">
      {/* Copilot Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="bot-avatar-badge">
            <Bot size={18} className="text-cyan" />
            <span className="bot-status-ring"></span>
          </div>
          <div>
            <div className="chatbot-title-row">
              <h4>RigelAI Code Copilot</h4>
              <span className="copilot-pill">LLM Review Mode</span>
            </div>
            <p className="chatbot-desc">Interactive architectural review, code smell refactoring, and quality engineering</p>
          </div>
        </div>

        <div className="chatbot-header-right">
          <button
            type="button"
            className="btn-clear-chat"
            onClick={clearChat}
            disabled={messages.length === 0}
            title="Clear discussion history"
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="chatbot-canvas">
        {messages.length === 0 ? (
          <div className="chat-starter-container">
            <div className="starter-icon-glow">
              <Sparkles size={28} />
            </div>
            <h3>How can RigelAI assist your code review?</h3>
            <p>Select a prompt below or ask any question regarding smells, performance, or refactoring.</p>

            <div className="starter-grid">
              {STARTER_PROMPTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    className="starter-card"
                    onClick={() => sendMessage(item.desc)}
                  >
                    <div className="starter-card-icon">
                      <Icon size={16} />
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
          <div className="chat-messages-container">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === "assistant";
              return (
                <div key={index} className={`chat-message-row ${msg.role}`}>
                  <div className="message-avatar">
                    {isAssistant ? <Bot size={16} /> : <div className="user-initial">U</div>}
                  </div>

                  <div className="message-bubble-wrapper">
                    <div className="message-meta-row">
                      <span className="message-sender">{isAssistant ? "RigelAI Copilot" : "You"}</span>
                      {msg.time && <span className="message-timestamp">{msg.time}</span>}
                    </div>

                    <div className="message-text markdown-body">
                      {isAssistant ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                      ) : (
                        msg.text
                      )}
                    </div>

                    {isAssistant && (
                      <div className="message-actions-bar">
                        <button
                          type="button"
                          className="btn-copy-msg"
                          onClick={() => handleCopy(msg.text, index)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check size={12} className="text-emerald" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="chat-message-row assistant">
                <div className="message-avatar">
                  <Bot size={16} />
                </div>
                <div className="message-bubble-wrapper">
                  <div className="message-meta-row">
                    <span className="message-sender">RigelAI Copilot</span>
                  </div>
                  <div className="thinking-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="chatbot-input-container">
        <div className="chatbot-input-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask a question about design patterns, code smells, or refactoring tradeoffs..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={handleKey}
          />
          <button
            type="button"
            className="btn-chat-send"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </div>
        <div className="chat-footer-hint">
          <span>Press <strong>Enter</strong> to send • <strong>Shift + Enter</strong> for new line</span>
        </div>
      </div>
    </div>
  );
}
