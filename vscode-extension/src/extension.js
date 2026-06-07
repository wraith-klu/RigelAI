const vscode = require("vscode");

const WEBSITE_URL = "https://rigelai-agent.vercel.app";
const DEFAULT_QUERY =
  "Analyze this code for smells, bugs, complexity, and refactoring opportunities.";

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("rigelai.analyzeCurrentFile", () =>
      analyzeEditorContent("file")
    ),
    vscode.commands.registerCommand("rigelai.analyzeSelection", () =>
      analyzeEditorContent("selection")
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
          `RigelAI connected${apiUrl ? ` to ${apiUrl}` : ""}. Run "RigelAI: Analyze Current File" to start.`
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
  const selectedText = editor.selection.isEmpty
    ? ""
    : document.getText(editor.selection);
  const code = mode === "selection" ? selectedText : document.getText();

  if (!code.trim()) {
    vscode.window.showErrorMessage("There is no code to analyze.");
    return;
  }

  const apiUrl = getApiUrl();
  const language = document.languageId || "plaintext";
  const query =
    mode === "selection"
      ? `Analyze this ${language} code selection for bugs, smells, complexity, and refactoring improvements.`
      : `Analyze this ${language} file for bugs, smells, complexity, and refactoring improvements.`;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "RigelAI is analyzing your code",
      cancellable: false,
    },
    async () => {
      try {
        const result = await callRigelAI(apiUrl, code, query);
        showResultsPanel(result, {
          apiUrl,
          fileName: document.fileName,
          mode,
          language,
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          `RigelAI analysis failed: ${error.message || "Unknown error"}`
        );
      }
    }
  );
}

function getApiUrl() {
  const configured = vscode.workspace.getConfiguration("rigelai").get("apiUrl");
  return String(configured || "https://rigelai.onrender.com").replace(/\/$/, "");
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
    throw new Error(`Backend returned ${response.status}`);
  }

  return response.json();
}

function showResultsPanel(data, context) {
  const panel = vscode.window.createWebviewPanel(
    "rigelaiResults",
    "RigelAI Code Review",
    vscode.ViewColumn.Beside,
    {
      enableScripts: false,
      retainContextWhenHidden: true,
    }
  );

  panel.webview.html = renderResults(data, context);
}

function renderResults(data, context) {
  const llm = data?.llm_analysis || {};
  const report = llm.quality_report || {};
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const fixes = Array.isArray(report.fix_suggestions) ? report.fix_suggestions : [];
  const severityCounts = report.severity_counts || {};
  const optimizedCode = llm.optimized_code || "";
  const healthScore =
    typeof report.health_score === "number" ? String(report.health_score) : "--";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
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
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 22px;
    }
    .card, .finding, .fix, pre {
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
    .finding, .fix {
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
      <h1>${escapeHtml(context.mode === "selection" ? "Selection Analysis" : "File Analysis")}</h1>
      <p>${escapeHtml(context.fileName)}</p>
    </div>
    <div class="score">
      <span class="label">Health</span>
      <strong>${escapeHtml(healthScore)}</strong>
    </div>
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

  ${
    optimizedCode
      ? `<section><h2>Optimized Code</h2><pre>${escapeHtml(optimizedCode)}</pre></section>`
      : ""
  }
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
