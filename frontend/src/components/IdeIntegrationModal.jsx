import React, { useState } from "react";
import { 
  IconTerminal, 
  IconDownload, 
  IconCopy, 
  IconCheck, 
  IconClose, 
  IconCode 
} from "./Icons";
import "./IdeIntegrationModal.css";

const IDE_OPTIONS = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    tagline: "Microsoft VS Code on macOS, Windows, and Linux",
    cliCommand: "code --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "code",
    guiSteps: [
      "Open VS Code and navigate to Extensions (Ctrl+Shift+X or Cmd+Shift+X).",
      "Click the menu icon (...) at the top right of the Extensions panel.",
      "Select 'Install from VSIX...'.",
      "Choose 'rigelai-code-review-0.4.0.vsix' and restart if prompted."
    ],
    troubleshootTip: "Verify that 'code' is in your PATH via 'Shell Command: Install code command in PATH' from the Command Palette."
  },
  {
    id: "cursor",
    name: "Cursor AI",
    tagline: "Cursor editor built on the VS Code core",
    cliCommand: "cursor --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "cursor",
    guiSteps: [
      "Open Cursor and press Ctrl+Shift+X or Cmd+Shift+X.",
      "Click the '...' menu in the top right of the extensions sidebar.",
      "Select 'Install from VSIX...'.",
      "Select the downloaded .vsix package."
    ],
    troubleshootTip: "If cursor is not recognized in terminal, launch Cursor and run 'Install cursor command' in Command Palette."
  },
  {
    id: "antigravity",
    name: "Antigravity IDE & Windsurf",
    tagline: "Agentic development environments",
    cliCommand: "antigravity --install-extension rigelai-code-review-0.4.0.vsix",
    binaryName: "antigravity",
    guiSteps: [
      "Open Extensions view in the left sidebar.",
      "Click the more actions menu (...) and choose 'Install from VSIX...'.",
      "Select 'rigelai-code-review-0.4.0.vsix' to enable code smell diagnostics."
    ],
    troubleshootTip: "For Windsurf, use 'windsurf --install-extension rigelai-code-review-0.4.0.vsix'."
  }
];

export default function IdeIntegrationModal({ isOpen, onClose }) {
  const [selectedIde, setSelectedIde] = useState("vscode");
  const [copiedCli, setCopiedCli] = useState(false);

  if (!isOpen) return null;

  const current = IDE_OPTIONS.find((i) => i.id === selectedIde) || IDE_OPTIONS[0];

  const handleCopy = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ide-modal-title">
      <div className="legal-modal-container ide-modal-container">
        <div className="legal-modal-header">
          <div>
            <span className="legal-draft-badge" style={{ backgroundColor: "var(--bg-surface-subtle)", color: "var(--text-secondary)", borderColor: "var(--border-default)" }}>
              Local Editor Integration
            </span>
            <h2 id="ide-modal-title" className="legal-title">IDE Extension Setup</h2>
            <p className="legal-date">Install Rigel AI code smell diagnostics directly into your editor</p>
          </div>
          <button
            type="button"
            className="legal-close-btn"
            onClick={onClose}
            aria-label="Close IDE Extension setup"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="legal-modal-body">
          {/* Editor Selection Buttons */}
          <div className="ide-tab-row">
            {IDE_OPTIONS.map((ide) => (
              <button
                key={ide.id}
                type="button"
                className={`ide-tab-btn ${selectedIde === ide.id ? "active" : ""}`}
                onClick={() => setSelectedIde(ide.id)}
              >
                <IconCode size={14} />
                <span>{ide.name}</span>
              </button>
            ))}
          </div>

          {/* Active Editor Details */}
          <div className="ide-content-block">
            <h3 className="ide-name-heading">{current.name}</h3>
            <p className="ide-tagline-text">{current.tagline}</p>

            {/* Terminal Command */}
            <div className="cli-box">
              <span className="cli-box-label">Terminal Installation:</span>
              <div className="cli-box-row">
                <code>{current.cliCommand}</code>
                <button
                  type="button"
                  className="btn-secondary compact"
                  onClick={() => handleCopy(current.cliCommand)}
                  title="Copy command"
                >
                  {copiedCli ? <IconCheck size={13} /> : <IconCopy size={13} />}
                  <span>{copiedCli ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Direct VSIX Download */}
            <div className="vsix-download-card">
              <div>
                <strong>Manual VSIX Package Download</strong>
                <p>Download the extension file directly to install offline or on isolated workstations.</p>
              </div>
              <a
                href="/extensions/rigelai-code-review-0.4.0.vsix"
                download
                className="btn-primary"
              >
                <IconDownload size={14} />
                <span>Download .VSIX (v0.4.0)</span>
              </a>
            </div>

            {/* GUI Steps */}
            <div className="gui-steps-section">
              <h4>Manual GUI Installation Steps:</h4>
              <ol className="steps-list">
                {current.guiSteps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Troubleshooting Note */}
            <div className="troubleshoot-note">
              <strong>Note:</strong> {current.troubleshootTip}
            </div>
          </div>
        </div>

        <div className="legal-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
