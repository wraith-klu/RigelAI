const vscode = require("vscode");

const WEBSITE_URL = "https://rigelai-agent.vercel.app";
const DEFAULT_API_URL = "https://rigelai.onrender.com";
const DEFAULT_QUERY =
  "Analyze this code for smells, bugs, complexity, and refactoring opportunities. Generate a corrected version when improvements are needed.";

function activate(context) {
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
    vscode.commands.registerCommand("rigelai.openSettings", () =>
      vscode.commands.executeCommand("workbench.action.openSettings", "rigelai.apiUrl")
    ),
    vscode.commands.registerCommand("rigelai.openWebsite", () =>
      vscode.env.openExternal(vscode.Uri.parse(WEBSITE_URL))
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
          `RigelAI connected${apiUrl ? ` to ${apiUrl}` : ""}. Run "RigelAI: Generate Corrected Code" to start.`
        );
      },
    })
  );
}

async function analyzeEditorContent(mode) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("Open a code file before running RigelAI.");
    return;
  }

  const document = editor.document;
  const hasSelection = !editor.selection.isEmpty;
  const selectedText = hasSelection ? document.getText(editor.selection) : "";
  const shouldUseSelection = mode === "selection" || (mode === "correct" && hasSelection);
  const code = shouldUseSelection ? selectedText : document.getText();

  if (!code.trim()) {
    vscode.window.showErrorMessage("There is no code to analyze.");
    return;
  }

  const apiUrl = getApiUrl();
  const language = document.languageId || "plaintext";
  const query = buildQuery(mode, shouldUseSelection, language);
  const reviewContext = {
    apiUrl,
    code,
    fileName: document.fileName,
    language,
    mode: shouldUseSelection ? "selection" : "file",
    range: shouldUseSelection ? rangeToPlainObject(editor.selection) : null,
    uri: document.uri.toString(),
    version: document.version,
  };

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title:
        mode === "correct"
          ? "RigelAI is generating corrected code"
          : "RigelAI is reviewing your code",
      cancellable: false,
    },
    async () => {
      try {
        const result = await callRigelAI(apiUrl, code, query);
        showResultsPanel(contextWithResult(reviewContext, result));
      } catch (error) {
        vscode.window.showErrorMessage(
          `RigelAI analysis failed: ${error.message || "Unknown error"}`
        );
      }
    }
  );
}

function buildQuery(mode, isSelection, language) {
  const scope = isSelection ? "selected code" : "entire file";
  if (mode === "correct") {
    return `Review this ${language} ${scope}, explain the important issues briefly, and generate a fully corrected runnable version of the ${scope}.`;
  }

  return `Analyze this ${language} ${scope} for bugs, smells, complexity, and refactoring improvements. Also generate corrected code if fixes are useful.`;
}

function contextWithResult(context, result) {
  return {
    ...context,
    result,
    optimizedCode: String(result?.llm_analysis?.optimized_code || ""),
  };
}

function getApiUrl() {
  const configured = vscode.workspace.getConfiguration("rigelai").get("apiUrl");
  return String(configured || DEFAULT_API_URL).replace(/\/$/, "");
}

async function callRigelAI(apiUrl, code, userQuery) {
  const response = await fetch(`${apiUrl}/analyze-editor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      user_query: userQuery || DEFAULT_QUERY,
    }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      detail = "";
    }
    throw new Error(`Backend returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }

  return response.json();
}

function showResultsPanel(review) {
  const panel = vscode.window.createWebviewPanel(
    "rigelaiResults",
    "RigelAI Code Review",
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = renderResults(review);
  panel.webview.onDidReceiveMessage((message) => handleWebviewMessage(message, review));
}

async function handleWebviewMessage(message, review) {
  switch (message?.command) {
    case "applyCorrectedCode":
      await applyCorrectedCode(review);
      break;
    case "copyCorrectedCode":
      await copyCorrectedCode(review);
      break;
    case "previewCorrectedCode":
      await previewCorrectedCode(review);
      break;
    default:
      break;
  }
}

async function applyCorrectedCode(review) {
  const code = review.optimizedCode;
  if (!code.trim()) {
    vscode.window.showWarningMessage("RigelAI did not return corrected code for this review.");
    return;
  }

  const uri = vscode.Uri.parse(review.uri);
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);

  if (document.version !== review.version) {
    const choice = await vscode.window.showWarningMessage(
      "This file changed after the RigelAI review. Apply the corrected code anyway?",
      { modal: true },
      "Apply"
    );
    if (choice !== "Apply") {
      return;
    }
  }

  const range = review.range ? plainObjectToRange(review.range) : fullDocumentRange(document);
  const applied = await editor.edit((editBuilder) => {
    editBuilder.replace(range, code);
  });

  if (applied) {
    vscode.window.showInformationMessage(
      review.range
        ? "RigelAI corrected code applied to the selected range."
        : "RigelAI corrected code applied to the current file."
    );
  } else {
    vscode.window.showErrorMessage("VS Code could not apply the RigelAI correction.");
  }
}

async function copyCorrectedCode(review) {
  if (!review.optimizedCode.trim()) {
    vscode.window.showWarningMessage("RigelAI did not return corrected code for this review.");
    return;
  }

  await vscode.env.clipboard.writeText(review.optimizedCode);
  vscode.window.showInformationMessage("Corrected code copied to clipboard.");
}

async function previewCorrectedCode(review) {
  if (!review.optimizedCode.trim()) {
    vscode.window.showWarningMessage("RigelAI did not return corrected code for this review.");
    return;
  }

  const preview = await vscode.workspace.openTextDocument({
    content: review.optimizedCode,
    language: review.language,
  });
  await vscode.window.showTextDocument(preview, vscode.ViewColumn.Beside);
}

function renderResults(review) {
  const data = review.result;
  const llm = data?.llm_analysis || {};
  const report = llm.quality_report || {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const fixes = Array.isArray(report.fix_suggestions) ? report.fix_suggestions : [];
  const severityCounts = report.severity_counts || {};
  const optimizedCode = review.optimizedCode;
  const healthScore =
    typeof report.health_score === "number" ? String(report.health_score) : "--";
  const nonce = getNonce();

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body {
      margin: 0;
      padding: 24px;
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      font-family: var(--vscode-font-family);
    }
    h1, h2, h3 { margin: 0; }
    button {
      border: 0;
      border-radius: 6px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 9px 12px;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    .label {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .score {
      min-width: 96px;
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }
    .score strong {
      display: block;
      margin-top: 4px;
      font-size: 34px;
      color: var(--vscode-testing-iconPassed);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0 22px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 22px;
    }
    .card, .finding, .fix, pre, .empty-state {
      border: 1px solid var(--vscode-panel-border);
      border-radius: 8px;
      background: var(--vscode-sideBar-background);
    }
    .card { padding: 14px; }
    .card strong {
      display: block;
      margin-top: 6px;
      font-size: 24px;
    }
    section { margin-top: 24px; }
    section h2 { margin-bottom: 10px; font-size: 18px; }
    .list { display: grid; gap: 10px; }
    .finding, .fix, .empty-state {
      padding: 14px;
      border-left: 4px solid var(--vscode-button-background);
    }
    .critical { border-left-color: var(--vscode-testing-iconFailed); }
    .warning { border-left-color: var(--vscode-testing-iconQueued); }
    .info { border-left-color: var(--vscode-testing-iconPassed); }
    .pill {
      display: inline-block;
      margin-right: 8px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 7px;
      text-transform: uppercase;
    }
    p { line-height: 1.55; }
    small {
      color: var(--vscode-descriptionForeground);
      font-weight: 700;
    }
    pre {
      overflow: auto;
      padding: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    @media (max-width: 720px) {
      .header { display: block; }
      .score { margin-top: 12px; }
      .grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <span class="label">RigelAI Code Review</span>
      <h1>${escapeHtml(review.mode === "selection" ? "Selection Analysis" : "File Analysis")}</h1>
      <p>${escapeHtml(review.fileName)}</p>
    </div>
    <div class="score">
      <span class="label">Health</span>
      <strong>${escapeHtml(healthScore)}</strong>
    </div>
  </div>

  <div class="actions">
    <button ${optimizedCode ? "" : "disabled"} data-command="applyCorrectedCode">Apply Corrected Code</button>
    <button class="secondary" ${optimizedCode ? "" : "disabled"} data-command="previewCorrectedCode">Preview Corrected Code</button>
    <button class="secondary" ${optimizedCode ? "" : "disabled"} data-command="copyCorrectedCode">Copy Corrected Code</button>
  </div>

  <div class="grid">
    <div class="card"><span class="label">Critical</span><strong>${severityCounts.critical || 0}</strong></div>
    <div class="card"><span class="label">Warnings</span><strong>${severityCounts.warning || 0}</strong></div>
    <div class="card"><span class="label">Suggestions</span><strong>${severityCounts.suggestion || 0}</strong></div>
    <div class="card"><span class="label">Info</span><strong>${severityCounts.info || 0}</strong></div>
  </div>

  <section>
    <h2>Findings</h2>
    <div class="list">
      ${
        findings.length
          ? findings.map(renderFinding).join("")
          : "<p>No structured findings were returned.</p>"
      }
    </div>
  </section>

  <section>
    <h2>Auto Fix Suggestions</h2>
    <div class="list">
      ${fixes.length ? fixes.map(renderFix).join("") : "<p>No fix suggestions were generated.</p>"}
    </div>
  </section>

  <section>
    <h2>AI Review Notes</h2>
    <p>${escapeHtml(llm.llm_response || "No review notes were returned.")}</p>
  </section>

  <section>
    <h2>Corrected Code</h2>
    ${
      optimizedCode
        ? `<pre>${escapeHtml(optimizedCode)}</pre>`
        : `<div class="empty-state">RigelAI did not return corrected code. Check the backend LLM configuration, then run "RigelAI: Generate Corrected Code" again.</div>`
    }
  </section>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll("button[data-command]").forEach((button) => {
      button.addEventListener("click", () => {
        vscode.postMessage({ command: button.dataset.command });
      });
    });
  </script>
</body>
</html>`;
}

function renderFinding(finding) {
  const severity = escapeHtml(finding.severity || "info");
  return `<article class="finding ${severity}">
    <div><span class="pill">${severity}</span><strong>${escapeHtml(finding.title || "Finding")}</strong></div>
    <p>${escapeHtml(finding.message || "")}</p>
    <small>${escapeHtml(finding.file || "source")}${finding.line ? `:${finding.line}` : ""}</small>
    <p>${escapeHtml(finding.suggestion || "")}</p>
  </article>`;
}

function renderFix(fix) {
  const severity = escapeHtml(fix.severity || "suggestion");
  return `<article class="fix ${severity}">
    <div><span class="pill">${severity}</span><strong>${escapeHtml(fix.title || "Fix")}</strong></div>
    <p>${escapeHtml(fix.recommendation || "")}</p>
    <small>${escapeHtml(fix.file || "source")}${fix.line ? `:${fix.line}` : ""}</small>
  </article>`;
}

function fullDocumentRange(document) {
  const lastLine = Math.max(document.lineCount - 1, 0);
  return new vscode.Range(new vscode.Position(0, 0), document.lineAt(lastLine).range.end);
}

function rangeToPlainObject(range) {
  return {
    start: {
      line: range.start.line,
      character: range.start.character,
    },
    end: {
      line: range.end.line,
      character: range.end.character,
    },
  };
}

function plainObjectToRange(range) {
  return new vscode.Range(
    new vscode.Position(range.start.line, range.start.character),
    new vscode.Position(range.end.line, range.end.character)
  );
}

function getNonce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let index = 0; index < 32; index += 1) {
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

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
