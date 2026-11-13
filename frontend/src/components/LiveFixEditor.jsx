import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { IconCheck, IconCopy, IconRefresh, IconPlay } from "./Icons";

export default function LiveFixEditor({
  originalCode = "",
  refactoredCode = "",
  language = "python",
  onApplyFix,
  projectedScore = 96,
  baselineScore = 65,
}) {
  const [currentCode, setCurrentCode] = useState(refactoredCode || originalCode);
  const [copied, setCopied] = useState(false);
  const [isReevaluating, setIsReevaluating] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setCurrentCode(refactoredCode || originalCode);
  }, [refactoredCode, originalCode]);

  const handleEditorChange = (value) => {
    const newCode = value || "";
    setCurrentCode(newCode);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    setIsReevaluating(true);
    debounceTimer.current = setTimeout(() => {
      setIsReevaluating(false);
    }, 700);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCurrentCode(refactoredCode || originalCode);
  };

  const handleApply = () => {
    if (onApplyFix) {
      onApplyFix(currentCode);
    }
  };

  return (
    <div className="live-fix-editor-container mac-window">
      <div className="live-fix-toolbar">
        <div className="live-fix-meta">
          <div className="mac-traffic-lights" aria-hidden="true" style={{ marginRight: '6px' }}>
            <span className="mac-traffic-dot dot-close"><span className="dot-glyph">✕</span></span>
            <span className="mac-traffic-dot dot-minimize"><span className="dot-glyph">−</span></span>
            <span className="mac-traffic-dot dot-expand"><span className="dot-glyph">+</span></span>
          </div>
          <span className="category-pill">
            <span>Live Fix Playground</span>
          </span>
          <div className="live-fix-scores">
            <span className="score-badge baseline">Baseline: {baselineScore}%</span>
            <span className="score-arrow">→</span>
            <span className="score-badge projected">⚡ Projected: {projectedScore}%</span>
          </div>
          {isReevaluating && <span className="reevaluating-tag">Re-evaluating...</span>}
        </div>

        <div className="live-fix-actions">
          <button
            type="button"
            className="btn-secondary compact"
            onClick={handleReset}
            title="Reset code"
          >
            <IconRefresh size={13} />
            <span>Reset</span>
          </button>
          <button
            type="button"
            className="btn-secondary compact"
            onClick={handleCopy}
            title="Copy code"
          >
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
          {onApplyFix && (
            <button
              type="button"
              className="btn-primary compact"
              onClick={handleApply}
              title="Apply fix to studio"
            >
              <IconPlay size={13} />
              <span>Apply Fix</span>
            </button>
          )}
        </div>
      </div>

      <div className="live-fix-monaco-wrapper">
        <Editor
          height="320px"
          language={language === "py" ? "python" : language}
          value={currentCode}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            fontSize: 13,
            lineNumbers: "on",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 8, bottom: 8 },
            fontFamily: "'JetBrains Mono', ui-monospace, Menlo, Monaco, Consolas, monospace",
          }}
        />
      </div>
    </div>
  );
}
