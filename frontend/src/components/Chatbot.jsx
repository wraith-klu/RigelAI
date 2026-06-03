import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sendChatMessage } from "../services/api";
import "./Chatbot.css";

const STORAGE_KEY = "codesentinel_chat_history";

export default function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resizeTextarea = () => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = {
      role: "user",
      text: input,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await sendChatMessage(input);
      const botText = data?.llm_analysis?.llm_response || "No response received.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: botText,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "The chat request failed. Confirm the backend is running, then try again.",
          time: "",
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(resizeTextarea);
    }
  };

  const handleKey = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMessages([]);
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-header">
        <div className="chat-title-group">
          <img src="/agent-avatar.svg" alt="" aria-hidden="true" />
          <div>
          <span className="panel-label">Discussion mode</span>
          <h3>Ask RigelAI anything about your code</h3>
          </div>
        </div>
        <button className="clear-btn" onClick={clearChat} type="button">
          New chat
        </button>
      </div>

      <div className="chat-body">
        {messages.length === 0 && (
          <div className="empty-state">
            <h3>Start with a code quality question</h3>
            <img src="/agent-avatar.svg" alt="" aria-hidden="true" />
            <p>
              Ask about refactoring strategy, error handling, performance,
              readability, or how to explain the project in an interview.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`message ${message.role}`}>
            {message.role === "assistant" && (
              <img className="chat-avatar" src="/agent-avatar.svg" alt="RigelAI" />
            )}

            <div className="bubble">
              {message.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              ) : (
                message.text
              )}

              {message.time && <div className="time">{message.time}</div>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message assistant">
            <img className="chat-avatar" src="/agent-avatar.svg" alt="RigelAI" />
            <div className="bubble typing">Thinking...</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          placeholder="Ask a review question..."
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            resizeTextarea();
          }}
          onKeyDown={handleKey}
          rows={1}
        />

        <button onClick={sendMessage} disabled={!input.trim() || loading} type="button">
          Send
        </button>
      </div>
    </div>
  );
}
