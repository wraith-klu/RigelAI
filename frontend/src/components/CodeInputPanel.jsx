import { useState } from "react";
import Editor from "@monaco-editor/react";
import FileUpload from "./FileUpload";
import { analyzeEditor } from "../services/api";
import "./CodeInputPanel.css";

const LANGUAGES = [
    "python",
    "java",
    "cpp",
    "javascript",
    "csharp",
    "go",
    "rust",
    "typescript",
    "php",
    "ruby",
];

const SAMPLE_CODE = {
    python: `def calculate(nums):
    result = []
    for i in range(len(nums)):
        result.append(nums[i] * nums[i])
    return result`,

    javascript: `function calculate(nums) {
    const result = [];
    for (let i = 0; i < nums.length; i++) {
        result.push(nums[i] * nums[i]);
    }
    return result;
    }`, 
};

export default function CodeInputPanel({ onAnalyze }) {
    const [mode, setMode] = useState("editor");
    const [code, setCode] = useState("// Paste code here");
    const [lang, setLang] = useState("python");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // =============================
    // ANALYZE EDITOR CODE
    // =============================
    const handleAnalyze = async () => {
        if (!code.trim()) {
            setError("Editor is empty");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // ✅ Send proper query + code
            const query = `Analyze this ${lang} code for bugs, smells, and improvements`;

            const data = await analyzeEditor(code, query);

            onAnalyze?.(data);
        } catch (e) {
            setError(e.message || "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    // =============================
    // KEYBOARD SHORTCUT
    // Ctrl/Cmd + Enter
    // =============================
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            handleAnalyze();
        }
    };

    // =============================
    // CLEAR EDITOR
    // =============================
    const clearEditor = () => setCode("");

    // =============================
    // LOAD SAMPLE
    // =============================
    const loadSample = () => {
        setCode(SAMPLE_CODE[lang] || "// Sample not available");
    };

    return (
        <div className="input-panel">

            {/* MODE SWITCH */}
            <div className="input-tabs">
                <button
                    className={mode === "editor" ? "active" : ""}
                    onClick={() => setMode("editor")}
                >
                    📝 Editor
                </button>

                <button
                    className={mode === "upload" ? "active" : ""}
                    onClick={() => setMode("upload")}
                >
                    📂 Upload
                </button>
            </div>

            {/* ================= EDITOR MODE ================= */}
            {mode === "editor" && (
                <div className="editor-block">

                    {/* TOOLBAR */}
                    <div className="editor-toolbar">

                        <select
                            value={lang}
                            onChange={(e) => setLang(e.target.value)}
                        >
                            {LANGUAGES.map((l) => (
                                <option key={l} value={l}>
                                    {l.toUpperCase()}
                                </option>
                            ))}
                        </select>

                        <div className="editor-actions">

                            <button onClick={loadSample}>
                                Sample
                            </button>

                            <button onClick={clearEditor}>
                                Clear
                            </button>

                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="primary"
                            >
                                {loading ? "Analyzing…" : "⚡ Analyze"}
                            </button>

                        </div>
                    </div>

                    {/* MONACO EDITOR */}
                    <Editor
                        height="460px"
                        language={lang}
                        theme="vs-dark"
                        value={code}
                        onChange={(v) => setCode(v || "")}
                        onKeyDown={handleKeyDown}
                        options={{
                            minimap: { enabled: false },
                            wordWrap: "on",
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                        }}
                    />

                    {/* ERROR */}
                    {error && (
                        <div className="error-msg">{error}</div>
                    )}

                    <div className="hint">
                        Press <b>Ctrl/Cmd + Enter</b> to analyze
                    </div>

                </div>
            )}

            {/* ================= UPLOAD MODE ================= */}
            {mode === "upload" && (
                <FileUpload onResult={onAnalyze} />
            )}

        </div>
    );
}