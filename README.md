<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=30&pause=1000&color=00D9FF&center=true&vCenter=true&width=700&lines=🛡️+CodeSentinel+AI;AI-Powered+Code+Analysis+Platform;AST+%2B+ML+%2B+LLM+Powered;Detect+%7C+Analyze+%7C+Optimize" alt="Typing SVG" />

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-Vercel-00C7B7?style=for-the-badge&logo=vercel)](https://rigelai-agent.vercel.app/)
[![Backend API](https://img.shields.io/badge/⚡%20Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://rigelai.onrender.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<br/>

> **CodeSentinel AI** is an intelligent, multi-layered code analysis platform that fuses **AST static analysis**, **AWD-LSTM machine learning**, and **Large Language Model reasoning** to detect code smells, assess code health, and generate optimized refactors — all in real time.

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🤖 ML Pipeline — Deep Dive](#-ml-pipeline--deep-dive)
  - [Layer 1 — AST Static Analysis](#layer-1--ast-static-analysis-engine)
  - [Layer 2 — AWD-LSTM Classifier](#layer-2--awd-lstm-ml-classifier)
  - [Layer 3 — LLM Reasoning Engine](#layer-3--llm-reasoning-engine)
  - [Health Score Algorithm](#health-score-algorithm)
- [🔬 How the Algorithm Works](#-how-the-algorithm-works-step-by-step)
- [📊 Training Data & Model](#-training-data--model-details)
- [🚀 API Endpoints](#-api-endpoints)
- [🗂️ Project Structure](#️-project-structure)
- [⚙️ Tech Stack](#️-tech-stack)
- [🛠️ Local Setup](#️-local-setup)
- [👨‍💻 Author & License](#-author--license)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌳 **AST Analysis** | Parses code into Abstract Syntax Tree — detects deep nesting, long functions, unused vars |
| 🧠 **ML Code Smell Classification** | AWD-LSTM model trained on labeled code snippets classifies code as **Clean** or **Smelly** |
| 🤖 **LLM Code Review** | GPT-class LLM via OpenRouter provides executive summaries, Big-O analysis, refactor strategy |
| 🔢 **Health Score Engine** | Deterministic weighted scoring: `100 - (critical×25 + warning×12 + suggestion×6)` |
| 💬 **Multi-Turn Chat** | Session-based follow-up questions anchored to the same code context |
| 📁 **File Upload** | Supports `.py .java .cpp .c .js .ts .go .rs .php .rb .jsx .tsx` |
| 🐙 **GitHub Repo Scan** | Fetches up to 12 source files from any public repo via GitHub API |
| 📄 **PDF Export** | Download full AI discussion as formatted PDF via ReportLab |
| 🔌 **VS Code Extension** | Inline code review directly inside your editor |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│   │  Code Editor │  │  File Upload │  │   GitHub Repo URL Input  │  │
│   └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
└──────────┼─────────────────┼──────────────────────┼─────────────────┘
           │                 │                       │
           ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     FASTAPI BACKEND (main.py)                        │
│  POST /analyze-editor   POST /analyze-file   POST /analyze-repository│
│  POST /followup         POST /chat           POST /download-pdf      │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    agent_logic.py        │
                    │  (Orchestration Core)    │
                    └──┬──────────┬───────────┘
                       │          │
           ┌───────────▼──┐  ┌────▼──────────────┐
           │ LAYER 1       │  │ LAYER 2            │
           │ AST Analyzer  │  │ ML Smell Classifier│
           │ ast_analyzer  │  │ model_loader.py    │
           │ .py           │  │ (AWD-LSTM FastAI)  │
           └───────────────┘  └────────────────────┘
                       │          │
                       └────┬─────┘
                            │
                  ┌─────────▼─────────┐
                  │    LAYER 3         │
                  │  LLM via OpenRouter│
                  │  (poolside/laguna) │
                  └─────────┬─────────┘
                            │
               ┌────────────▼────────────┐
               │  Quality Report Builder  │
               │  Health Score: 0–100     │
               │  Findings + Fix Hints    │
               └─────────────────────────┘
```

---

## 🤖 ML Pipeline — Deep Dive

CodeSentinel AI uses a **3-layer intelligent analysis pipeline**. Each layer adds progressively deeper insight.

```
╔══════════════════════════════════════════════════════════════════╗
║              CODESENTINEL AI — ML PIPELINE                      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║   INPUT CODE                                                     ║
║       │                                                          ║
║       ▼                                                          ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  LAYER 1 — AST STATIC ANALYSIS          [deterministic] │    ║
║  │  • Parse code → Abstract Syntax Tree                    │    ║
║  │  • Walk every node detecting smells                     │    ║
║  │  • Output: list of tagged findings                      │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║       │                                                          ║
║       ▼                                                          ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  LAYER 2 — AWD-LSTM ML CLASSIFIER       [probabilistic] │    ║
║  │  • Tokenize code as natural language                    │    ║
║  │  • Forward pass through AWD-LSTM network                │    ║
║  │  • Output: {Clean|Smelly, confidence%, all_probs}       │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║       │                                                          ║
║       ▼                                                          ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  LAYER 3 — LLM REASONING ENGINE         [generative]    │    ║
║  │  • Prompt = code + AST findings + ML prediction         │    ║
║  │  • Executive summary + Big-O + Refactor strategy        │    ║
║  │  • Output: structured JSON {answer, optimized_code}     │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║       │                                                          ║
║       ▼                                                          ║
║  ┌─────────────────────────────────────────────────────────┐    ║
║  │  HEALTH SCORE ALGORITHM                 [weighted]      │    ║
║  │  score = 100 − (critical×25 + warning×12 + hint×6)      │    ║
║  │  Output: score/100, severity_counts, fix_suggestions    │    ║
║  └─────────────────────────────────────────────────────────┘    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### Layer 1 — AST Static Analysis Engine

> **File:** [`backend/ast_analyzer.py`](backend/ast_analyzer.py)

The AST (Abstract Syntax Tree) layer is the **fastest, most precise** detector. It parses the raw source code into a tree representation and walks every node.

#### What It Detects

```
SOURCE CODE
    │
    ▼  ast.parse()
┌───────────────────┐
│  ABSTRACT SYNTAX  │
│       TREE        │
│                   │
│  Module           │
│  └─ FunctionDef   │──▶ len(body) > 20?  ──▶ ⚠️ "Function too long"
│     └─ If         │──▶ depth > 3?        ──▶ ⚠️ "Deep nesting"
│        └─ For     │
│     └─ Import     │──▶ always flagged    ──▶ ℹ️ "Verify imports used"
│     └─ Assign     │──▶ track → assigned_vars
│     └─ Name(Load) │──▶ track → used_vars
│                   │
└───────────────────┘
    │
    ▼ Post-pass
assigned_vars − used_vars ──▶ ⚠️ "Variable assigned but never used"
```

#### Nesting Depth Calculation

```python
def _get_nesting_depth(node, current_depth=0):
    # Recursively measures how deep control flow is nested
    # Triggers warning when depth > 3
    if not isinstance(node, (ast.If, ast.For, ast.While, ast.FunctionDef)):
        return current_depth
    depths = [current_depth]
    for child in ast.iter_child_nodes(node):
        depths.append(_get_nesting_depth(child, current_depth + 1))
    return max(depths)
```

**Example detection:**
```python
# ⚠️ Depth = 4 — triggers warning
for item in data:           # depth 1
    if item.active:         # depth 2
        for sub in item.children:  # depth 3
            if sub.valid:   # depth 4  ← FLAGGED
                process(sub)
```

#### AST Detection Rules Table

| Check | Condition | Severity | Message |
|---|---|---|---|
| Function length | `len(body) > 20` | ⚠️ Warning | "Function too long, consider refactoring" |
| Deep nesting | `depth > 3` | ⚠️ Warning | "Deep nesting detected" |
| Imports | Any `Import` node | ℹ️ Info | "Verify import is used" |
| Unused variables | `assigned − used` | ⚠️ Warning | "Variable assigned but never used" |
| Long lines | `len(line) > 100` | 💡 Suggestion | "Break into multiple lines" |
| TODO markers | `"TODO" in line` | 💡 Suggestion | "Unresolved TODO present" |
| range(len) | Pattern match | ⚠️ Warning | "Inefficient index loop" |
| Deep `if` indent | `indent >= 8` | ⚠️ Warning | "Deep nesting at line N" |

---

### Layer 2 — AWD-LSTM ML Classifier

> **Files:** [`backend/model/train_model.py`](backend/model/train_model.py) · [`backend/model/model_loader.py`](backend/model/model_loader.py)

The ML layer treats **source code as natural language** and uses the **AWD-LSTM** (ASGD Weight-Dropped LSTM) architecture via FastAI.

#### What is AWD-LSTM?

```
AWD-LSTM = Averaged SGD Weight-Dropped LSTM

┌─────────────────────────────────────────────────────────────────┐
│                  AWD-LSTM Architecture                           │
│                                                                  │
│  Input Tokens (code as text)                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌──────────────┐                                               │
│  │  Embedding   │  Word vectors for code tokens                 │
│  │  Layer       │  (e.g. "for", "range", "len" → vectors)       │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐   DropConnect on hidden-to-hidden weights     │
│  │  LSTM Layer  │◄──────────────────────────────                │
│  │  (with       │   Prevents co-adaptation of neurons           │
│  │  weight drop)│   Reduces overfitting on small datasets       │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐   LSTM Layer 2                                │
│  │  LSTM Layer  │   Captures longer-range code patterns         │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐   LSTM Layer 3                                │
│  │  LSTM Layer  │   Final sequence representation               │
│  └──────┬───────┘                                               │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐                                               │
│  │  Classifier  │   Linear layers → Softmax                     │
│  │  Head        │   Output: P(Clean), P(Smelly)                 │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Key AWD-LSTM Innovations

| Technique | What it does | Why it helps |
|---|---|---|
| **Weight Drop** | Drops weights on LSTM recurrent connections during training | Prevents overfitting, acts as recurrent dropout |
| **Embedding Dropout** | Drops entire embedding rows | Forces model to handle missing tokens robustly |
| **ASGD Optimizer** | Averaged Stochastic Gradient Descent | More stable convergence than vanilla SGD |
| **Variable-length backprop** | BPTT with random sequence lengths | Better gradient flow through long sequences |

#### Training Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│               TRAINING PIPELINE (train_model.py)                │
│                                                                  │
│  1. LOAD DATA                                                   │
│     pd.read_csv("code_smells.csv")                             │
│     Columns: [code, label]   Labels: ["Clean", "Smelly"]       │
│                                                                  │
│  2. BUILD DATABLOCK                                             │
│     TextBlock.from_df('code', is_lm=False)  ← NLP tokenizer    │
│     CategoryBlock                            ← Classification   │
│     RandomSplitter(0.2)                     ← 80/20 train/val  │
│                                                                  │
│  3. CREATE DATALOADERS                                          │
│     dls = dblock.dataloaders(df, bs=4)      ← batch size 4     │
│                                                                  │
│  4. INITIALIZE LEARNER                                          │
│     text_classifier_learner(dls, AWD_LSTM, metrics=accuracy)   │
│                                                                  │
│  5. FINE-TUNE                                                   │
│     learn.fine_tune(3)   ← 3 epochs of transfer learning       │
│                                                                  │
│  6. EXPORT                                                      │
│     learn.export("export.pkl")  ← serialized inference model   │
└─────────────────────────────────────────────────────────────────┘
```

#### Inference Pipeline

```
CODE STRING (user input)
        │
        ▼
learner = load_learner("export.pkl")          ← load trained model
        │
        ▼
pred, pred_idx, probs = learner.predict(code) ← forward pass
        │
        ▼
┌───────────────────────────────────────┐
│  Return:                               │
│  {                                    │
│    "smell_type":  "Smelly" | "Clean" │  ← predicted class
│    "confidence":  0.0 – 1.0          │  ← P(predicted class)
│    "all_probs":  {                   │
│      "Clean":  0.05,                 │  ← full probability dist
│      "Smelly": 0.95                  │
│    }                                  │
│  }                                    │
└───────────────────────────────────────┘
```

---

### Layer 3 — LLM Reasoning Engine

> **File:** [`backend/agent_logic.py`](backend/agent_logic.py)

The LLM layer is the **generative reasoning brain**. It receives a structured prompt containing the original code, the AST findings, and the ML prediction, then returns rich markdown analysis.

#### Prompt Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    LLM PROMPT STRUCTURE                         │
├────────────────────────────────────────────────────────────────┤
│  SYSTEM ROLE:                                                  │
│  "You are an elite Principal Software Engineer..."             │
│                                                                │
│  USER PROMPT:                                                  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  LANGUAGE:    {detected language}                       │  │
│  │                                                         │  │
│  │  SOURCE CODE:                                           │  │
│  │  ```                                                    │  │
│  │  {user's code}                                          │  │
│  │  ```                                                    │  │
│  │                                                         │  │
│  │  AST FINDINGS:   {list of AST issues}                  │  │
│  │  ML PREDICTION:  {smell_type, confidence, all_probs}   │  │
│  │  USER QUERY:     {what the developer asked}            │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  EXPECTED JSON OUTPUT:                                         │
│  {                                                             │
│    "answer":         "## 1. Executive Summary\n...",          │
│    "optimized_code": "<refactored code or empty string>"      │
│  }                                                             │
└────────────────────────────────────────────────────────────────┘
```

#### LLM Response Sections

```
┌─────────────────────────────────────────────────────────────────┐
│            STRUCTURED LLM ANALYSIS OUTPUT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ### 1. 🔍 Executive Summary & Architecture Overview            │
│       What the code does, overall structural quality            │
│                                                                  │
│  ### 2. ⚠️ Critical Code Smells & Anti-Patterns Identified     │
│       • Specific line references                                │
│       • Why each issue is problematic                           │
│       • Memory overhead, redundant ops, dead code               │
│                                                                  │
│  ### 3. ⚡ Algorithmic Time & Space Complexity Analysis         │
│       • Big-O for every function                                │
│       • Overall time complexity                                 │
│       • Auxiliary memory and allocation analysis                │
│                                                                  │
│  ### 4. 🛠️ Step-by-Step Remediation Strategy                  │
│       • Concrete architectural best practices                   │
│       • Clean-code refactoring principles                       │
│       • Actionable steps to fix each flaw                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Language Detection Logic

```
Code String
    │
    ├─ contains "import java" or "public class" ──▶ java
    ├─ contains "#include"                       ──▶ cpp
    ├─ contains "console.log" or "function "    ──▶ javascript
    ├─ contains "def "                           ──▶ python
    └─ default                                  ──▶ plaintext
```

#### Intent Detection (Optimize vs. Explain)

```python
keywords = ("optimize", "optimized", "improve", "improved",
            "refactor", "refactoring", "fix", "correct",
            "rewrite", "cleaner code")

wants_optimized_code(user_query)
    │
    ├─ True  ──▶ Prompt asks LLM to fill "optimized_code" field
    │           ──▶ LLM code validated with ast.parse()
    │           ──▶ Falls back to deterministic local optimizer if invalid
    │
    └─ False ──▶ "optimized_code" = "" in response
```

---

### Health Score Algorithm

> **File:** [`backend/agent_logic.py → build_quality_report()`](backend/agent_logic.py)

The health score is a **deterministic weighted formula** that aggregates all findings into a single 0–100 score.

```
╔═══════════════════════════════════════════════════════════╗
║              HEALTH SCORE FORMULA                         ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║   health_score = max(0,                                  ║
║     100                                                  ║
║     − (critical_count   × 25)                           ║
║     − (warning_count    × 12)                           ║
║     − (suggestion_count ×  6)                           ║
║   )                                                       ║
║                                                           ║
╠═══════════════════════════════════════════════════════════╣
║  Severity    │ Weight │ Meaning                           ║
║  ────────────┼────────┼──────────────────────────────    ║
║  🔴 Critical  │  −25   │ Syntax errors, security issues   ║
║  🟡 Warning   │  −12   │ Code smells, deep nesting        ║
║  🔵 Suggestion│   −6   │ Style, long lines, TODOs         ║
║  ⚪ Info      │    0   │ Informational only               ║
╚═══════════════════════════════════════════════════════════╝
```

**Score interpretation:**

```
  100 ████████████████████  Perfect — no issues
   90 ████████████████████  Excellent
   75 ███████████████░░░░░  Good — minor suggestions
   50 ██████████░░░░░░░░░░  Fair — several warnings
   25 █████░░░░░░░░░░░░░░░  Poor — critical issues present
    0 ░░░░░░░░░░░░░░░░░░░░  Critical failures detected
```

---

## 🔬 How the Algorithm Works: Step by Step

Here is the **full end-to-end execution flow** for a single `/analyze-editor` request:

```
Step 1:  User pastes code + asks a question
              │
              ▼
Step 2:  FastAPI receives POST /analyze-editor
         { code: "...", user_query: "...", session_id: null }
              │
              ▼
Step 3:  agent_logic.analyze_user_query() is called
              │
              ├──▶ Step 3a: create_session(code)
              │            → assigns UUID session_id
              │            → stores code in _sessions dict
              │
              ├──▶ Step 3b: analyze_ast(code)
              │            → Python ast.parse(code)
              │            → ast.walk(tree) for all nodes
              │            → Returns: ["⚠️ Deep nesting...", "⚠️ range(len...)"]
              │
              ├──▶ Step 3c: predict_code_smell(code)
              │            → load_learner("export.pkl")
              │            → learner.predict(code)
              │            → Returns: {smell_type, confidence, all_probs}
              │
              ├──▶ Step 3d: detect_language(code)
              │            → Keyword heuristic scan
              │            → Returns: "python" | "java" | "cpp" | ...
              │
              ├──▶ Step 3e: wants_optimized_code(user_query)
              │            → Keyword intent scan
              │            → Returns: True | False
              │
              ├──▶ Step 3f: call_llm(prompt)
              │            → Build structured prompt with code + findings
              │            → POST to OpenRouter API
              │            → Returns: JSON { answer, optimized_code }
              │
              ├──▶ Step 3g: extract_llm_payload(response)
              │            → Parse JSON from LLM response
              │            → Extract answer text and optimized code block
              │
              ├──▶ Step 3h: Validate optimized_code
              │            → ast.parse(optimized_code) if python
              │            → Fallback to local_optimized_code() if invalid
              │
              └──▶ Step 3i: build_quality_report()
                           → Map AST findings → severity levels
                           → Compute health_score
                           → Build fix_suggestions list
              │
              ▼
Step 4:  Return JSON response to frontend
         {
           session_id,       ← for follow-up questions
           ast_findings,     ← raw AST issues list
           model_prediction, ← ML classification result
           llm_response,     ← structured markdown analysis
           optimized_code,   ← refactored code (if requested)
           language,         ← detected language
           quality_report    ← { health_score, severity_counts,
                                  findings, fix_suggestions }
         }
              │
              ▼
Step 5:  Frontend renders Results panel
         • Health score gauge (0–100)
         • Severity breakdown
         • ML confidence badge
         • Markdown-rendered LLM analysis
         • Optimized code diff panel (if present)
         • Follow-up chat interface
```

---

## 📊 Training Data & Model Details

### Dataset: `code_smells.csv`

> **File:** [`backend/model/code_smells.csv`](backend/model/code_smells.csv)

The dataset contains labeled Python code snippets with two columns:

| Column | Type | Description |
|---|---|---|
| `code` | string | Raw Python code snippet |
| `label` | string | `"Clean"` or `"Smelly"` |

**Examples from the training set:**

| Code | Label | Reason |
|---|---|---|
| `for i in range(len(arr)): print(arr[i])` | 🔴 Smelly | Inefficient index loop |
| `for x in arr: print(x)` | 🟢 Clean | Pythonic direct iteration |
| `if x == True: print('ok')` | 🔴 Smelly | Redundant boolean comparison |
| `if x: print('ok')` | 🟢 Clean | Idiomatic truthiness check |
| `try: x=1/0\nexcept: pass` | 🔴 Smelly | Bare except — swallows all errors |
| `try:\n    x=1/0\nexcept ZeroDivisionError:\n    print('error')` | 🟢 Clean | Specific exception handling |
| `print('debug')` | 🔴 Smelly | Debug print in production code |
| `logging.info('Task completed')` | 🟢 Clean | Proper logging practice |

### Model Specifications

| Property | Value |
|---|---|
| Architecture | AWD-LSTM (3 LSTM layers) |
| Framework | FastAI `text_classifier_learner` |
| Tokenizer | FastAI `TextBlock` (subword tokenization) |
| Train/Val split | 80% / 20% (RandomSplitter) |
| Batch size | 4 |
| Epochs | 3 (fine_tune) |
| Optimizer | ASGD (Averaged SGD) |
| Metric | Accuracy |
| Output classes | `["Clean", "Smelly"]` |
| Export format | `export.pkl` (FastAI serialized learner) |

---

## 🚀 API Endpoints

Base URL: `https://rigelai.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health ping |
| `GET` | `/health` | Status check |
| `POST` | `/analyze-editor` | Analyze code pasted in editor |
| `POST` | `/analyze-file` | Analyze uploaded source file |
| `POST` | `/analyze-repository` | Scan a public GitHub repository |
| `POST` | `/followup` | Ask follow-up question in session |
| `POST` | `/chat` | General programming Q&A (no code) |
| `POST` | `/download-pdf` | Export AI discussion as PDF |

**Request/Response example — `/analyze-editor`:**

```json
// REQUEST
POST /analyze-editor
{
  "code": "for i in range(len(arr)): print(arr[i])",
  "user_query": "What is wrong with this code?",
  "session_id": null
}

// RESPONSE
{
  "llm_analysis": {
    "session_id": "f3a1-...",
    "ast_findings": ["Inefficient loop using range(len(...))"],
    "model_prediction": {
      "smell_type": "Smelly",
      "confidence": 0.95,
      "all_probs": { "Clean": 0.05, "Smelly": 0.95 }
    },
    "llm_response": "### 1. 🔍 Executive Summary\n...",
    "optimized_code": "",
    "language": "python",
    "quality_report": {
      "health_score": 88,
      "severity_counts": { "critical": 0, "warning": 1, "suggestion": 0, "info": 0 },
      "findings": [...],
      "fix_suggestions": [...]
    }
  }
}
```

---

## 🗂️ Project Structure

```
CodeSentinel-AI/
│
├── backend/                          # FastAPI Python backend
│   ├── main.py                       # API server & route handlers
│   ├── agent_logic.py                # Core orchestration: AST + ML + LLM
│   ├── ast_analyzer.py               # Deep AST-based static analysis
│   ├── session_store.py              # Multi-turn chat session management
│   ├── requirements.txt              # Python dependencies
│   ├── runtime.txt                   # Python version for deployment
│   ├── .env                          # API keys (not committed)
│   │
│   ├── model/                        # ML model directory
│   │   ├── code_smells.csv           # Labeled training dataset
│   │   ├── train_model.py            # AWD-LSTM training script
│   │   └── model_loader.py           # FastAI inference loader
│   │
│   └── pdfs/                         # Temporarily generated PDF exports
│
├── frontend/                         # React + Vite frontend
│   ├── src/
│   │   ├── components/               # UI components
│   │   │   ├── CodeInputPanel.jsx    # Code editor with Monaco-style input
│   │   │   ├── Chatbot.jsx           # Multi-turn AI chat interface
│   │   │   ├── FileUpload.jsx        # Drag-and-drop file uploader
│   │   │   ├── Navbar.jsx            # Top navigation bar
│   │   │   ├── Results.jsx           # Analysis results panel
│   │   │   └── IdeIntegrationModal.jsx # VS Code extension setup guide
│   │   ├── pages/
│   │   │   └── Home.jsx              # Main application page
│   │   ├── services/
│   │   │   └── api.js                # Axios API call wrappers
│   │   ├── App.jsx                   # Root React component
│   │   └── main.jsx                  # React entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── vscode-extension/                 # VS Code extension
│   ├── src/
│   │   └── extension.js              # Extension activation & commands
│   ├── package.json
│   └── README.md
│
├── CodeXGLUE/                        # CodeXGLUE benchmark reference data
├── .gitignore
└── README.md                         # This file
```

---

## ⚙️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI |
| **Vite** | Fast dev server & bundler |
| **Axios / Fetch API** | API communication |
| **CSS Modules** | Scoped styling |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | Async Python web framework |
| **Uvicorn** | ASGI server |
| **Pydantic** | Request validation & schemas |
| **ReportLab** | PDF generation |
| **python-multipart** | File upload support |

### AI & ML
| Technology | Purpose |
|---|---|
| **FastAI** | AWD-LSTM text classifier framework |
| **PyTorch** | Tensor computation backend for FastAI |
| **OpenAI SDK** | HTTP client to OpenRouter API |
| **OpenRouter** | Unified LLM gateway (poolside/laguna) |
| **Python `ast`** | Built-in AST parser for static analysis |

### Deployment
| Service | Layer |
|---|---|
| **Vercel** | Frontend hosting + CDN |
| **Render** | Backend API hosting |

---

## 🛠️ Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- An [OpenRouter](https://openrouter.ai) API key

### 1. Clone the repo

```bash
git clone https://github.com/saurabh-yadav/CodeSentinel-AI.git
cd CodeSentinel-AI
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

Create `.env` file:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=poolside/laguna-m.1:free
GITHUB_TOKEN=your_github_token_here   # optional, for repo scanning
```

Run backend:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at: `http://localhost:5173`
API runs at: `http://localhost:8000`

### 4. Train ML Model (optional)

```bash
cd backend/model
python train_model.py
# Outputs: export.pkl
```

---

## 👨‍💻 Author & License

**Author**: Saurabh Yadav
**B.Tech CSE** (AI Driven Language Technology) — Koneru Lakshmaiah University
**Portfolio**: [wraithklu.vercel.app](https://wraithklu.vercel.app)

**Repository**: [github.com/saurabh-yadav/CodeSentinel-AI](https://github.com/saurabh-yadav/CodeSentinel-AI)

**License**: This project is open-source software licensed under the **[MIT License](LICENSE)**.

---

<div align="center">

⭐ **If you found CodeSentinel AI useful, please give it a star on GitHub!** ⭐

[![GitHub stars](https://img.shields.io/github/stars/saurabh-yadav/CodeSentinel-AI?style=social)](https://github.com/saurabh-yadav/CodeSentinel-AI)

*Built with ❤️ by Saurabh Yadav*

</div>
