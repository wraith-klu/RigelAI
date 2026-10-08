import React from "react";
import { IconClose } from "./Icons";
import "./LegalPages.css";

export default function PrivacyPolicy({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="legal-modal-container">
        <div className="legal-modal-header">
          <div>
            <span className="legal-draft-badge">Draft for Legal Review</span>
            <h2 id="privacy-title" className="legal-title">Privacy Policy</h2>
            <p className="legal-date">Last revised: October 4, 2026</p>
          </div>
          <button
            type="button"
            className="legal-close-btn"
            onClick={onClose}
            aria-label="Close Privacy Policy"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="legal-modal-body">
          <section className="legal-section">
            <h3>1. Scope and Overview</h3>
            <p>
              This Privacy Policy describes how Rigel AI collects, processes, and protects information when you use our code analysis platform, developer studio, and IDE extensions. Rigel AI is engineered to prioritize source code confidentiality and operational transparency.
            </p>
          </section>

          <section className="legal-section">
            <h3>2. Source Code and Analysis Data</h3>
            <p>
              When you submit source files, code snippets, or repository links for review:
            </p>
            <ul>
              <li>
                <strong>In-Memory Processing:</strong> Abstract Syntax Tree (AST) parsing and machine learning smell classification are conducted in temporary execution memory.
              </li>
              <li>
                <strong>No Code Retention:</strong> Rigel AI does not persist, archive, or index your proprietary source code in long-term databases. Once your analysis session completes, raw code buffers are discarded.
              </li>
              <li>
                <strong>Model Inference:</strong> Remediation queries forwarded to Large Language Model providers (such as OpenRouter endpoints) are transmitted over TLS 1.3 encryption solely to generate requested refactoring suggestions. Your code is not used by Rigel AI to train public AI models.
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h3>3. Information Stored Locally</h3>
            <p>
              Client-side preferences, such as selected programming language presets and session keys, are stored in your browser LocalStorage. This data stays on your device and can be cleared at any time through your browser settings.
            </p>
          </section>

          <section className="legal-section">
            <h3>4. Analytics and Tracking</h3>
            <p>
              Rigel AI does not use third-party advertising cookies, cross-site trackers, or data-broker syndication. Network requests to the backend API are logged solely for basic rate limiting, diagnostic uptime, and server health.
            </p>
          </section>

          <section className="legal-section">
            <h3>5. Security Safeguards</h3>
            <p>
              All data transmitted between your browser, IDE extension, and our API endpoints uses standard HTTPS encryption. Repository clones performed for multi-file audits operate within sandboxed ephemeral directories that are purged upon completion.
            </p>
          </section>

          <section className="legal-section">
            <h3>6. Data Subject Rights and Inquiries</h3>
            <p>
              Because we do not store customer profiles or code databases, there is no permanent repository of personal data to export or delete. For enterprise self-hosted deployments or compliance inquiries, please contact our team via our project repository.
            </p>
          </section>

          <div className="legal-footer-note">
            Notice: This document reflects current technical architecture and data flows. It is provided as a draft for legal counsel review.
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
