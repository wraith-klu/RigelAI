import React, { useState } from "react";
import { IconClose, IconCopy, IconCheck, IconGlobe, IconExternalLink } from "./Icons";
import "./LegalPages.css";

export default function DomainSetupModal({ isOpen, onClose }) {
  const [copiedRecord, setCopiedRecord] = useState(null);

  if (!isOpen) return null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(key);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  return (
    <div className="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="domain-modal-title">
      <div className="legal-modal-container">
        <div className="legal-modal-header">
          <div>
            <span className="legal-draft-badge" style={{ backgroundColor: "var(--accent-tint)", color: "var(--accent-primary)", borderColor: "var(--accent-border)" }}>
              Deployment Checklist
            </span>
            <h2 id="domain-modal-title" className="legal-title">Custom Domain Setup Guide</h2>
            <p className="legal-date">DNS configuration records for production launch</p>
          </div>
          <button
            type="button"
            className="legal-close-btn"
            onClick={onClose}
            aria-label="Close domain setup guide"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="legal-modal-body">
          <section className="legal-section">
            <h3>1. Target Domain Architecture</h3>
            <p>
              Connect your branded domain (for example, <code>rigelai.dev</code> or <code>code.yourcompany.com</code>) to the frontend application deployed on Vercel or your edge provider.
            </p>
          </section>

          <section className="legal-section">
            <h3>2. Required DNS Records</h3>
            <p>Add the following records at your DNS registrar (Cloudflare, Namecheap, Route53, or GoDaddy):</p>
            
            <div style={{ marginTop: "0.75rem", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>Type</th>
                    <th style={{ padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>Name / Host</th>
                    <th style={{ padding: "0.5rem 0.75rem", color: "var(--text-primary)", fontWeight: 600 }}>Value / Target</th>
                    <th style={{ padding: "0.5rem 0.75rem", width: "70px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.5rem 0.75rem", fontFamily: "var(--font-mono)" }}>A</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontFamily: "var(--font-mono)" }}>@</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontFamily: "var(--font-mono)" }}>76.76.21.21</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("76.76.21.21", "a-record")}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--accent-primary)", fontSize: "0.75rem" }}
                      >
                        {copiedRecord === "a-record" ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        <span>{copiedRecord === "a-record" ? "Copied" : "Copy"}</span>
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: "0.5rem 0.75rem", fontFamily: "var(--font-mono)" }}>CNAME</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontFamily: "var(--font-mono)" }}>www</td>
                    <td style={{ padding: "0.5rem 0.75rem", fontFamily: "var(--font-mono)" }}>cname.vercel-dns.com</td>
                    <td style={{ padding: "0.5rem 0.75rem" }}>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("cname.vercel-dns.com", "cname-record")}
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--accent-primary)", fontSize: "0.75rem" }}
                      >
                        {copiedRecord === "cname-record" ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        <span>{copiedRecord === "cname-record" ? "Copied" : "Copy"}</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="legal-section">
            <h3>3. SSL and TLS Verification</h3>
            <p>
              Once DNS propagates (typically 5 to 30 minutes), your edge platform will automatically provision a free Let's Encrypt TLS certificate. All HTTP traffic will automatically redirect to HTTPS.
            </p>
          </section>

          <section className="legal-section">
            <h3>4. Backend API Mapping</h3>
            <p>
              Set the production backend environment variable in your deployment dashboard:
            </p>
            <div style={{ background: "var(--bg-surface-subtle)", padding: "0.6rem 0.8rem", borderRadius: "var(--radius-xs)", border: "1px solid var(--border-subtle)", marginTop: "0.4rem" }}>
              <code>VITE_API_URL=https://api.yourdomain.com</code>
            </div>
          </section>

          <div className="legal-footer-note">
            Pre-launch verification: Ensure your DNS records pass health check before announcing the release.
          </div>
        </div>

        <div className="legal-modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
