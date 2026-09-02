// RigelAI VS Code Extension — Inline Diagnostics + Review Panel
// v0.4.0 — Stop/Run Analysis controls, Uninstall button, rich colorful AI Notes

"use strict";
const vscode = require("vscode");

// ─── Constants ────────────────────────────────────────────────────────────────
const WEBSITE_URL = "https://rigelai-agent.vercel.app";
const DEFAULT_API_URL = "https://rigelai.onrender.com";
const EXTENSION_ID = "wraith-klu.rigelai-code-review";
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
/** @type {AbortController | null} current in-flight analysis abort controller */
let currentAbortController = null;
/** @type {boolean} whether an analysis is currently running */
let isAnalyzing = false;

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
    vscode.commands.registerCommand("rigelai.stopAnalysis", () => {
      stopCurrentAnalysis();
    }),
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
    vscode.commands.registerCommand("rigelai.uninstallExtension", async () => {
      const answer = await vscode.window.showWarningMessage(
        "Are you sure you want to uninstall RigelAI Code Review?",
        { modal: true },
        "Yes, Uninstall"
      );
      if (answer === "Yes, Uninstall") {
        await vscode.commands.executeCommand(
          "workbench.extensions.uninstallExtension",
          EXTENSION_ID
        );
        vscode.window.showInformationMessage(
          "RigelAI has been uninstalled. Reload VS Code to complete removal."
        );
      }
    }),
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

// ─── Stop Analysis ────────────────────────────────────────────────────────────
function stopCurrentAnalysis() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  isAnalyzing = false;
  panelProvider?.setAnalyzingState(false);
  vscode.window.showInformationMessage("⛔ RigelAI analysis stopped.");
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

  // Abort any previous in-flight request
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  const signal = currentAbortController.signal;
  isAnalyzing = true;
  panelProvider?.setAnalyzingState(true);

  const apiUrl = getApiUrl();
  const language = document.languageId || "plaintext";

  const doRun = async () => {
    try {
      const query = buildQuery(mode, false, language);
      const result = await callRigelAI(apiUrl, code, query, signal);
      if (signal.aborted) return; // silently cancelled
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
      if (error.name === "AbortError" || signal.aborted) return;
      vscode.window.showErrorMessage(
        `RigelAI analysis failed: ${error.message || "Unknown error"}`
      );
      panelProvider?.setAnalyzingState(false);
    } finally {
      if (currentAbortController?.signal === signal) {
        currentAbortController = null;
        isAnalyzing = false;
        panelProvider?.setAnalyzingState(false);
      }
    }
  };

  if (withProgress) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "RigelAI is analyzing your code…",
        cancellable: true,
      },
      async (_progress, token) => {
        token.onCancellationRequested(() => stopCurrentAnalysis());
        await doRun();
      }
    );
  } else {
    // Silent background analysis — show status bar flash instead
    const statusItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    statusItem.text = "$(sync~spin) RigelAI analyzing…";
    statusItem.tooltip = "Click to stop";
    statusItem.command = "rigelai.stopAnalysis";
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

    if (finding.suggestion) {
      diag.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
          new vscode.Location(document.uri, range),
          `💡 Suggestion: ${finding.suggestion}`
        ),
      ];
    }
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
    const commandUri = vscode.Uri.parse(`command:rigelai.analyzeCurrentFile`);
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

async function callRigelAI(apiUrl, code, userQuery, signal) {
  const response = await fetch(`${apiUrl}/analyze-editor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, user_query: userQuery || "" }),
    signal,
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
    this._analyzing = false;
  }

  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._pendingUpdate
      ? renderPanel(this._pendingUpdate, this._analyzing)
      : renderWelcome(this._analyzing);
    this._pendingUpdate = null;

    webviewView.webview.onDidReceiveMessage((msg) =>
      this._handleMessage(msg)
    );
  }

  update(review) {
    if (this._view) {
      this._view.webview.html = renderPanel(review, this._analyzing);
    } else {
      this._pendingUpdate = review;
    }
  }

  showWelcome() {
    if (this._view) {
      this._view.webview.html = renderWelcome(false);
    }
    this._pendingUpdate = null;
  }

  /** Called when analysis starts/stops to push UI state update */
  setAnalyzingState(analyzing) {
    this._analyzing = analyzing;
    if (!this._view) return;
    // Send a lightweight message instead of full re-render to preserve scroll
    this._view.webview.postMessage({
      type: "analyzingState",
      analyzing,
    });
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
      case "stopAnalysis":
        stopCurrentAnalysis();
        break;
      case "uninstallExtension":
        await vscode.commands.executeCommand("rigelai.uninstallExtension");
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
function renderWelcome(analyzing) {
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

    <!-- Primary action buttons -->
    <div class="welcome-actions">
      <button id="btn-analyze" class="btn-primary ${analyzing ? "hidden" : ""}" data-command="reanalyze">
        <span>⚡</span> Run Analysis
      </button>
      <button id="btn-stop" class="btn-danger ${analyzing ? "" : "hidden"}" data-command="stopAnalysis">
        <span class="stop-icon">⬛</span> Stop Analysis
      </button>
    </div>

    <!-- Divider -->
    <div class="danger-zone">
      <div class="danger-label">⚠️ Danger Zone</div>
      <button id="btn-uninstall" class="btn-uninstall" data-command="uninstallExtension">
        <span>🗑️</span> Uninstall Extension
      </button>
    </div>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.querySelectorAll('[data-command]').forEach(el => {
      el.addEventListener('click', () => {
        vscode.postMessage({ command: el.dataset.command });
      });
    });

    // Listen for analyzing state changes from extension
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'analyzingState') {
        const btnAnalyze = document.getElementById('btn-analyze');
        const btnStop = document.getElementById('btn-stop');
        if (msg.analyzing) {
          btnAnalyze?.classList.add('hidden');
          btnStop?.classList.remove('hidden');
        } else {
          btnAnalyze?.classList.remove('hidden');
          btnStop?.classList.add('hidden');
        }
      }
    });
  </script>
</body>
</html>`;
}

// ─── Panel HTML — Results ─────────────────────────────────────────────────────
function renderPanel(review, analyzing) {
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
    <button class="btn-ghost" data-command="reanalyze" id="btn-run" ${analyzing ? "disabled" : ""}>
      ⚡ Run
    </button>
    <button class="btn-stop-inline" data-command="stopAnalysis" id="btn-stop" ${analyzing ? "" : "disabled style='display:none'"}>
      ⬛ Stop
    </button>
  </div>

  <!-- Analyzing Indicator -->
  <div id="analyzing-bar" class="analyzing-bar ${analyzing ? "" : "hidden"}">
    <span class="pulse-dot"></span>
    <span>Analyzing your code…</span>
    <button class="btn-stop-sm" data-command="stopAnalysis">Stop</button>
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

  <!-- AI Notes (Rich Formatted) -->
  ${llmNotes ? `
  <section class="section">
    <div class="section-header">
      <span class="section-title">🤖 AI Review Notes</span>
    </div>
    <div class="ai-notes">${renderRichNotes(llmNotes)}</div>
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

  <!-- Danger Zone -->
  <div class="danger-zone-panel">
    <div class="danger-label-sm">⚠️ Danger Zone</div>
    <button class="btn-uninstall-sm" data-command="uninstallExtension">🗑️ Uninstall Extension</button>
  </div>

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

    // Listen for analyzing state changes
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'analyzingState') {
        const bar = document.getElementById('analyzing-bar');
        const btnRun = document.getElementById('btn-run');
        const btnStop = document.getElementById('btn-stop');
        if (msg.analyzing) {
          bar?.classList.remove('hidden');
          if (btnRun) btnRun.disabled = true;
          if (btnStop) { btnStop.style.display = ''; btnStop.disabled = false; }
        } else {
          bar?.classList.add('hidden');
          if (btnRun) btnRun.disabled = false;
          if (btnStop) { btnStop.style.display = 'none'; btnStop.disabled = true; }
        }
      }
    });
  </script>
</body>
</html>`;
}

// ─── Rich AI Notes Renderer ───────────────────────────────────────────────────
/**
 * Converts plain-text LLM notes (with ### headings, **bold**, `code`, code fences)
 * into rich colorful HTML for the sidebar panel.
 */
function renderRichNotes(raw) {
  const lines = raw.split("\n");
  let html = "";
  let inCodeFence = false;
  let codeLang = "";
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence open/close
    const fenceMatch = line.match(/^```(\w*)$/);
    if (fenceMatch) {
      if (!inCodeFence) {
        inCodeFence = true;
        codeLang = fenceMatch[1] || "code";
        codeBuffer = [];
      } else {
        // Close fence — emit code block
        inCodeFence = false;
        html += `<div class="notes-code-block"><div class="notes-code-lang">${escapeHtml(codeLang)}</div><pre><code>${escapeHtml(codeBuffer.join("\n"))}</code></pre></div>`;
        codeBuffer = [];
        codeLang = "";
      }
      continue;
    }

    if (inCodeFence) {
      codeBuffer.push(line);
      continue;
    }

    // Headings (### ## #)
    const h3 = line.match(/^###\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h1 = line.match(/^#\s+(.+)/);
    if (h3) {
      html += `<div class="notes-h3">${inlineFormat(h3[1])}</div>`;
      continue;
    }
    if (h2) {
      html += `<div class="notes-h2">${inlineFormat(h2[1])}</div>`;
      continue;
    }
    if (h1) {
      html += `<div class="notes-h1">${inlineFormat(h1[1])}</div>`;
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      html += `<hr class="notes-hr"/>`;
      continue;
    }

    // Numbered list
    const numList = line.match(/^(\d+)\.\s+(.+)/);
    if (numList) {
      html += `<div class="notes-list-item"><span class="notes-list-num">${escapeHtml(numList[1])}.</span><span>${inlineFormat(numList[2])}</span></div>`;
      continue;
    }

    // Bullet list (- or *)
    const bullet = line.match(/^[-*]\s+(.+)/);
    if (bullet) {
      html += `<div class="notes-list-item"><span class="notes-bullet">•</span><span>${inlineFormat(bullet[1])}</span></div>`;
      continue;
    }

    // Empty line
    if (!line.trim()) {
      html += `<div class="notes-spacer"></div>`;
      continue;
    }

    // Regular paragraph line
    html += `<div class="notes-line">${inlineFormat(line)}</div>`;
  }

  return html;
}

/**
 * Apply inline formatting: **bold**, *italic*, `code`, and escape HTML.
 */
function inlineFormat(text) {
  // Escape HTML first, then apply formatting
  let out = escapeHtml(text);
  // Bold: **text**
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong class="notes-bold">$1</strong>');
  // Italic: *text* (not **)
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="notes-italic">$1</em>');
  // Inline code: `code`
  out = out.replace(/`([^`]+)`/g, '<code class="notes-inline-code">$1</code>');
  return out;
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

  .hidden { display: none !important; }

  /* ── Welcome ── */
  .welcome {
    display: flex; flex-direction: column; align-items: center;
    padding: 28px 16px; gap: 12px; text-align: center;
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
  .tip-list { display: flex; flex-direction: column; gap: 8px; width: 100%; text-align: left; margin: 6px 0; }
  .tip {
    display: flex; align-items: center; gap: 10px;
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 8px; padding: 8px 12px;
    font-size: 12px;
  }
  .tip-icon { font-size: 16px; flex-shrink: 0; }

  /* Welcome actions */
  .welcome-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; width: 100%; margin-top: 4px; }

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
  .btn-ghost:hover:not(:disabled) { background: var(--vscode-editor-background); }

  /* ── Stop / Danger buttons ── */
  .btn-danger {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: #fff;
    box-shadow: 0 2px 8px #dc262633;
    animation: pulse-red 1.8s ease-in-out infinite;
  }
  .btn-danger:hover:not(:disabled) {
    background: #991b1b;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px #dc262655;
  }
  .btn-stop-inline {
    background: #dc262620;
    color: #f87171;
    border: 1px solid #dc262650;
    border-radius: 6px; cursor: pointer;
    font: inherit; font-weight: 600; font-size: 12px;
    padding: 7px 12px; transition: all 0.15s ease;
    display: inline-flex; align-items: center; gap: 5px;
  }
  .btn-stop-inline:not(:disabled):hover {
    background: #dc262640;
    border-color: #f87171;
  }
  .btn-stop-sm {
    background: #dc262620; color: #f87171;
    border: 1px solid #dc262650; border-radius: 5px;
    font-size: 11px; font-weight: 700; padding: 3px 8px; cursor: pointer;
    margin-left: auto; transition: background 0.15s;
  }
  .btn-stop-sm:hover { background: #dc262640; }

  /* ── Uninstall button ── */
  .btn-uninstall {
    background: transparent;
    color: #f87171;
    border: 1px dashed #f8717166;
    border-radius: 6px; cursor: pointer;
    font: inherit; font-size: 12px; font-weight: 600;
    padding: 7px 14px;
    display: inline-flex; align-items: center; gap: 6px;
    transition: all 0.15s;
    width: 100%; justify-content: center;
  }
  .btn-uninstall:hover {
    background: #f8717115;
    border-color: #f87171;
    box-shadow: 0 0 8px #f8717130;
  }
  .btn-uninstall-sm {
    background: transparent;
    color: #f87171;
    border: 1px dashed #f8717166;
    border-radius: 5px; cursor: pointer;
    font-size: 11px; font-weight: 600;
    padding: 5px 10px;
    display: inline-flex; align-items: center; gap: 5px;
    transition: all 0.15s;
  }
  .btn-uninstall-sm:hover {
    background: #f8717115;
    border-color: #f87171;
  }

  /* ── Danger Zone ── */
  .danger-zone {
    width: 100%; margin-top: 10px;
    border: 1px dashed #f8717140;
    border-radius: 8px; padding: 10px 12px;
    display: flex; flex-direction: column; gap: 8px; align-items: center;
  }
  .danger-label {
    font-size: 11px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.6px; color: #f87171; opacity: 0.7;
  }
  .danger-zone-panel {
    margin-top: 16px; margin-bottom: 8px;
    border: 1px dashed #f8717130;
    border-radius: 8px; padding: 8px 12px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
  }
  .danger-label-sm {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.5px; color: #f87171; opacity: 0.6;
  }

  /* ── Analyzing bar ── */
  .analyzing-bar {
    display: flex; align-items: center; gap: 8px;
    background: linear-gradient(90deg, #7c3aed22, #312e5533);
    border: 1px solid #7c3aed55;
    border-radius: 8px; padding: 8px 12px; margin-bottom: 12px;
    font-size: 12px; color: #a78bfa;
    animation: fadeIn 0.3s ease;
  }
  .pulse-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #7c3aed;
    animation: pulse-glow 1.2s ease-in-out infinite;
    flex-shrink: 0;
  }

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

  /* ── Rich AI Notes ── */
  .ai-notes {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 10px; padding: 14px 14px;
    font-size: 12.5px; line-height: 1.75;
    color: var(--vscode-foreground);
  }
  .notes-h1 {
    font-size: 15px; font-weight: 800;
    color: #a78bfa;
    border-bottom: 2px solid #7c3aed55;
    padding-bottom: 5px; margin-bottom: 8px; margin-top: 14px;
    letter-spacing: 0.3px;
  }
  .notes-h2 {
    font-size: 13.5px; font-weight: 700;
    color: #60a5fa;
    border-left: 3px solid #3b82f6;
    padding-left: 8px; margin-bottom: 6px; margin-top: 12px;
  }
  .notes-h3 {
    font-size: 12.5px; font-weight: 700;
    color: #34d399;
    margin-bottom: 4px; margin-top: 10px;
  }
  .notes-h1:first-child, .notes-h2:first-child, .notes-h3:first-child { margin-top: 0; }
  .notes-hr {
    border: none;
    border-top: 1px solid var(--vscode-panel-border);
    margin: 10px 0;
  }
  .notes-line { color: var(--vscode-foreground); }
  .notes-spacer { height: 6px; }
  .notes-list-item {
    display: flex; gap: 6px; align-items: flex-start; padding: 1px 0;
  }
  .notes-list-num {
    color: #a78bfa; font-weight: 700; font-size: 12px; flex-shrink: 0; min-width: 20px;
  }
  .notes-bullet {
    color: #60a5fa; font-weight: 900; font-size: 14px; flex-shrink: 0; line-height: 1.5;
  }
  .notes-bold { color: #facc15; font-weight: 700; }
  .notes-italic { color: #94a3b8; font-style: italic; }
  .notes-inline-code {
    background: #1e1e3a; color: #f472b6;
    border: 1px solid #7c3aed44;
    border-radius: 4px; padding: 0 5px;
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 11.5px;
  }
  .notes-code-block {
    background: #0d0d1a;
    border: 1px solid #7c3aed55;
    border-radius: 8px; overflow: hidden;
    margin: 8px 0;
    box-shadow: 0 2px 8px #00000044;
  }
  .notes-code-lang {
    background: #7c3aed22;
    color: #a78bfa; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.8px;
    padding: 4px 10px;
    border-bottom: 1px solid #7c3aed33;
  }
  .notes-code-block pre {
    margin: 0; padding: 10px 12px;
    font-family: var(--vscode-editor-font-family, 'Cascadia Code', monospace);
    font-size: 11.5px; line-height: 1.6;
    white-space: pre-wrap; overflow-x: auto;
    color: #e2e8f0;
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

  /* ── Stop button icon ── */
  .stop-icon { font-size: 10px; }

  /* ── Animations ── */
  @keyframes pulse-red {
    0%, 100% { box-shadow: 0 2px 8px #dc262633; }
    50% { box-shadow: 0 2px 16px #dc262688; }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.3); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

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
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  diagnosticCollection?.clear();
  diagnosticCollection?.dispose();
  reviewCache.clear();
  for (const t of debounceTimers.values()) clearTimeout(t);
  debounceTimers.clear();
}

module.exports = { activate, deactivate };
