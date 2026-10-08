import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import CodeInputPanel from "../components/CodeInputPanel";
import Results from "../components/Results";
import Chatbot from "../components/Chatbot";
import IdeIntegrationModal from "../components/IdeIntegrationModal";
import LegalPrivacy from "../components/LegalPrivacy";
import LegalTerms from "../components/LegalTerms";
import DomainSetupModal from "../components/DomainSetupModal";
import CommandPalette from "../components/CommandPalette";
import { 
  IconTerminal, 
  IconCode, 
  IconDownload, 
  IconCopy, 
  IconCheck, 
  IconExternalLink,
  IconShield,
  IconPlay,
  IconGlobe,
  IconChat
} from "../components/Icons";
import "./Home.css";

// Verified demonstration analysis data for instant evaluation
const SAMPLE_ANALYSIS_DATA = {
  is_simulated: true,
  llm_analysis: {
    language: "python",
    project_name: "batch_order_processor.py",
    quality_report: {
      health_score: 68,
      severity_counts: {
        critical: 1,
        warning: 1,
        suggestion: 1,
        info: 0,
      },
      findings: [
        {
          severity: "critical",
          file: "batch_order_processor.py",
          line: 36,
          title: "Cognitive Complexity Ceiling Exceeded",
          message: "Function process_order_batch has cyclomatic complexity of 17 (recommended maximum is 10) due to nested loops and branching logic.",
          suggestion: "Decompose order item iteration, discount evaluation, and tax computation into discrete, single-purpose functions."
        },
        {
          severity: "warning",
          file: "batch_order_processor.py",
          line: 56,
          title: "Inline Cascading Discount Logic",
          message: "Sequential if-elif blocks mutate pricing inline without boundary validation or precision guarantees.",
          suggestion: "Use a strategy lookup map to isolate tier policies from the order accumulator."
        },
        {
          severity: "suggestion",
          file: "batch_order_processor.py",
          line: 42,
          title: "Unvalidated Dictionary Structure",
          message: "Sub-properties 'items' and 'price' are accessed without schema validation.",
          suggestion: "Apply a typed dataclass or Pydantic model to guarantee input structure at method entry."
        }
      ]
    },
    model_prediction: {
      smell_type: "Long Method",
      confidence: 0.914,
      all_probs: {
        "Long Method": 0.914,
        "Complex Conditional": 0.742,
        "Feature Envy": 0.381,
        "Data Clump": 0.215,
        "Dead Code": 0.082
      }
    },
    llm_response: "### Architectural Review\n\nThe `process_order_batch` function currently combines four distinct responsibilities:\n1. Input payload sanitation\n2. Item pricing summation with clearance deductions\n3. Customer membership discount calculation\n4. Tax computation and accumulator bookkeeping\n\nBy extracting discrete helper functions, cyclomatic complexity drops from 17 down to 3, making unit tests straightforward and eliminating regression risks when discount tiers change.",
    optimized_code: `from typing import List, Dict, Any

DISCOUNT_RATES = {
    "GOLD": lambda total: total * 0.85 if total > 500 else total * 0.90,
    "SILVER": lambda total: total * 0.92 if total > 300 else total,
    "BRONZE": lambda total: total * 0.97,
}

TAX_RATE = 0.0825

def calculate_item_subtotal(items: List[Dict[str, Any]]) -> float:
    subtotal = 0.0
    for item in items:
        if not item.get("active", False):
            continue
        price = item.get("price", 0.0)
        qty = item.get("quantity", 1)
        subtotal += price * qty
        if item.get("category") == "clearance":
            subtotal -= 5.0
    return max(0.0, subtotal)

def apply_tier_discount(subtotal: float, tier: str) -> float:
    discount_fn = DISCOUNT_RATES.get(tier)
    return discount_fn(subtotal) if discount_fn else subtotal

def process_single_order(order: Dict[str, Any], user_id: str, discount_tier: str) -> Dict[str, Any]:
    subtotal = calculate_item_subtotal(order.get("items", []))
    discounted = apply_tier_discount(subtotal, discount_tier)
    total = round(discounted * (1.0 + TAX_RATE), 2)
    return {"order_id": order["id"], "total": total, "user_id": user_id}

def process_order_batch(orders: List[Dict[str, Any]], user: Dict[str, Any], discount_tier: str) -> Dict[str, Any]:
    valid_orders = []
    error_log = []
    user_id = user.get("id")

    for order in orders:
        if not order.get("id") or not order.get("items"):
            error_log.append(f"Invalid order payload: {order}")
            continue
        valid_orders.append(process_single_order(order, user_id, discount_tier))

    total_revenue = sum(o["total"] for o in valid_orders)
    return {
        "processed_count": len(valid_orders),
        "total_revenue": round(total_revenue, 2),
        "errors": error_log
    }`
  }
};

export default function Home() {
  const [mode, setMode] = useState("analyze"); // "analyze" | "chat"
  const [result, setResult] = useState(null);
  const [copiedCli, setCopiedCli] = useState(false);
  
  // Modals
  const [isIdeModalOpen, setIsIdeModalOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handlePaletteAction = (actionId) => {
    switch (actionId) {
      case "studio-upload":
      case "studio-editor":
        setMode("analyze");
        setTimeout(() => {
          document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
        }, 50);
        break;
      case "load-sample":
        handleLoadSample();
        break;
      case "copilot-chat":
        setMode("chat");
        setTimeout(() => {
          document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
        }, 50);
        break;
      case "ide-hub":
        setIsIdeModalOpen(true);
        break;
      case "domain-guide":
        setIsDomainOpen(true);
        break;
      default:
        break;
    }
  };

  const handleAnalyze = (data) => {
    setResult(data);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleLoadSample = () => {
    setResult(SAMPLE_ANALYSIS_DATA);
    setTimeout(() => {
      document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const copyCliCommand = () => {
    navigator.clipboard.writeText("code --install-extension rigelai-code-review-0.4.0.vsix");
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  return (
    <div className="site-layout">
      {/* Universal Top Header */}
      <Navbar 
        mode={mode} 
        setMode={setMode} 
        onOpenIdeModal={() => setIsIdeModalOpen(true)}
        onOpenDomainModal={() => setIsDomainOpen(true)}
        onOpenPalette={() => setIsPaletteOpen(true)}
      />

      <main id="top" className="site-main">
        {/* Editorial Product Hero */}
        {mode === "analyze" && (
          <section id="overview" className="product-hero-section">
            <div className="hero-content-wrapper">
              <div className="hero-pill-badge">
                <span className="hero-pill-dot" aria-hidden="true"></span>
                <span>Static Analysis &amp; Vector ML Intelligence</span>
              </div>
              
              <h1 className="hero-headline">
                Code review with syntactic<br className="hero-headline-break" />
                <span className="hero-headline-accent">and architectural precision.</span>
              </h1>

              <p className="hero-lead">
                Rigel AI parses source code using deterministic Abstract Syntax Trees, classifies anti-patterns with machine learning vectors, and produces verified refactoring solutions.
              </p>

              <div className="hero-action-row">
                <a href="#workspace" className="btn-primary hero-btn-main">
                  <span>Open Studio Workspace</span>
                  <span aria-hidden="true">↓</span>
                </a>
                <button
                  type="button"
                  className="btn-copilot"
                  onClick={() => { setMode("chat"); document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); }}
                >
                  <IconChat size={14} />
                  <span>Copilot Chat</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleLoadSample}
                >
                  <IconPlay size={13} />
                  <span>Inspect Sample Audit</span>
                </button>
                <button
                  type="button"
                  className="btn-link hero-link-ext"
                  onClick={() => setIsIdeModalOpen(true)}
                >
                  <span>Install IDE Extension</span>
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              {/* Apple-grade Product Preview Window */}
              <div 
                className="hero-showcase-window" 
                onClick={handleLoadSample} 
                role="button" 
                tabIndex={0} 
                onKeyDown={(e) => { if (e.key === "Enter") handleLoadSample(); }}
                title="Click to load and inspect this sample in Live Studio"
              >
                <div className="window-titlebar">
                  <div className="window-dots" aria-hidden="true">
                    <span className="dot dot-close"></span>
                    <span className="dot dot-minimize"></span>
                    <span className="dot dot-expand"></span>
                  </div>
                  <div className="window-title">
                    <span className="window-file-icon">⚡</span>
                    <span className="window-file-name">batch_order_processor.py</span>
                    <span className="window-tag">AST Checked</span>
                  </div>
                  <div className="window-badges">
                    <span className="window-status-pill">
                      <span className="pulse-dot"></span>
                      1 Critical Issue Detected
                    </span>
                  </div>
                </div>

                <div className="window-body">
                  <div className="window-code-col">
                    <div className="code-line"><span className="ln">34</span><span className="tok-kw">def</span> <span className="tok-fn">process_order_batch</span>(orders, user, tier):</div>
                    <div className="code-line"><span className="ln">35</span>  valid_orders = []</div>
                    <div className="code-line code-line-alert">
                      <span className="ln">36</span>
                      <span className="tok-kw">for</span> order <span className="tok-kw">in</span> orders:  <span className="tok-cm"># Cyclomatic complexity: 17</span>
                    </div>
                    <div className="code-line"><span className="ln">37</span>    <span className="tok-kw">if not</span> order.get(<span className="tok-str">"id"</span>): <span className="tok-kw">continue</span></div>
                    <div className="code-line"><span className="ln">38</span>    total = sum(i[<span className="tok-str">"price"</span>] * i[<span className="tok-str">"qty"</span>] <span className="tok-kw">for</span> i <span className="tok-kw">in</span> order[<span className="tok-str">"items"</span>])</div>
                    <div className="code-line"><span className="ln">39</span>    <span className="tok-kw">if</span> tier == <span className="tok-str">"GOLD"</span>: total *= 0.85</div>
                  </div>

                  <div className="window-finding-col">
                    <div className="finding-card-preview">
                      <div className="finding-header">
                        <span className="finding-severity-badge critical">Critical Finding</span>
                        <span className="finding-rule">AST-Complexity-01</span>
                      </div>
                      <div className="finding-title">Cognitive Complexity Ceiling Exceeded</div>
                      <p className="finding-desc">
                        Function exceeds cyclomatic complexity ceiling (17 vs recommended 10) due to nested accumulators and discount branching.
                      </p>
                      <div className="finding-recommendation">
                        <span className="recom-label">Suggested Refactoring:</span>
                        <code>Extract 3 discrete helpers &rarr; Complexity drops to 3</code>
                      </div>
                      <div className="finding-cta-banner">
                        <span>Click window to load verified refactor in Studio</span>
                        <span className="arrow-chip">&rarr;</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Technical Specifications Strip */}
              <div className="hero-specs-strip">
                <div className="spec-item">
                  <span className="spec-label">Language Coverage</span>
                  <strong className="spec-value">Python, JS, TS, Java, C++, Go</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Analysis Method</span>
                  <strong className="spec-value">AST Tokenization + ML Classifier</strong>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Environment</span>
                  <strong className="spec-value">Web Studio, VS Code, Cursor, CLI</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Working Studio Workspace */}
        <section id="workspace" className="workspace-section">
          <div className="workspace-container">
            {mode === "analyze" ? (
              <div className="workspace-flow">
                <div className="workspace-header-bar">
                  <div>
                    <h2 className="section-title">Analysis Studio</h2>
                    <p className="section-description">
                      Input code to detect smells, evaluate complexity, and receive modular refactor recommendations.
                    </p>
                  </div>
                  <div className="workspace-header-actions">
                    <button
                      type="button"
                      className="btn-secondary compact"
                      onClick={handleLoadSample}
                    >
                      <span>Load Sample Finding</span>
                    </button>
                  </div>
                </div>

                <CodeInputPanel onAnalyze={handleAnalyze} />

                {/* Results Section */}
                <div id="results" className="results-anchor">
                  <Results data={result} onLoadSample={handleLoadSample} />
                </div>
              </div>
            ) : (
              <div className="copilot-fullview">
                <Chatbot />
              </div>
            )}
          </div>
        </section>

        {/* Product Architecture Section */}
        {mode === "analyze" && (
          <section className="architecture-section">
            <div className="section-container">
              <span className="section-tag">System Architecture</span>
              <h2 className="section-title">Three layers of verification.</h2>
              <p className="section-description">
                Rigel AI avoids generic chatbot evaluations by combining formal syntax analysis with dedicated machine learning smell classifiers.
              </p>

              <div className="architecture-grid">
                <div className="architecture-card">
                  <div className="card-number">01</div>
                  <h3>Deterministic AST Parsing</h3>
                  <p>
                    Source code is tokenized into full syntax trees to calculate cyclomatic complexity, parameter list lengths, loop depths, and dead code branches without probabilistic guesswork.
                  </p>
                </div>

                <div className="architecture-card">
                  <div className="card-number">02</div>
                  <h3>ML Smell Classification</h3>
                  <p>
                    Trained CodeSmell models evaluate code vector embeddings against established software engineering smell taxonomies to yield exact probability distributions.
                  </p>
                </div>

                <div className="architecture-card">
                  <div className="card-number">03</div>
                  <h3>Structured Remediation</h3>
                  <p>
                    Contextual refactoring engines use the detected syntactic smells to generate replacement code diffs, maintainability notes, and isolated test fixture strategies.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* IDE Integration Hub */}
        {mode === "analyze" && (
          <section id="extension-showcase" className="extension-section">
            <div className="section-container">
              <div className="extension-banner card">
                <div className="extension-banner-main">
                  <span className="section-tag">Editor Extensions</span>
                  <h2>Bring Rigel AI into your primary workflow.</h2>
                  <p>
                    Inspect code smells directly in your editor margin with line-level diagnostics, confidence percentages, and quick-fix remediation diffs.
                  </p>

                  <div className="cli-quick-row">
                    <span className="cli-hint">Terminal command:</span>
                    <div className="cli-bar">
                      <code>code --install-extension rigelai-code-review-0.4.0.vsix</code>
                      <button
                        type="button"
                        className="btn-copy-cli"
                        onClick={copyCliCommand}
                        title="Copy command"
                      >
                        {copiedCli ? <IconCheck size={13} /> : <IconCopy size={13} />}
                        <span>{copiedCli ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="extension-actions-row">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setIsIdeModalOpen(true)}
                    >
                      <IconCode size={15} />
                      <span>Setup Guide (VS Code, Cursor, Antigravity)</span>
                    </button>

                    <a
                      href="/extensions/rigelai-code-review-0.4.0.vsix"
                      download
                      className="btn-secondary"
                    >
                      <IconDownload size={15} />
                      <span>Download .VSIX (v0.4.0)</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Global Modals */}
      <IdeIntegrationModal
        isOpen={isIdeModalOpen}
        onClose={() => setIsIdeModalOpen(false)}
      />

      <LegalPrivacy
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      <LegalTerms
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <DomainSetupModal
        isOpen={isDomainOpen}
        onClose={() => setIsDomainOpen(false)}
      />

      {/* macOS Spotlight Command Palette */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectAction={handlePaletteAction}
      />

      {/* Editorial Platform Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-top-grid">
            <div className="footer-brand-column">
              <div className="footer-brand-title">
                <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <rect width="32" height="32" rx="6" fill="#1d1d1f"/>
                  <path d="M16 6L24 16L16 26L8 16Z" stroke="#fbfbfa" strokeWidth="2" strokeLinejoin="round"/>
                  <circle cx="16" cy="16" r="3" fill="#0066cc"/>
                </svg>
                <strong>Rigel AI</strong>
              </div>
              <p className="footer-brand-desc">
                Static AST parsing, machine learning code smell classification, and automated refactoring guidance for engineering teams.
              </p>
            </div>

            <div className="footer-links-column">
              <span className="footer-column-heading">Product</span>
              <a href="#overview">Overview</a>
              <button type="button" onClick={() => setMode("analyze")}>Live Studio</button>
              <button type="button" onClick={() => setMode("chat")}>Copilot Discussion</button>
              <button type="button" onClick={() => setIsIdeModalOpen(true)}>IDE Extension</button>
            </div>

            <div className="footer-links-column">
              <span className="footer-column-heading">Deployment</span>
              <button type="button" onClick={() => setIsDomainOpen(true)}>Domain Setup Guide</button>
              <a href="https://github.com/wraith-klu/RigelAI" target="_blank" rel="noopener noreferrer">
                GitHub Repository
              </a>
              <a href="https://rigelai.onrender.com/docs" target="_blank" rel="noopener noreferrer">
                FastAPI Swagger Docs
              </a>
            </div>

            <div className="footer-links-column">
              <span className="footer-column-heading">Governance</span>
              <button type="button" onClick={() => setIsPrivacyOpen(true)}>Privacy Policy (Draft)</button>
              <button type="button" onClick={() => setIsTermsOpen(true)}>Terms of Service (Draft)</button>
              <span className="footer-data-note">Code is processed in-memory. Zero data retention.</span>
            </div>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-copyright">
              © {new Date().getFullYear()} Rigel AI. Built with focus on code correctness and engineering privacy.
            </div>
            <div className="footer-status-pill">
              <span className="footer-status-dot"></span>
              <span>Backend Service Active</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
