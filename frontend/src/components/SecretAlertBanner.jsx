import React, { useState } from "react";
import { IconShield, IconAlertTriangle, IconCopy, IconCheck } from "./Icons";

export default function SecretAlertBanner({ findings = [], onDismiss }) {
  const [copied, setCopied] = useState(false);

  // Identify all secret-related findings
  const secretFindings = findings.filter(
    (f) =>
      f.secret_type ||
      f.severity === "critical" && (
        /secret|credential|token|api_key|password|aws_|private key/i.test(f.title || "") ||
        /secret|credential|token|api_key|password|aws_|private key/i.test(f.message || "")
      )
  );

  if (!secretFindings.length) return null;

  const handleCopyEnvSnippet = () => {
    const envSnippet = secretFindings
      .map((f, i) => `# Line ${f.line || '?'}: ${f.title}\n${(f.secret_type || 'SECRET_KEY').toUpperCase().replace(/[^A-Z0-9]/g, '_')}=your_secret_here`)
      .join("\n\n");
    navigator.clipboard.writeText(envSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="secret-alert-banner" role="alert">
      <div className="secret-alert-header">
        <div className="secret-alert-icon-title">
          <span className="secret-shield-pulse">
            <IconAlertTriangle size={18} />
          </span>
          <div>
            <strong>DevSecOps Alert: {secretFindings.length} Hardcoded Credential{secretFindings.length > 1 ? "s" : ""} Exposed</strong>
            <p className="secret-alert-sub">
              Never commit plaintext API tokens, database URIs, or private keys to source repositories.
            </p>
          </div>
        </div>

        <div className="secret-alert-actions">
          <button
            type="button"
            className="btn-secondary compact secret-copy-btn"
            onClick={handleCopyEnvSnippet}
            title="Copy .env template"
          >
            {copied ? <IconCheck size={13} /> : <IconCopy size={13} />}
            <span>{copied ? "Copied .env" : "Copy .env Template"}</span>
          </button>
          {onDismiss && (
            <button type="button" className="secret-dismiss-btn" onClick={onDismiss} aria-label="Dismiss">
              ×
            </button>
          )}
        </div>
      </div>

      <div className="secret-findings-chips">
        {secretFindings.map((f, idx) => (
          <div key={idx} className="secret-token-chip">
            <span className="token-dot"></span>
            <span className="token-label">{f.title || "Exposed Token"}</span>
            {f.line && <span className="token-line">Line {f.line}</span>}
            {f.entropy && <span className="token-entropy">{f.entropy} bits entropy</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
