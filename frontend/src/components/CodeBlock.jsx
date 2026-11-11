import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import vscDarkPlus from "react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus";
import { IconCopy, IconCheck } from "./Icons";
import "./CodeBlock.css";

export default function CodeBlock({
  code = "",
  language = "python",
  filename = "",
  showLineNumbers = true,
}) {
  const [copied, setCopied] = useState(false);

  const cleanCode = String(code || "").trim();

  const handleCopy = (e) => {
    e?.stopPropagation();
    if (!cleanCode) return;
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = (language || "python").toLowerCase();
  const displayTitle = filename || `${displayLang}`;

  return (
    <div className="vscode-editor-card">
      <div className="vscode-titlebar">
        <div className="vscode-titlebar-left">
          <div className="vscode-window-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <span className="vscode-filename">{displayTitle}</span>
        </div>
        <button
          type="button"
          className={`vscode-copy-btn ${copied ? "copied" : ""}`}
          onClick={handleCopy}
          title="Copy code to clipboard"
        >
          {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
          <span>{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
      <div className="vscode-code-body">
        <SyntaxHighlighter
          language={displayLang}
          style={vscDarkPlus}
          showLineNumbers={showLineNumbers}
          wrapLines={false}
          customStyle={{
            margin: 0,
            padding: "0.85rem 1rem",
            fontSize: "0.825rem",
            backgroundColor: "#1e1e1e",
            fontFamily: "var(--font-mono, Consolas, 'Fira Code', Monaco, monospace)",
            lineHeight: 1.55,
          }}
          lineNumberStyle={{
            color: "#6e7681",
            minWidth: "2.5em",
            paddingRight: "1em",
            userSelect: "none",
          }}
        >
          {cleanCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
