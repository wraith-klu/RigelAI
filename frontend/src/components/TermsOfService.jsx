import React from "react";
import { IconClose } from "./Icons";
import "./LegalPages.css";

export default function TermsOfService({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="legal-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="terms-title">
      <div className="legal-modal-container">
        <div className="legal-modal-header">
          <div>
            <span className="legal-draft-badge">Draft for Legal Review</span>
            <h2 id="terms-title" className="legal-title">Terms of Service</h2>
            <p className="legal-date">Last revised: October 4, 2026</p>
          </div>
          <button
            type="button"
            className="legal-close-btn"
            onClick={onClose}
            aria-label="Close Terms of Service"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="legal-modal-body">
          <section className="legal-section">
            <h3>1. Agreement to Terms</h3>
            <p>
              By accessing or using Rigel AI (including our web platform, API services, and desktop IDE extensions), you agree to these Terms of Service. If you are using this software on behalf of an organization, you represent that you have authority to bind that entity.
            </p>
          </section>

          <section className="legal-section">
            <h3>2. Intellectual Property and Code Ownership</h3>
            <p>
              You retain sole ownership of all intellectual property rights in the code, files, and repositories you submit for analysis. Rigel AI asserts no ownership, license, or copyright claims over your original code or the remediation diffs generated for your session.
            </p>
          </section>

          <section className="legal-section">
            <h3>3. Permitted Use and Acceptable Conduct</h3>
            <p>
              You agree to use Rigel AI solely for legitimate software development, static analysis, and code quality improvement. You agree not to:
            </p>
            <ul>
              <li>Attempt to reverse-engineer server infrastructure or disrupt service stability.</li>
              <li>Submit malicious payloads designed to exploit parser vulnerabilities.</li>
              <li>Exceed standard rate thresholds through automated scraping scripts.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h3>4. Automated Output and Verification Disclaimer</h3>
            <p>
              Rigel AI uses deterministic syntax parsing and probabilistic machine learning models to detect smells and recommend optimizations. While designed for precision:
            </p>
            <ul>
              <li>Suggestions are advisory developer guidance and do not replace automated test suites or human code review.</li>
              <li>You are solely responsible for testing and validating any refactored code before deploying to production systems.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h3>5. Warranty and Limitation of Liability</h3>
            <p>
              The platform is provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied. To the maximum extent permitted by applicable law, Rigel AI and its maintainers shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the software.
            </p>
          </section>

          <section className="legal-section">
            <h3>6. Modifications and Inquiries</h3>
            <p>
              We reserve the right to revise these terms to reflect feature changes or regulatory requirements. Updated terms will be posted with a revised date.
            </p>
          </section>

          <div className="legal-footer-note">
            Notice: This document outlines operational boundaries and software disclaimers. It is provided as a draft for legal counsel review.
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
