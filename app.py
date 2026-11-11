import os
import sys

# Ensure backend directory is in Python module search path
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import gradio as gr
from main import app as fastapi_app
from agent_logic import analyze_user_query

def analyze_code_gui(code, user_query, persona):
    if not code or not code.strip():
        return "Please input code to analyze.", "", "--", "--"

    try:
        result = analyze_user_query(
            user_query=user_query or "Analyze and optimize this code",
            code=code,
            persona=persona.lower() if persona else "architect"
        )
        llm = result.get("llm_analysis", {})
        report = llm.get("quality_report", {})
        debt = report.get("technical_debt", {})

        score_val = report.get("health_score", "--")
        score_str = f"{score_val}/100"
        if report.get("projected_health_score") and report.get("projected_health_score") > (score_val if isinstance(score_val, (int, float)) else 0):
            score_str += f" (Live Fix: {report['projected_health_score']}%)"

        debt_str = f"{debt.get('debt_hours', '--')} hrs (Grade {debt.get('sqale_rating', '--')})"

        return (
            llm.get("llm_response", "No response generated."),
            llm.get("optimized_code", ""),
            score_str,
            debt_str
        )
    except Exception as e:
        return f"Analysis error: {e}", "", "--", "--"

# Build Gradio UI
with gr.Blocks(title="CodeSentinel AI — Neural MoS Engine", theme=gr.themes.Soft()) as demo:
    gr.Markdown("# 🛡️ CodeSentinel AI — Neural MoS Engine")
    gr.Markdown(
        "**Mixture of Specialists Architecture:**\n"
        "- **Model 1**: GraphCodeBERT Defect Sentinel (`wraithklu/codesentinel-defect-sentinel`)\n"
        "- **Model 2**: CodeBERT Semantic Clone Detector (`wraithklu/codesentinel-clone-detector`)\n"
        "- **Model 3**: CodeT5 Automated Refactor Engine (`wraithklu/codesentinel-codet5-refiner`)\n"
        "- **DevSecOps**: Secret Leak Detector + SQALE Technical Debt Estimator"
    )

    with gr.Row():
        with gr.Column(scale=1):
            code_input = gr.Code(
                label="Source Code",
                language="python",
                lines=14,
                value="def process_items(items):\n    total = 0\n    for i in range(len(items)):\n        if items[i] > 0:\n            if items[i] % 2 == 0:\n                total += items[i]**2\n    return total"
            )
            query_input = gr.Textbox(
                label="Developer Inquiry / Task",
                value="Analyze this code for smells, defects, and provide clean refactored code."
            )
            persona_input = gr.Radio(
                choices=["architect", "student"],
                value="architect",
                label="Review Persona (Staff Architect vs. ELI5 Student)"
            )
            analyze_btn = gr.Button("🔍 Run Neural Review", variant="primary")

        with gr.Column(scale=1):
            with gr.Row():
                health_output = gr.Textbox(label="Health Score", interactive=False)
                debt_output = gr.Textbox(label="SQALE Technical Debt", interactive=False)
            response_output = gr.Markdown(label="Review Analysis")
            code_output = gr.Code(label="Refactored Code (CodeT5)", language="python", lines=8)

    analyze_btn.click(
        fn=analyze_code_gui,
        inputs=[code_input, query_input, persona_input],
        outputs=[response_output, code_output, health_output, debt_output]
    )

# Mount Gradio app on FastAPI so both the interactive web UI and REST API endpoints are active!
app = gr.mount_gradio_app(fastapi_app, demo, path="/")
