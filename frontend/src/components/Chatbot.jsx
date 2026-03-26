import { useState, useEffect, useRef } from "react";
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

    /* ================= LOAD HISTORY ================= */

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setMessages(JSON.parse(saved));
    }, []);

    /* ================= SAVE + SCROLL ================= */

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /* ================= AUTO RESIZE TEXTAREA ================= */

    const resizeTextarea = () => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    };

    /* ================= SEND MESSAGE ================= */

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

            const botText =
                data?.llm_analysis?.llm_response ||
                "No response received.";

            const botMsg = {
                role: "assistant",
                text: botText,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            };

            setMessages((prev) => [...prev, botMsg]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    text: "Server error.",
                    time: "",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    /* ================= KEY HANDLING ================= */

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    /* ================= CLEAR CHAT ================= */

    const clearChat = () => {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([]);
    };

    /* ================================================= */

    return (
        <div className="chat-wrapper">

            {/* HEADER */}
            <div className="chat-header">
                💬 Discussion Mode
                <button className="clear-btn" onClick={clearChat}>
                    New Chat
                </button>
            </div>

            {/* BODY */}
            <div className="chat-body">

                {/* EMPTY STATE */}
                {messages.length === 0 && (
                    <div className="empty-state">
                        <h2>Start a conversation</h2>
                        <p>Ask anything about your code.</p>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>

                        {m.role === "assistant" && (
                            <div className="avatar">AI</div>
                        )}

                        <div className="bubble">
                            {m.role === "assistant" ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {m.text}
                                </ReactMarkdown>
                            ) : (
                                m.text
                            )}

                            {m.time && (
                                <div className="time">{m.time}</div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="message assistant">
                        <div className="avatar">AI</div>
                        <div className="bubble typing">
                            Thinking<span className="dots">...</span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* INPUT */}
            <div className="chat-input-bar">

                <textarea
                    ref={textareaRef}
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => {
                        setInput(e.target.value);
                        resizeTextarea();
                    }}
                    onKeyDown={handleKey}
                    rows={1}
                />

                <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                >
                    Send
                </button>

            </div>
        </div>
    );
}