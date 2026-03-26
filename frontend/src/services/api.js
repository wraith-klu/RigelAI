// ============================================
// CodeSentinel AI — API SERVICE (WORKING)
// Compatible with FastAPI backend
// ============================================

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


// ================= CHAT =================
// POST /chat  (JSON)
// ========================================
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


// ================= ANALYZE FILE =================
// POST /analyze-file (FormData)
// ================================================
export async function analyzeFile(file, query = "Analyze and optimize this code") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_query", query);

  const res = await fetch(`${API_URL}/analyze-file`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Analysis failed");
  }

  return res.json();
}


// ================= ANALYZE EDITOR =================
// POST /analyze-editor (JSON)
// ================================================
export async function analyzeEditor(code, query = "Analyze this code", sessionId = null) {
  const res = await fetch(`${API_URL}/analyze-editor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code: code,
      user_query: query,
      session_id: sessionId,
    }),
  });

  if (!res.ok) {
    throw new Error("Editor analysis failed");
  }

  return res.json();
}


// ================= FOLLOW-UP =================
// POST /followup (JSON)
// ============================================
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


// ================= DOWNLOAD PDF =================
// POST /download-pdf (JSON)
// ===============================================
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