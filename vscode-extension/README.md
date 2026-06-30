# RigelAI Code Review

Analyze, review, and apply corrected code directly from VS Code using the RigelAI backend.

## Features

- Analyze the current open file.
- Analyze only the selected code.
- Generate a corrected version of the current file or selection.
- View health score, severity counts, findings, AI review notes, and corrected code in a VS Code panel.
- Preview, copy, or apply corrected code back into the editor.
- Connect to the hosted RigelAI backend from the website.

## Install locally

This extension is distributed as a local VSIX file, not from the VS Code Marketplace.

1. Download `rigelai-code-review-0.2.1.vsix`.
2. Open VS Code.
3. Open Extensions.
4. Choose `...` > `Install from VSIX...`.
5. Select the downloaded VSIX file.
6. Open a code file and run `RigelAI: Generate Corrected Code`.

You can also install it from a terminal:

```text
code --install-extension rigelai-code-review-0.2.1.vsix
```

## Commands

- `RigelAI: Analyze Current File`
- `RigelAI: Analyze Selection`
- `RigelAI: Generate Corrected Code`
- `RigelAI: Open Settings`
- `RigelAI: Open Website`

## Applying fixes

Run `RigelAI: Generate Corrected Code` from the command palette or editor context menu. If text is selected, RigelAI reviews and replaces only that selection. If nothing is selected, RigelAI reviews the whole file.

After the review opens, use:

- `Apply Corrected Code` to replace the reviewed file or selection.
- `Preview Corrected Code` to open the generated version beside your file.
- `Copy Corrected Code` to copy the generated version to the clipboard.

## Backend

The extension uses this backend by default:

```text
https://rigelai.onrender.com
```

You can change it in VS Code settings under `RigelAI: Api Url`.
