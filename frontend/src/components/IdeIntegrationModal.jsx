import { useState } from "react";
import { 
  Terminal, 
  Layers, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  ExternalLink, 
  FolderOpen, 
  HelpCircle, 
  ShieldCheck, 
  Cpu, 
  Code2, 
  CheckCircle2, 
  AlertTriangle, 
  FileCode2, 
  ArrowRight,
  BookOpen,
  Settings,
  Flame,
  Search,
  MessageSquareCode
} from "lucide-react";
import "./IdeIntegrationModal.css";

const IDE_OPTIONS = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    tagline: "Standard Microsoft VS Code (Windows / macOS / Linux)",
    cliCommand: "code --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "code",
    guiSteps: [
      "Open VS Code and navigate to the Extensions View (Ctrl+Shift+X or Cmd+Shift+X).",
      "Click the three dots menu (…) at the top-right of the Extensions panel.",
      "Select 'Install from VSIX…' from the dropdown list.",
      "Browse to your downloaded 'rigelai-code-review-0.4.0.vsix' file and confirm."
    ],
    troubleshootTip: "Ensure 'code' is added to your system PATH via 'Shell Command: Install code command in PATH' inside VS Code Command Palette (Ctrl+Shift+P)."
  },
  {
    id: "cursor",
    name: "Cursor AI",
    tagline: "The AI-first Code Editor built on VS Code core",
    cliCommand: "cursor --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "cursor",
    guiSteps: [
      "Open Cursor and press Ctrl+Shift+X (or Cmd+Shift+X) to access Extensions.",
      "Click the '…' (More Actions) icon in the top header of the extensions sidebar.",
      "Choose 'Install from VSIX…'.",
      "Select 'rigelai-code-review-0.4.0.vsix' and wait for the success notification."
    ],
    troubleshootTip: "If 'cursor' is not recognized in terminal, install via Cursor Command Palette: type 'Install cursor command'."
  },
  {
    id: "antigravity",
    name: "Antigravity IDE / Windsurf",
    tagline: "Next-generation Agentic AI & Code Assistant IDEs",
    icon: "https://raw.githubusercontent.com/devicons/devicon/master/icons/vscode/vscode-original.svg",
    cliCommand: "antigravity --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "antigravity",
    altCliCommand: "windsurf --install-extension rigelai-code-review-0.4.0.vsix",
    guiSteps: [
      "Open your IDE workspace and click the Extensions icon on the Activity Bar.",
      "Click the '…' (Views and More Actions) menu in the top right corner.",
      "Click 'Install from VSIX…'.",
      "Pick 'rigelai-code-review-0.4.0.vsix'. The RigelAI status bar & context commands will initialize instantly."
    ],
    troubleshootTip: "Works natively with all VS Code fork engines (Antigravity, Windsurf, Positron, VSCodium). Use the GUI VSIX installer if your terminal CLI alias is not linked."
  },
  {
    id: "vscodium",
    name: "VSCodium / OpenVSX",
    tagline: "Free/Libre Open Source Software Binaries of VS Code",
    icon: "https://raw.githubusercontent.com/vscodium/vscodium/master/icons/vscodium.png",
    cliCommand: "codium --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "codium",
    guiSteps: [
      "Launch VSCodium and open the Extensions view.",
      "Click the '…' menu and select 'Install from VSIX…'.",
      "Choose 'rigelai-code-review-0.4.0.vsix' from your disk.",
      "Verify that RigelAI: Analyze commands are visible in your Command Palette (F1)."
    ],
    troubleshootTip: "VSCodium uses Open-VSX by default. Direct local VSIX installation bypasses any marketplace network restrictions."
  }
];

const COMMON_ERRORS = [
  {
    title: "ENOENT: no such file or directory, open '...vsix'",
    cause: "The terminal command was executed from a directory that does not contain the .vsix file (e.g. running from root P:\\ instead of P:\\CodeSentinel-AI\\).",
    solution: "Either navigate to the directory where the VSIX file exists before running the command, or specify the full absolute path:\ncode --install-extension \"P:\\CodeSentinel-AI\\vscode-extension\\rigelai-code-review-0.4.0.vsix\""
  },
  {
    title: "'code' / 'cursor' is not recognized as an internal or external command",
    cause: "The IDE CLI executable has not been registered in your operating system environment PATH variables.",
    solution: "Open your IDE, press Ctrl+Shift+P (Cmd+Shift+P), type 'Shell Command: Install [ide] command in PATH', and restart your terminal. Alternatively, use Option B (GUI VSIX Install)."
  },
  {
    title: "Extension fails to reach backend server (Offline/Timeout)",
    cause: "The default backend URL is pointing to a local or remote endpoint that is currently stopped or blocked by firewall.",
    solution: "Open IDE Settings (Ctrl+,), search for 'rigelai.apiUrl', and set it to your running FastAPI backend (e.g., http://localhost:8000 or https://rigelai.onrender.com)."
  },
  {
    title: "v0.4.0: Stop Analysis button is greyed out / not responding",
    cause: "The stop button is only active while an analysis HTTP request is in flight. If the backend has already responded or the request timed out, there is nothing to abort.",
    solution: "The Stop button is enabled automatically when analysis starts and disabled immediately when it finishes. If it stays stuck, check that your backend is reachable at rigelai.apiUrl (Settings > RigelAI). A backend crash will auto-reset the button state."
  },
  {
    title: "v0.4.0: Uninstall Extension button does nothing",
    cause: "The uninstall command triggers a VS Code modal confirmation. If the modal is dismissed or the IDE requires a reload, it may appear that nothing happened.",
    solution: "After clicking Uninstall and confirming in the modal popup, reload VS Code (Ctrl+Shift+P → 'Developer: Reload Window') to complete removal. You can also uninstall via Extensions panel (Ctrl+Shift+X) → RigelAI → Uninstall."
  }
];

export default function IdeIntegrationModal({ isOpen, onClose, onOpenCopilot }) {
  const [selectedIdeId, setSelectedIdeId] = useState("vscode");
  const [activeTab, setActiveTab] = useState("cli"); // "cli" | "gui" | "troubleshoot"
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const currentIde = IDE_OPTIONS.find((ide) => ide.id === selectedIdeId) || IDE_OPTIONS[0];

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopilotAsk = (customQuestion) => {
    onClose();
    if (onOpenCopilot) {
      const q = customQuestion || `I am having trouble installing the RigelAI extension for ${currentIde.name}. Could you guide me step-by-step or help me resolve my installation error?`;
      onOpenCopilot(q);
    }
  };

  return (
    <div className="ide-modal-backdrop" onClick={onClose}>
      <div 
        className="ide-modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ide-modal-title"
      >
        {/* Header */}
        <div className="ide-modal-header">
          <div className="modal-header-left">
            <div className="modal-badge-icon">
              <Code2 size={20} className="text-cyan" />
            </div>
            <div>
              <h2 id="ide-modal-title" className="modal-title">
                IDE Integration Hub &amp; Extension Setup
              </h2>
              <p className="modal-subtitle">
                Universal installation guide for VS Code, Cursor, Antigravity, Windsurf &amp; forks
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="ide-modal-body">
          {/* Top IDE selector cards */}
          <div className="ide-selector-grid">
            {IDE_OPTIONS.map((ide) => {
              const isSelected = ide.id === selectedIdeId;
              return (
                <button
                  key={ide.id}
                  type="button"
                  className={`ide-select-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedIdeId(ide.id)}
                >
                  <div className="ide-card-top">
                    <span className="ide-name">{ide.name}</span>
                    {isSelected && <span className="ide-pill-active">Selected</span>}
                  </div>
                  <span className="ide-card-tagline">{ide.tagline}</span>
                </button>
              );
            })}
          </div>

          {/* Detailed Guide Area */}
          <div className="ide-details-card">
            {/* Guide Header */}
            <div className="guide-header-row">
              <div className="guide-title-meta">
                <h3>Installing RigelAI for {currentIde.name}</h3>
                <span className="bundle-version-badge">Package: v0.4.0 (.vsix)</span>
              </div>

              {/* Approach Switcher */}
              <div className="approach-tabs">
                <button
                  type="button"
                  className={`approach-tab ${activeTab === "cli" ? "active" : ""}`}
                  onClick={() => setActiveTab("cli")}
                >
                  <Terminal size={14} />
                  <span>Terminal CLI Approach</span>
                </button>
                <button
                  type="button"
                  className={`approach-tab ${activeTab === "gui" ? "active" : ""}`}
                  onClick={() => setActiveTab("gui")}
                >
                  <FolderOpen size={14} />
                  <span>GUI VSIX Approach</span>
                </button>
                <button
                  type="button"
                  className={`approach-tab ${activeTab === "troubleshoot" ? "active" : ""}`}
                  onClick={() => setActiveTab("troubleshoot")}
                >
                  <AlertTriangle size={14} />
                  <span>Troubleshooting</span>
                </button>
              </div>
            </div>

            {/* Approach Content */}
            <div className="approach-content-box">
              {activeTab === "cli" && (
                <div className="cli-approach-view">
                  <div className="info-banner">
                    <CheckCircle2 size={16} className="text-emerald" />
                    <span>
                      Quickest method if your IDE's CLI tool (<code>{currentIde.binaryName}</code>) is enabled in your PATH.
                    </span>
                  </div>

                  <div className="method-step">
                    <span className="step-num">Step 1</span>
                    <p>Download the VSIX package to your workspace or project root folder:</p>
                    <a
                      href="/extensions/rigelai-code-review-0.4.0.vsix"
                      download
                      className="btn-download-inline"
                    >
                      <Download size={14} />
                      <span>Download rigelai-code-review-0.4.0.vsix (386 KB)</span>
                    </a>
                  </div>

                  <div className="method-step">
                    <span className="step-num">Step 2</span>
                    <p>Open your command line in the folder containing the file and execute:</p>
                    <div className="code-snippet-card">
                      <code>{currentIde.cliCommand}</code>
                      <button
                        type="button"
                        className="btn-copy-code"
                        onClick={() => handleCopy(currentIde.cliCommand, "main-cli")}
                        title="Copy command"
                      >
                        {copiedKey === "main-cli" ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                        <span>{copiedKey === "main-cli" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  {currentIde.altCliCommand && (
                    <div className="method-step">
                      <span className="step-num">Alternative</span>
                      <p>If you are using Windsurf:</p>
                      <div className="code-snippet-card">
                        <code>{currentIde.altCliCommand}</code>
                        <button
                          type="button"
                          className="btn-copy-code"
                          onClick={() => handleCopy(currentIde.altCliCommand, "alt-cli")}
                          title="Copy command"
                        >
                          {copiedKey === "alt-cli" ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
                          <span>{copiedKey === "alt-cli" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="method-step">
                    <span className="step-num">Note</span>
                      <p className="step-subtext">
                        <strong>Important:</strong> If you run the command from another folder or drive, ensure you pass the <em>full absolute path</em> (e.g. <code>{currentIde.binaryName} --install-extension "P:\CodeSentinel-AI\vscode-extension\rigelai-code-review-0.4.0.vsix"</code>) to prevent <code>ENOENT: no such file or directory</code> errors.
                      </p>
                  </div>
                </div>
              )}

              {activeTab === "gui" && (
                <div className="gui-approach-view">
                  <div className="info-banner">
                    <FolderOpen size={16} className="text-cyan" />
                    <span>
                      100% Guaranteed Approach — Works across all IDEs even if terminal commands or CLI aliases are not configured.
                    </span>
                  </div>

                  <ol className="gui-steps-list">
                    {currentIde.guiSteps.map((step, idx) => (
                      <li key={idx} className="gui-step-item">
                        <div className="gui-step-index">{idx + 1}</div>
                        <div className="gui-step-body">
                          <p>{step}</p>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="gui-download-box">
                    <span>Need the VSIX file?</span>
                    <a
                      href="/extensions/rigelai-code-review-0.4.0.vsix"
                      download
                      className="btn-download-inline"
                    >
                      <Download size={14} />
                      <span>Download rigelai-code-review-0.4.0.vsix</span>
                    </a>
                  </div>
                </div>
              )}

              {activeTab === "troubleshoot" && (
                <div className="troubleshoot-view">
                  <div className="troubleshoot-list">
                    {COMMON_ERRORS.map((err, idx) => (
                      <div key={idx} className="troubleshoot-item">
                        <div className="troubleshoot-title-row">
                          <AlertTriangle size={15} className="text-amber" />
                          <strong>{err.title}</strong>
                        </div>
                        <p className="troubleshoot-cause"><strong>Cause:</strong> {err.cause}</p>
                        <div className="troubleshoot-fix">
                          <strong>Solution:</strong>
                          <pre>{err.solution}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Live Copilot Assistance Banner */}
            <div className="copilot-assist-banner">
              <div className="copilot-assist-left">
                <div className="copilot-orb">
                  <Sparkles size={16} className="text-violet" />
                </div>
                <div>
                  <strong>Encountering an installation or IDE configuration issue?</strong>
                  <span>Ask the AI Copilot for interactive, contextual debugging advice.</span>
                </div>
              </div>

              <button
                type="button"
                className="btn-ask-copilot-direct"
                onClick={() => handleCopilotAsk(`I ran into an issue installing the RigelAI extension for ${currentIde.name}. Could you guide me step-by-step or help me resolve my installation error?`)}
              >
                <MessageSquareCode size={15} />
                <span>Discuss with Copilot</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
