// RigelAI API service for the FastAPI backend
// v0.4.0 — AbortSignal support for stop-analysis, improved error handling

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/** Thrown when a request is cancelled via AbortSignal */
export class CancelledError extends Error {
  constructor() {
    super("Request cancelled by user.");
    this.name = "CancelledError";
  }
}


// POST /chat  (JSON)
export async function sendChatMessage(query) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_query: query,
    }),
  });

  if (!res.ok) {
    throw new Error("Chat failed");
  }

  return res.json();
}


// POST /analyze-file (FormData)
export async function analyzeFile(file, query = "Analyze and optimize this code", signal = null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_query", query);

  let res;
  try {
    res = await fetch(`${API_URL}/analyze-file`, {
      method: "POST",
      body: formData,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new CancelledError();
    throw err;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Analysis failed (${res.status})${detail ? ': ' + detail : ""}`);
  }

  return res.json();
}


// POST /analyze-editor (JSON)
export async function analyzeEditor(code, query = "Analyze this code", sessionId = null, signal = null) {
  let res;
  try {
    res = await fetch(`${API_URL}/analyze-editor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, user_query: query, session_id: sessionId }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new CancelledError();
    throw err;
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Editor analysis failed (${res.status})${detail ? ': ' + detail : ""}`);
  }

  return res.json();
}


// POST /analyze-repository (JSON)
export async function analyzeRepository(
  repositoryUrl,
  query = "Analyze this repository for bugs, smells, complexity, and refactoring opportunities."
) {
  const res = await fetch(`${API_URL}/analyze-repository`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      repository_url: repositoryUrl,
      user_query: query,
    }),
  });

  if (!res.ok) {
    throw new Error("Repository analysis failed");
  }

  return res.json();
}


// POST /followup (JSON)
export async function sendFollowUp(query, sessionId) {
  const res = await fetch(`${API_URL}/followup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_query: query,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    throw new Error("Follow-up failed");
  }

  return res.json();
}


// POST /download-pdf (JSON)
export async function downloadPDF(text) {
  const res = await fetch(`${API_URL}/download-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error("PDF generation failed");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "discussion.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}
