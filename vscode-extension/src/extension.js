// RigelAI VS Code Extension — Inline Diagnostics + Review Panel
// v0.3.0 — Seamless red-underlines, hover tooltips, code actions, premium side panel

"use strict";
const vscode = require("vscode");

// ─── Constants ────────────────────────────────────────────────────────────────
const WEBSITE_URL = "https://rigelai-agent.vercel.app";
const DEFAULT_API_URL = "https://rigelai.onrender.com";
const SUPPORTED_LANGUAGES = [
  "python", "javascript", "typescript", "java", "c", "cpp",
  "go", "rust", "php", "ruby", "csharp", "kotlin", "swift",
  "html", "css", "json", "yaml", "markdown", "plaintext",
];

// ─── State ────────────────────────────────────────────────────────────────────
/** @type {vscode.DiagnosticCollection} */
let diagnosticCollection;
/** @type {Map<string, object>} Maps document URI → last review result */
const reviewCache = new Map();
/** @type {Map<string, NodeJS.Timeout>} debounce timers per URI */
const debounceTimers = new Map();
/** @type {RigelAIPanelProvider | null} */
let panelProvider = null;

// ─── Activation ──────────────────────────────────────────────────────────────
function activate(context) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("rigelai");
  context.subscriptions.push(diagnosticCollection);

  // Register sidebar WebviewView provider
  panelProvider = new RigelAIPanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("rigelai.panel", panelProvider, {
      webviewOptions: { retainContextWhenHidden: true },
    })
  );

  // Register hover provider for ALL supported languages
  const hoverProvider = vscode.languages.registerHoverProvider(
    SUPPORTED_LANGUAGES.map((lang) => ({ language: lang })),
    { provideHover: provideRigelHover }
  );
  context.subscriptions.push(hoverProvider);

  // Register code-action (lightbulb) provider
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    SUPPORTED_LANGUAGES.map((lang) => ({ language: lang })),
    { provideCodeActions: provideRigelCodeActions },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
  );
  context.subscriptions.push(codeActionProvider);

  // Auto-analyze on save (debounced)
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      const cfg = vscode.workspace.getConfiguration("rigelai");
      if (!cfg.get("autoAnalyzeOnSave", true)) return;
      scheduleAnalysis(doc);
    })
  );

  // Auto-analyze when switching to a new document that has no cached review
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) return;
      const key = editor.document.uri.toString();
      if (reviewCache.has(key)) {
        panelProvider?.update(reviewCache.get(key));
      }
    })
  );

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("rigelai.analyzeCurrentFile", () =>
      analyzeEditorContent("file")
    ),
    vscode.commands.registerCommand("rigelai.analyzeSelection", () =>
      analyzeEditorContent("selection")
    ),
    vscode.commands.registerCommand("rigelai.generateCorrectedCode", () =>
      analyzeEditorContent("correct")
    ),
    vscode.commands.registerCommand("rigelai.clearDiagnostics", () => {
      diagnosticCollection.clear();
      reviewCache.clear();
      panelProvider?.showWelcome();
      vscode.window.showInformationMessage("RigelAI diagnostics cleared.");
    }),
    vscode.commands.registerCommand("rigelai.openSettings", () =>
      vscode.commands.executeCommand("workbench.action.openSettings", "rigelai")
    ),
    vscode.commands.registerCommand("rigelai.openWebsite", () =>
      vscode.env.openExternal(vscode.Uri.parse(WEBSITE_URL))
    ),
    vscode.commands.registerCommand("rigelai._applyFix", (uri, code) =>
      applyFixFromCommand(uri, code)
    ),
    vscode.window.registerUriHandler({
      async handleUri(uri) {
        const params = new URLSearchParams(uri.query);
        const apiUrl = params.get("apiUrl");
        if (apiUrl) {
          await vscode.workspace
            .getConfiguration("rigelai")
            .update("apiUrl", apiUrl, vscode.ConfigurationTarget.Global);
        }
        vscode.window.showInformationMessage(
          `RigelAI connected${apiUrl ? ` to ${apiUrl}` : ""}. Save a file or run "RigelAI: Analyze Current File" to start.`
        );
      },
    })
  );
}

// ─── Debounced Analysis Scheduler ────────────────────────────────────────────
function scheduleAnalysis(document) {
  const key = document.uri.toString();
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }
  const delay = vscode.workspace
    .getConfiguration("rigelai")
    .get("autoAnalyzeDelay", 1500);

  debounceTimers.set(
    key,
    setTimeout(async () => {
      debounceTimers.delete(key);
      await runAnalysis(document, "file", false);
    }, delay)
  );
}

// ─── Core Analysis ───────────────────────────────────────────────────────────
async function analyzeEditorContent(mode) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Open a code file before running RigelAI.");
    return;
  }
  await runAnalysis(editor.document, mode, true);
}

async function runAnalysis(document, mode, withProgress) {
  const code = document.getText();
  if (!code.trim()) return;

  const apiUrl = getApiUrl();
  const language = document.languageId || "plaintext";

  const doRun = async () => {
    try {
      const query = buildQuery(mode, false, language);
      const result = await callRigelAI(apiUrl, code, query);
      const cacheEntry = {
        result,
        uri: document.uri.toString(),
        fileName: document.fileName,
        language,
        mode,
        version: document.version,
        optimizedCode: String(result?.llm_analysis?.optimized_code || ""),
        code,
      };
      reviewCache.set(document.uri.toString(), cacheEntry);
      applyDiagnostics(document, result);
      panelProvider?.update(cacheEntry);
    } catch (error) {
      vscode.window.showErrorMessage(
        `RigelAI analysis failed: ${error.message || "Unknown error"}`
      );
    }
  };

  if (withProgress) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "RigelAI is analyzing your code…",
        cancellable: false,
      },
      doRun
    );
  } else {
    // Silent background analysis — show status bar flash instead
    const statusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    statusItem.text = "$(sync~spin) RigelAI analyzing…";
    statusItem.show();
    try {
      await doRun();
    } finally {
      statusItem.dispose();
    }
  }
}

// ─── Diagnostics ─────────────────────────────────────────────────────────────
function applyDiagnostics(document, result) {
  const report = result?.llm_analysis?.quality_report || {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const diagnostics = [];

  for (const finding of findings) {
    const lineIndex = finding.line != null ? Math.max(0, Number(finding.line) - 1) : 0;
    const safeLine = Math.min(lineIndex, document.lineCount - 1);
    const lineText = document.lineAt(safeLine).text;
    const startChar = lineText.search(/\S/);
    const range = new vscode.Range(
      safeLine,
      startChar < 0 ? 0 : startChar,
      safeLine,
      lineText.length
    );

    const severity = toVscodeSeverity(finding.severity);
    const diag = new vscode.Diagnostic(
      range,
      `[RigelAI] ${finding.title || "Issue"}: ${finding.message || ""}`,
      severity
    );
    diag.source = "RigelAI";
    diag.code = finding.severity || "info";

    // Attach the full finding as related info for hover provider
    if (finding.suggestion) {
      diag.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          `💡 Suggestion: ${finding.suggestion}`
        ),
      ];
    }
    // Store finding data on the diagnostic for code actions
    diag._finding = finding;
    diagnostics.push(diag);
  }

  diagnosticCollection.set(document.uri, diagnostics);
}

function toVscodeSeverity(severity) {
  switch ((severity || "").toLowerCase()) {
    case "critical":
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "warning":
      return vscode.DiagnosticSeverity.Warning;
    case "suggestion":
      return vscode.DiagnosticSeverity.Hint;
    default:
      return vscode.DiagnosticSeverity.Information;
  }
}

// ─── Hover Provider ──────────────────────────────────────────────────────────
function provideRigelHover(document, position) {
  const diags = diagnosticCollection.get(document.uri) || [];
  const hit = diags.find((d) => d.range.contains(position));
  if (!hit) return null;

  const finding = hit._finding || {};
  const md = new vscode.MarkdownString("", true);
  md.isTrusted = true;
  md.supportHtml = true;

  const severityIcon = {
    critical: "🔴",
    error: "🔴",
    warning: "🟡",
    suggestion: "🔵",
    info: "⚪",
  }[(finding.severity || "info").toLowerCase()] || "⚪";

  md.appendMarkdown(`### ${severityIcon} RigelAI — ${escapeHtml(finding.title || "Issue")}\n\n`);
  md.appendMarkdown(`${escapeHtml(finding.message || "")}\n\n`);

  if (finding.suggestion) {
    md.appendMarkdown(`---\n**💡 Fix:** ${escapeHtml(finding.suggestion)}\n\n`);
  }

  const uri = document.uri.toString();
  const cached = reviewCache.get(uri);
  if (cached?.optimizedCode) {
    const commandUri = vscode.Uri.parse(
      `command:rigelai.analyzeCurrentFile`
    );
    md.appendMarkdown(
      `[$(sparkle) Open Review Panel](${commandUri}) · [$(symbol-file) Apply Corrected Code](command:rigelai._applyFix?${encodeURIComponent(JSON.stringify([uri, cached.optimizedCode]))})`
    );
  }

  return new vscode.Hover(md, hit.range);
}

// ─── Code Action Provider ─────────────────────────────────────────────────────
function provideRigelCodeActions(document, range) {
  const diags = (diagnosticCollection.get(document.uri) || []).filter((d) =>
    d.range.intersection(range)
  );
  if (!diags.length) return [];

  const actions = [];
  const cached = reviewCache.get(document.uri.toString());

  for (const diag of diags) {
    const finding = diag._finding || {};

    // "Open RigelAI Panel" action always available
    const openPanel = new vscode.CodeAction(
      `RigelAI: View Full Review`,
      vscode.CodeActionKind.QuickFix
    );
    openPanel.command = {
      command: "rigelai.analyzeCurrentFile",
      title: "Open RigelAI Review Panel",
    };
    openPanel.diagnostics = [diag];
    openPanel.isPreferred = false;
    actions.push(openPanel);

    // "Apply corrected code" action when optimized code available
    if (cached?.optimizedCode) {
      const applyFix = new vscode.CodeAction(
        `RigelAI: Apply AI-Corrected Code for "${finding.title || "this issue"}"`,
        vscode.CodeActionKind.QuickFix
      );
      applyFix.command = {
        command: "rigelai._applyFix",
        title: "Apply RigelAI Fix",
        arguments: [document.uri.toString(), cached.optimizedCode],
      };
      applyFix.diagnostics = [diag];
      applyFix.isPreferred = true;
      actions.push(applyFix);
    }

    // "Re-analyze" action
    const reAnalyze = new vscode.CodeAction(
      "RigelAI: Re-analyze This File",
      vscode.CodeActionKind.QuickFix
    );
    reAnalyze.command = {
      command: "rigelai.generateCorrectedCode",
      title: "Re-analyze with RigelAI",
    };
    reAnalyze.diagnostics = [diag];
    actions.push(reAnalyze);
  }

  return actions;
}

// ─── Apply Fix ───────────────────────────────────────────────────────────────
async function applyFixFromCommand(uriString, code) {
  if (!code?.trim()) {
    vscode.window.showWarningMessage("RigelAI did not return corrected code.");
    return;
  }
  try {
    const uri = vscode.Uri.parse(uriString);
    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    const fullRange = fullDocumentRange(document);
    const applied = await editor.edit((eb) => eb.replace(fullRange, code));
    if (applied) {
      diagnosticCollection.delete(uri);
      reviewCache.delete(uriString);
      vscode.window.showInformationMessage("✅ RigelAI corrected code applied.");
    }
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to apply fix: ${err.message}`);
  }
}

// ─── API ─────────────────────────────────────────────────────────────────────
function getApiUrl() {
  const configured = vscode.workspace.getConfiguration("rigelai").get("apiUrl");
  return String(configured || DEFAULT_API_URL).replace(/\/$/, "");
}

async function callRigelAI(apiUrl, code, userQuery) {
  const response = await fetch(`${apiUrl}/analyze-editor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user_query: userQuery || "" }),
  });
  if (!response.ok) {
    let detail = "";
    try { detail = await response.text(); } catch { detail = ""; }
    throw new Error(`Backend returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return response.json();
}

function buildQuery(mode, isSelection, language) {
  const scope = isSelection ? "selected code" : "entire file";
  if (mode === "correct") {
    return `Review this ${language} ${scope}, list every issue with line numbers, severity (critical/warning/suggestion/info), and a brief fix suggestion. Then generate a fully corrected runnable version.`;
  }
  return `Analyze this ${language} ${scope} for bugs, code smells, complexity, and refactoring opportunities. For every issue include: title, message, line number, severity (critical/warning/suggestion/info), and a fix suggestion. Also generate corrected code.`;
}

// ─── Sidebar WebviewView Provider ────────────────────────────────────────────
class RigelAIPanelProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri;
    this._view = null;
    this._pendingUpdate = null;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = this._pendingUpdate
      ? renderPanel(this._pendingUpdate)
      : renderWelcome();
    this._pendingUpdate = null;

    webviewView.webview.onDidReceiveMessage((msg) =>
      this._handleMessage(msg)
    );
  }

  update(review) {
    if (this._view) {
      this._view.webview.html = renderPanel(review);
    } else {
      this._pendingUpdate = review;
    }
  }

  showWelcome() {
    if (this._view) {
      this._view.webview.html = renderWelcome();
    }
  }

  async _handleMessage(message) {
    const cached = reviewCache.get(message?.uri || "");
    switch (message?.command) {
      case "applyCorrectedCode":
        if (cached) await applyFixFromCommand(cached.uri, cached.optimizedCode);
        break;
      case "copyCorrectedCode":
        if (cached?.optimizedCode) {
          await vscode.env.clipboard.writeText(cached.optimizedCode);
          vscode.window.showInformationMessage("Corrected code copied to clipboard.");
        }
        break;
      case "previewCorrectedCode":
        if (cached?.optimizedCode) {
          const preview = await vscode.workspace.openTextDocument({
            content: cached.optimizedCode,
            language: cached.language,
          });
          await vscode.window.showTextDocument(preview, vscode.ViewColumn.Beside);
        }
        break;
      case "reanalyze":
        await analyzeEditorContent("file");
        break;
      case "openFile":
        if (message.uri) {
          const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(message.uri));
          await vscode.window.showTextDocument(doc);
        }
        break;
      default:
        break;
    }
  }
}

// ─── Panel HTML — Welcome ─────────────────────────────────────────────────────
function renderWelcome() {
  const nonce = getNonce();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  ${panelStyles()}
</head>
<body>
  <div class="welcome">
    <div class="logo-wrap">
      <div class="logo-ring">
        <span class="logo-icon">✦</span>
      </div>
    </div>
    <h1 class="brand">RigelAI</h1>
    <p class="tagline">AI-powered code review, right in your editor.</p>
    <div class="tip-list">
      <div class="tip"><span class="tip-icon">💾</span><span>Save a file to auto-analyze</span></div>
      <div class="tip"><span class="tip-icon">🖱️</span><span>Right-click → RigelAI: Analyze</span></div>
      <div class="tip"><span class="tip-icon">🔴</span><span>Hover red underlines for details</span></div>
      <div class="tip"><span class="tip-icon">💡</span><span>Lightbulb → Apply AI fix</span></div>
    </div>
    <button id="btn-analyze" class="btn-primary" data-command="reanalyze">
      <span>⚡</span> Analyze Current File
    </button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.getElementById('btn-analyze').addEventListener('click', () => {
      vscode.postMessage({ command: 'reanalyze' });
    });
  </script>
</body>
</html>`;
}

// ─── Panel HTML — Results ─────────────────────────────────────────────────────
function renderPanel(review) {
  const nonce = getNonce();
  const data = review.result;
  const llm = data?.llm_analysis || {};
  const report = llm.quality_report || {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const fixes = Array.isArray(report.fix_suggestions) ? report.fix_suggestions : [];
  const severityCounts = report.severity_counts || {};
  const optimizedCode = review.optimizedCode || "";
  const healthScore = typeof report.health_score === "number" ? report.health_score : null;
  const scoreColor = healthScore == null ? "#888"
    : healthScore >= 80 ? "#4ade80"
    : healthScore >= 50 ? "#facc15"
    : "#f87171";
  const llmNotes = String(llm.llm_response || "").trim();
  const fileName = review.fileName
    ? review.fileName.replace(/\\/g, "/").split("/").pop()
    : "unknown";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  ${panelStyles()}
  <style>
    .score-ring {
      width: 72px; height: 72px;
      border-radius: 50%;
      border: 4px solid ${scoreColor};
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 700;
      color: ${scoreColor};
      box-shadow: 0 0 16px ${scoreColor}44;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="panel-header">
    <div class="header-left">
      <div class="brand-row">
        <span class="brand-icon">✦</span>
        <span class="brand-name">RigelAI</span>
      </div>
      <div class="file-name" title="${escapeHtml(review.fileName || "")}">${escapeHtml(fileName)}</div>
    </div>
    ${healthScore != null ? `<div class="score-ring" title="Health Score">${healthScore}</div>` : ""}
  </div>

  <!-- Action buttons -->
  <div class="action-row">
    <button class="btn-primary" data-command="applyCorrectedCode" ${optimizedCode ? "" : "disabled"}>
      ✅ Apply Fix
    </button>
    <button class="btn-secondary" data-command="previewCorrectedCode" ${optimizedCode ? "" : "disabled"}>
      👁 Preview
    </button>
    <button class="btn-secondary" data-command="copyCorrectedCode" ${optimizedCode ? "" : "disabled"}>
      📋 Copy
    </button>
    <button class="btn-ghost" data-command="reanalyze">
      ↺ Re-run
    </button>
  </div>

  <!-- Severity grid -->
  <div class="severity-grid">
    <div class="sev-card critical">
      <div class="sev-num">${severityCounts.critical || 0}</div>
      <div class="sev-label">Critical</div>
    </div>
    <div class="sev-card warning">
      <div class="sev-num">${severityCounts.warning || 0}</div>
      <div class="sev-label">Warnings</div>
    </div>
    <div class="sev-card suggestion">
      <div class="sev-num">${severityCounts.suggestion || 0}</div>
      <div class="sev-label">Suggestions</div>
    </div>
    <div class="sev-card info">
      <div class="sev-num">${severityCounts.info || 0}</div>
      <div class="sev-label">Info</div>
    </div>
  </div>

  <!-- Findings -->
  <section class="section">
    <div class="section-header">
      <span class="section-title">🔍 Findings</span>
      <span class="section-count">${findings.length}</span>
    </div>
    <div class="findings-list">
      ${findings.length
        ? findings.map(renderFindingCard).join("")
        : `<div class="empty-state">✅ No issues found — great code!</div>`}
    </div>
  </section>

  <!-- Fix Suggestions -->
  ${fixes.length ? `
  <section class="section">
    <div class="section-header">
      <span class="section-title">💡 Fix Suggestions</span>
      <span class="section-count">${fixes.length}</span>
    </div>
    <div class="findings-list">
      ${fixes.map(renderFixCard).join("")}
    </div>
  </section>` : ""}

  <!-- AI Notes -->
  ${llmNotes ? `
  <section class="section">
    <div class="section-header">
      <span class="section-title">🤖 AI Review Notes</span>
    </div>
    <div class="ai-notes">${escapeHtml(llmNotes)}</div>
  </section>` : ""}

  <!-- Corrected Code -->
  <section class="section">
    <div class="section-header">
      <span class="section-title">⚡ Corrected Code</span>
      ${optimizedCode ? `<button class="btn-ghost inline-copy" data-command="copyCorrectedCode">Copy</button>` : ""}
    </div>
    ${optimizedCode
      ? `<pre class="code-block"><code>${escapeHtml(optimizedCode)}</code></pre>`
      : `<div class="empty-state">No corrected code was generated. Run "Generate Corrected Code" for a full fix.</div>`}
  </section>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const uri = ${JSON.stringify(review.uri || "")};

    document.querySelectorAll('[data-command]').forEach(el => {
      el.addEventListener('click', () => {
        vscode.postMessage({ command: el.dataset.command, uri });
      });
    });

    // Accordion expand/collapse
    document.querySelectorAll('.finding-header').forEach(header => {
      header.addEventListener('click', () => {
        const card = header.closest('.finding-card');
        card.classList.toggle('expanded');
      });
    });
  </script>
</body>
</html>`;
}

// ─── Finding / Fix Card Renderers ─────────────────────────────────────────────
function renderFindingCard(finding) {
  const sev = (finding.severity || "info").toLowerCase();
  const icon = { critical: "🔴", warning: "🟡", suggestion: "🔵", info: "⚪" }[sev] || "⚪";
  const line = finding.line ? `Line ${finding.line}` : "";
  return `
<div class="finding-card ${sev}">
  <div class="finding-header">
    <div class="finding-meta">
      <span class="sev-badge ${sev}">${icon} ${escapeHtml(sev)}</span>
      ${line ? `<span class="line-badge">⌗ ${escapeHtml(line)}</span>` : ""}
    </div>
    <div class="finding-title">${escapeHtml(finding.title || "Issue")}</div>
    <span class="expand-icon">›</span>
  </div>
  <div class="finding-body">
    <p class="finding-message">${escapeHtml(finding.message || "")}</p>
    ${finding.suggestion
      ? `<div class="suggestion-box">
          <span class="suggestion-label">💡 Suggested Fix</span>
          <p>${escapeHtml(finding.suggestion)}</p>
        </div>`
      : ""}
  </div>
</div>`;
}

function renderFixCard(fix) {
  const sev = (fix.severity || "suggestion").toLowerCase();
  return `
<div class="finding-card ${sev}">
  <div class="finding-header">
    <div class="finding-meta">
      <span class="sev-badge ${sev}">💡 ${escapeHtml(sev)}</span>
      ${fix.line ? `<span class="line-badge">⌗ Line ${fix.line}</span>` : ""}
    </div>
    <div class="finding-title">${escapeHtml(fix.title || "Fix")}</div>
    <span class="expand-icon">›</span>
  </div>
  <div class="finding-body">
    <p class="finding-message">${escapeHtml(fix.recommendation || "")}</p>
  </div>
</div>`;
}

// ─── Shared Panel Styles ──────────────────────────────────────────────────────
function panelStyles() {
  return `<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
    font-size: 13px;
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background, #1e1e2e);
    padding: 12px;
    line-height: 1.5;
  }

  /* ── Welcome ── */
  .welcome {
    display: flex; flex-direction: column; align-items: center;
    padding: 32px 16px; gap: 14px; text-align: center;
  }
  .logo-wrap { margin-bottom: 4px; }
  .logo-ring {
    width: 64px; height: 64px; border-radius: 50%;
    border: 2px solid var(--vscode-button-background, #7c3aed);
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1e1e2e, #312e55);
    box-shadow: 0 0 24px #7c3aed44;
  }
  .logo-icon { font-size: 28px; }
  .brand { font-size: 22px; font-weight: 700; letter-spacing: 1px; }
  .tagline { color: var(--vscode-descriptionForeground); font-size: 12px; max-width: 220px; }
  .tip-list { display: flex; flex-direction: column; gap: 8px; width: 100%; text-align: left; margin: 8px 0; }
  .tip {
    display: flex; align-items: center; gap: 10px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px; padding: 8px 12px;
    font-size: 12px;
  }
  .tip-icon { font-size: 16px; flex-shrink: 0; }

  /* ── Buttons ── */
  button {
    border: none; border-radius: 6px; cursor: pointer;
    font: inherit; font-weight: 600; font-size: 12px;
    padding: 7px 12px; transition: all 0.15s ease;
    display: inline-flex; align-items: center; gap: 5px;
  }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary {
    background: var(--vscode-button-background, #7c3aed);
    color: var(--vscode-button-foreground, #fff);
    box-shadow: 0 2px 8px #7c3aed33;
  }
  .btn-primary:not(:disabled):hover {
    background: var(--vscode-button-hoverBackground);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px #7c3aed55;
  }
  .btn-secondary {
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-panel-border);
  }
  .btn-secondary:not(:disabled):hover {
    background: var(--vscode-button-secondaryHoverBackground);
  }
  .btn-ghost {
    background: transparent; color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-panel-border);
  }
  .btn-ghost:hover { background: var(--vscode-editor-background); }

  /* ── Panel header ── */
  .panel-header {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }
  .header-left { flex: 1; min-width: 0; }
  .brand-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
  .brand-icon { font-size: 14px; }
  .brand-name { font-weight: 700; font-size: 14px; letter-spacing: 0.5px; }
  .file-name {
    font-size: 11px; color: var(--vscode-descriptionForeground);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* ── Action row ── */
  .action-row {
    display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px;
  }

  /* ── Severity grid ── */
  .severity-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 6px; margin-bottom: 16px;
  }
  .sev-card {
    border-radius: 8px; padding: 8px 6px; text-align: center;
    border: 1px solid var(--vscode-panel-border);
    background: var(--vscode-editor-background);
  }
  .sev-num { font-size: 20px; font-weight: 700; line-height: 1; }
  .sev-label { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
  .sev-card.critical .sev-num { color: #f87171; }
  .sev-card.warning .sev-num  { color: #facc15; }
  .sev-card.suggestion .sev-num { color: #60a5fa; }
  .sev-card.info .sev-num     { color: #a78bfa; }

  /* ── Sections ── */
  .section { margin-bottom: 18px; }
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .section-title { font-weight: 700; font-size: 13px; }
  .section-count {
    background: var(--vscode-badge-background, #7c3aed);
    color: var(--vscode-badge-foreground, #fff);
    border-radius: 999px; font-size: 10px; font-weight: 700;
    padding: 1px 7px;
  }

  /* ── Finding cards (accordion) ── */
  .findings-list { display: flex; flex-direction: column; gap: 6px; }
  .finding-card {
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px;
    background: var(--vscode-editor-background);
    overflow: hidden;
    border-left: 3px solid var(--vscode-panel-border);
    transition: border-color 0.15s;
  }
  .finding-card.critical { border-left-color: #f87171; }
  .finding-card.warning  { border-left-color: #facc15; }
  .finding-card.suggestion { border-left-color: #60a5fa; }
  .finding-card.info     { border-left-color: #a78bfa; }
  .finding-header {
    display: flex; flex-direction: column; gap: 3px;
    padding: 9px 10px; cursor: pointer;
    position: relative; user-select: none;
  }
  .finding-header:hover { background: var(--vscode-list-hoverBackground); }
  .finding-meta { display: flex; align-items: center; gap: 6px; }
  .sev-badge {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; padding: 1px 6px; border-radius: 4px;
  }
  .sev-badge.critical { background: #f8717122; color: #f87171; }
  .sev-badge.warning  { background: #facc1522; color: #facc15; }
  .sev-badge.suggestion { background: #60a5fa22; color: #60a5fa; }
  .sev-badge.info     { background: #a78bfa22; color: #a78bfa; }
  .line-badge {
    font-size: 10px; color: var(--vscode-descriptionForeground);
    font-family: var(--vscode-editor-font-family, monospace);
  }
  .finding-title { font-weight: 600; font-size: 12px; padding-right: 20px; }
  .expand-icon {
    position: absolute; right: 10px; top: 50%;
    transform: translateY(-50%) rotate(0deg);
    transition: transform 0.2s; font-size: 16px;
    color: var(--vscode-descriptionForeground);
  }
  .finding-card.expanded .expand-icon { transform: translateY(-50%) rotate(90deg); }
  .finding-body { display: none; padding: 0 10px 10px; }
  .finding-card.expanded .finding-body { display: block; }
  .finding-message { color: var(--vscode-foreground); font-size: 12px; line-height: 1.6; }
  .suggestion-box {
    margin-top: 10px; padding: 8px 10px;
    background: var(--vscode-sideBar-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px; border-left: 3px solid #60a5fa;
  }
  .suggestion-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #60a5fa; display: block; margin-bottom: 4px; }

  /* ── AI Notes ── */
  .ai-notes {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px; padding: 10px 12px;
    font-size: 12px; line-height: 1.7;
    white-space: pre-wrap; color: var(--vscode-foreground);
  }

  /* ── Code block ── */
  .code-block {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px; padding: 12px;
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 12px; line-height: 1.6;
    white-space: pre-wrap; overflow-x: auto;
    max-height: 400px; overflow-y: auto;
  }

  /* ── Empty state ── */
  .empty-state {
    text-align: center; padding: 20px;
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    background: var(--vscode-editor-background);
    border: 1px dashed var(--vscode-panel-border);
    border-radius: 8px;
  }

  /* ── Inline copy btn ── */
  .inline-copy { padding: 3px 8px; font-size: 11px; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 3px; }
</style>`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fullDocumentRange(document) {
  const lastLine = Math.max(document.lineCount - 1, 0);
  return new vscode.Range(
    new vscode.Position(0, 0),
    document.lineAt(lastLine).range.end
  );
}

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function deactivate() {
  diagnosticCollection?.clear();
  diagnosticCollection?.dispose();
  reviewCache.clear();
  for (const t of debounceTimers.values()) clearTimeout(t);
  debounceTimers.clear();
}

module.exports = { activate, deactivate };
