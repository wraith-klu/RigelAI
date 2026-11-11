import React from "react";

export default function PersonaSelector({ persona = "architect", onSelectPersona, className = "" }) {
  return (
    <div className={`persona-toggle-container ${className}`} role="radiogroup" aria-label="Review Persona">
      <button
        type="button"
        className={`persona-chip-btn ${persona === "architect" ? "active" : ""}`}
        onClick={() => onSelectPersona && onSelectPersona("architect")}
        title="Staff Systems Architect (Rigorous Big-O, concurrency, memory layout, clean architecture)"
        role="radio"
        aria-checked={persona === "architect"}
      >
        <span>🏛️ Staff Architect</span>
      </button>
      <button
        type="button"
        className={`persona-chip-btn ${persona === "student" ? "active" : ""}`}
        onClick={() => onSelectPersona && onSelectPersona("student")}
        title="ELI5 Student (Friendly, intuitive real-world analogies, conceptual breakdown)"
        role="radio"
        aria-checked={persona === "student"}
      >
        <span>🎓 ELI5 Student</span>
      </button>
    </div>
  );
}
