# RigelAI Code Review

**AI-powered inline code review, right inside VS Code.**

Red underlines on problematic lines, hover explanations, one-click lightbulb fixes, and a full side panel with corrected code — all powered by the RigelAI AI backend.

---

## Features

### 🔴 Inline Diagnostics
Save a file and RigelAI automatically underlines issues in red, yellow, or blue — just like built-in compiler errors. No manual triggering needed.

### 🖱️ Hover Explanations
Hover over any underlined line to see the issue title, reason, and a suggested fix — without leaving the editor.

### 💡 Lightbulb Code Actions
Click the lightbulb (or press `Ctrl+.`) on any flagged line to instantly apply the AI-corrected version of the entire file.

### 📋 Side Panel
The **RigelAI** icon in the Activity Bar opens a rich review panel showing:
- Health score ring
- Critical / Warning / Suggestion / Info counts
- Expandable finding cards (click to see full reason + fix)
- Full AI review notes
- Syntax-highlighted corrected code

### ✅ One-Click Apply Fix
Apply, preview in a diff view, or copy the AI-corrected code with a single click.

---

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Open any code file (Python, JavaScript, TypeScript, Java, C++, and more)
3. **Save the file** — RigelAI automatically analyzes it and shows inline squiggles
4. Hover a red underline to read the reason
5. Click the **💡 lightbulb** → **"RigelAI: Apply AI-Corrected Code"** to fix it
6. Click the **✦ RigelAI icon** in the Activity Bar to open the full review panel

---

## Commands

| Command | Description |
| --- | --- |
| `RigelAI: Analyze Current File` | Manually trigger a full file review |
| `RigelAI: Analyze Selection` | Review only the selected code |
| `RigelAI: Generate Corrected Code` | Get a fully corrected version of the file |
| `RigelAI: Clear Diagnostics` | Remove all squiggles from the editor |
| `RigelAI: Open Settings` | Open the RigelAI settings |
| `RigelAI: Open Website` | Visit rigelai-agent.vercel.app |

All commands are also available in the **right-click context menu** of the editor.

---

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `rigelai.apiUrl` | `https://rigelai.onrender.com` | Backend API URL |
| `rigelai.autoAnalyzeOnSave` | `true` | Auto-analyze when you save a file |
| `rigelai.autoAnalyzeDelay` | `1500` | Debounce delay in ms after save |

To use a local backend, set `rigelai.apiUrl` to `http://localhost:8000`.

---

## Supported Languages

Python · JavaScript · TypeScript · Java · C · C++ · Go · Rust · PHP · Ruby · C# · Kotlin · Swift · HTML · CSS · JSON · YAML · and more.

---

## How It Works

```
Save file → RigelAI backend (/analyze-editor)
         → findings[] with line numbers + severity
         → Red squiggles on exact lines in editor
         → Hover tooltip with reason + fix suggestion
         → Side panel with full review + corrected code
```

The extension connects to the RigelAI backend which uses a combination of AST analysis, ML model prediction, and LLM review to detect bugs, code smells, complexity issues, and refactoring opportunities.

---

## Backend

The extension connects to the hosted RigelAI backend at `https://rigelai.onrender.com` by default. You can also run the backend locally — see the [RigelAI GitHub repository](https://github.com/wraith-klu/RigelAI) for setup instructions.

---

## License

MIT
