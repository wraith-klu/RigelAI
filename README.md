<div align="center">

# 🛡️ CodeSentinel AI
### AI-Powered Code Analysis Platform
#### AST &nbsp;·&nbsp; Machine Learning &nbsp;·&nbsp; LLM &nbsp;—&nbsp; Detect &nbsp;|&nbsp; Analyze &nbsp;|&nbsp; Optimize

<br/>

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-Vercel-00C7B7?style=for-the-badge&logo=vercel)](https://rigelai-agent.vercel.app/)
[![Backend API](https://img.shields.io/badge/⚡%20Backend%20API-Render-46E3B7?style=for-the-badge&logo=render)](https://rigelai.onrender.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![FastAI](https://img.shields.io/badge/FastAI-AWD--LSTM-FF6F00?style=for-the-badge&logo=pytorch&logoColor=white)](https://docs.fast.ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge)](LICENSE)

<br/>

> **CodeSentinel AI** is an intelligent, multi-layered code analysis platform that fuses **AST static analysis**, **AWD-LSTM machine learning**, and **Large Language Model reasoning** to detect code smells, assess code health, and generate optimized refactors — in real time.

</div>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [🤖 ML Pipeline — Deep Dive](#-ml-pipeline--deep-dive)
  - [Layer 1 — AST Static Analysis](#-layer-1--ast-static-analysis-engine)
  - [Layer 2 — AWD-LSTM Classifier](#-layer-2--awd-lstm-ml-classifier)
  - [Layer 3 — LLM Reasoning Engine](#-layer-3--llm-reasoning-engine)
  - [Health Score Algorithm](#-health-score-algorithm)
- [🔬 End-to-End Request Flow](#-end-to-end-request-flow)
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
| 🌳 **AST Analysis** | Parses code into an Abstract Syntax Tree — detects deep nesting, long functions, unused variables |
| 🧠 **ML Code Smell Classifier** | AWD-LSTM model trained on labeled code snippets; classifies as **Clean** or **Smelly** with confidence |
| 🤖 **LLM Code Review** | GPT-class LLM via OpenRouter delivers executive summary, Big-O analysis, and a step-by-step refactor plan |
| 🔢 **Health Score Engine** | Deterministic weighted formula — `100 − (critical×25 + warning×12 + suggestion×6)` |
| 💬 **Multi-Turn Chat** | Session-based follow-up questions anchored to the same code context |
| 📁 **File Upload** | Supports `.py .java .cpp .c .js .ts .go .rs .php .rb .jsx .tsx` |
| 🐙 **GitHub Repo Scan** | Fetches up to 12 source files from any public repo via GitHub API |
| 📄 **PDF Export** | Download full AI discussion as a formatted PDF via ReportLab |
| 🔌 **VS Code Extension** | Inline code review directly inside your editor |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph UI["🖥️ User Interface (React 18 + Vite)"]
        A["📝 Code Editor\nPaste / Type Code"]
        B["📁 File Upload\n.py .js .java .cpp ..."]
        C["🐙 GitHub Repo URL\nPublic Repository"]
    end

    subgraph API["⚡ FastAPI Backend (main.py)"]
        D["/analyze-editor"]
        E["/analyze-file"]
        F["/analyze-repository"]
        G["/followup · /chat · /download-pdf"]
    end

    subgraph CORE["🧠 Agent Logic — Orchestration Core (agent_logic.py)"]
        H["🔑 Session Manager\ncreate · get · update"]
        I["🌳 AST Analyzer\nast_analyzer.py"]
        J["🤖 ML Classifier\nAWD-LSTM Model\nmodel_loader.py"]
        K["💬 LLM Engine\nOpenRouter API\npoolside/laguna"]
        L["📊 Report Builder\nbuild_quality_report()"]
    end

    subgraph OUT["📤 Structured Response"]
        M["Health Score\n0 – 100"]
        N["Severity Counts\ncritical · warning · suggestion"]
        O["LLM Markdown Analysis\nSummary + Big-O + Fix Plan"]
        P["Optimized Code\nRefactored Snippet"]
    end

    A --> D
    B --> E
    C --> F
    D & E & F --> H
    H --> I
    H --> J
    I & J --> K
    K --> L
    L --> M & N & O & P

    style UI fill:#1e3a5f,color:#ffffff,stroke:#00d9ff,stroke-width:2px
    style API fill:#1a3a2a,color:#ffffff,stroke:#00ff88,stroke-width:2px
    style CORE fill:#3a1a3a,color:#ffffff,stroke:#ff88ff,stroke-width:2px
    style OUT fill:#3a2a00,color:#ffffff,stroke:#ffcc00,stroke-width:2px
```

---

## 🤖 ML Pipeline — Deep Dive

CodeSentinel AI uses a **3-layer intelligent analysis pipeline**. Each layer adds progressively deeper insight.

```mermaid
flowchart LR
    INPUT["🖊️ Raw Source Code\n(any language)"]

    subgraph L1["🌳 LAYER 1 — AST Static Analysis\nDeterministic · Zero latency"]
        AST_PARSE["ast.parse(code)\n→ Syntax Tree"]
        AST_WALK["ast.walk(tree)\n→ Node traversal"]
        AST_OUT["Tagged Findings List\n⚠️ warnings · ℹ️ info"]
        AST_PARSE --> AST_WALK --> AST_OUT
    end

    subgraph L2["🧠 LAYER 2 — AWD-LSTM Classifier\nProbabilistic · ~50ms"]
        ML_TOK["Subword Tokenizer\ncode → token IDs"]
        ML_LSTM["AWD-LSTM Network\n3 stacked LSTM layers"]
        ML_SOFT["Softmax Head\n→ P(Clean), P(Smelly)"]
        ML_TOK --> ML_LSTM --> ML_SOFT
    end

    subgraph L3["💬 LAYER 3 — LLM Reasoning\nGenerative · ~2–5s"]
        LLM_PROMPT["Structured Prompt\ncode + AST + ML prediction"]
        LLM_CALL["OpenRouter API Call\npoolside/laguna-m.1"]
        LLM_JSON["JSON Response\n{answer, optimized_code}"]
        LLM_PROMPT --> LLM_CALL --> LLM_JSON
    end

    subgraph SCORE["📊 Health Score Engine\nWeighted · Deterministic"]
        SCORE_CALC["score = 100\n− critical×25\n− warning×12\n− suggestion×6"]
        SCORE_OUT["Health Score\n0 – 100"]
        SCORE_CALC --> SCORE_OUT
    end

    INPUT --> L1
    INPUT --> L2
    L1 --> L3
    L2 --> L3
    L1 --> SCORE
    L3 --> FINAL["✅ Full Analysis Response"]
    SCORE --> FINAL

    style L1 fill:#0d3b66,color:#fff,stroke:#4fc3f7,stroke-width:2px
    style L2 fill:#1b5e20,color:#fff,stroke:#69f0ae,stroke-width:2px
    style L3 fill:#4a148c,color:#fff,stroke:#ce93d8,stroke-width:2px
    style SCORE fill:#bf360c,color:#fff,stroke:#ffab40,stroke-width:2px
    style FINAL fill:#1a237e,color:#fff,stroke:#82b1ff,stroke-width:3px
```

---

### 🌳 Layer 1 — AST Static Analysis Engine

> **File:** [`backend/ast_analyzer.py`](backend/ast_analyzer.py)

The AST layer is the **fastest, most precise** detector. It parses source code into a tree and inspects every single node.

```mermaid
flowchart TD
    CODE["📄 Source Code String"]
    PARSE["ast.parse(code)\nBuilds Syntax Tree"]
    WALK["ast.walk(tree)\nTraverse every node"]

    PARSE_ERR["❌ SyntaxError\nReturn error finding"]

    subgraph CHECKS["🔍 Node-Level Checks"]
        C1["FunctionDef node\nlen(body) > 20 lines?\n→ ⚠️ Function too long"]
        C2["If / For / While node\nnesting depth > 3?\n→ ⚠️ Deep nesting"]
        C3["Import / ImportFrom node\n→ ℹ️ Verify import used"]
        C4["Assign node\ntrack → assigned_vars set"]
        C5["Name(Load) node\ntrack → used_vars set"]
    end

    POST["Post-processing\nassigned_vars − used_vars"]
    UNUSED["⚠️ Variable assigned\nbut never used"]
    INLINE["Inline pattern scan\nrange(len(  ·  **2  ·  indent≥8"]
    RESULT["📋 Issues List\n[ findings... ]"]

    CODE --> PARSE
    PARSE -->|"Success"| WALK
    PARSE -->|"Fail"| PARSE_ERR
    WALK --> CHECKS
    C4 & C5 --> POST --> UNUSED
    WALK --> INLINE
    C1 & C2 & C3 & UNUSED & INLINE --> RESULT

    style CODE fill:#0d47a1,color:#fff,stroke:#42a5f5
    style PARSE fill:#006064,color:#fff,stroke:#4dd0e1
    style WALK fill:#006064,color:#fff,stroke:#4dd0e1
    style CHECKS fill:#1b5e20,color:#fff,stroke:#a5d6a7
    style POST fill:#4a148c,color:#fff,stroke:#ce93d8
    style RESULT fill:#bf360c,color:#fff,stroke:#ffab40
    style PARSE_ERR fill:#b71c1c,color:#fff,stroke:#ef9a9a
```

#### Detection Rules Reference

| # | Node Type | Condition | Severity | Output Message |
|---|---|---|---|---|
| 1 | `FunctionDef` | `len(body) > 20` | ⚠️ Warning | Function `'name'` is too long — consider refactoring |
| 2 | `If / For / While` | `depth > 3` | ⚠️ Warning | Deep nesting detected (depth N) |
| 3 | `Import` | Always | ℹ️ Info | Imported module `'x'` — ensure it's used |
| 4 | `ImportFrom` | Always | ℹ️ Info | From-import `'module'` — verify names used |
| 5 | `Assign` vs `Name(Load)` | assigned − used ≠ ∅ | ⚠️ Warning | Variable `'x'` assigned but never used |
| 6 | Line length | `len(line) > 100` | 💡 Suggestion | Line longer than 100 characters |
| 7 | Comment marker | `"TODO" in line` | 💡 Suggestion | Unresolved TODO present |
| 8 | Pattern match | `"range(len("` in code | ⚠️ Warning | Inefficient loop using `range(len(...))` |
| 9 | Indentation | `indent >= 8 + "if "` | ⚠️ Warning | Deep nesting at line N |

---

### 🧠 Layer 2 — AWD-LSTM ML Classifier

> **Files:** [`backend/model/train_model.py`](backend/model/train_model.py) · [`backend/model/model_loader.py`](backend/model/model_loader.py)

The ML layer treats **source code as natural language text** and classifies it using the **AWD-LSTM** architecture (ASGD Weight-Dropped LSTM) via FastAI.

#### Network Architecture

```mermaid
flowchart TD
    IN["🖊️ Code String Input\ne.g. 'for i in range(len(arr)):...'"]

    subgraph TOKENIZE["📝 Tokenization Layer"]
        T1["FastAI TextBlock Tokenizer\nSubword splitting"]
        T2["Numericalize\ntoken → integer IDs"]
        T1 --> T2
    end

    subgraph EMBED["🔷 Embedding Layer"]
        E1["Learnable Embeddings\ntoken IDs → dense vectors"]
        E2["Embedding Dropout\nRandomly zero entire token rows\nPrevents over-reliance on specific tokens"]
        E1 --> E2
    end

    subgraph LSTM1["🟢 LSTM Layer 1"]
        L1A["LSTM Cell\nCaptures local patterns\n'range(len' → smell signal"]
        L1B["Weight Drop\nDropConnect on hidden weights\nRecurrent regularization"]
        L1A --- L1B
    end

    subgraph LSTM2["🟡 LSTM Layer 2"]
        L2A["LSTM Cell\nCaptures medium-range patterns\nif-nesting, variable re-use"]
        L2B["Weight Drop\nDropConnect on hidden weights"]
        L2A --- L2B
    end

    subgraph LSTM3["🔴 LSTM Layer 3"]
        L3A["LSTM Cell\nCaptures global code structure\noverall function shape"]
        L3B["Weight Drop\nDropConnect on hidden weights"]
        L3A --- L3B
    end

    subgraph HEAD["🎯 Classifier Head"]
        H1["Average Pool + Last Hidden\nAggregated sequence repr."]
        H2["Linear → ReLU → Dropout"]
        H3["Linear → Softmax\nOutput: 2 classes"]
        H1 --> H2 --> H3
    end

    OUT["📊 Output Probabilities\n{\n  'Clean':  0.05,\n  'Smelly': 0.95\n}\nPrediction: Smelly (95% conf.)"]

    IN --> TOKENIZE --> EMBED --> LSTM1 --> LSTM2 --> LSTM3 --> HEAD --> OUT

    style IN fill:#0d47a1,color:#fff,stroke:#42a5f5
    style TOKENIZE fill:#004d40,color:#fff,stroke:#4db6ac
    style EMBED fill:#1b5e20,color:#fff,stroke:#81c784
    style LSTM1 fill:#1a5e20,color:#fff,stroke:#66bb6a
    style LSTM2 fill:#f57f17,color:#fff,stroke:#ffca28
    style LSTM3 fill:#b71c1c,color:#fff,stroke:#ef9a9a
    style HEAD fill:#4a148c,color:#fff,stroke:#ce93d8
    style OUT fill:#1a237e,color:#fff,stroke:#82b1ff
```

#### AWD-LSTM Key Innovations

| Technique | What It Does | Benefit |
|---|---|---|
| **Weight Drop** | Applies dropout to LSTM recurrent weight matrices | Prevents co-adaptation; acts as recurrent regularization |
| **Embedding Dropout** | Zeros entire embedding rows at random | Forces robustness to unseen/rare tokens |
| **ASGD Optimizer** | Averages model weights across recent steps | More stable convergence than plain SGD/Adam |
| **Variable-length BPTT** | Randomizes backprop sequence length | Better gradient flow through long code sequences |
| **Gradual Unfreezing** | Unfreezes layers one-by-one during fine_tune | Preserves pre-trained language representations |

#### Training Pipeline

```mermaid
flowchart LR
    subgraph DATA["📂 Data Preparation"]
        D1["Load code_smells.csv\npd.read_csv()"]
        D2["Validate columns\n'code' · 'label'"]
        D3["DataBlock\nTextBlock.from_df + CategoryBlock"]
        D4["RandomSplitter(0.2)\n80% train · 20% validation"]
        D5["DataLoaders\nbatch_size = 4"]
        D1 --> D2 --> D3 --> D4 --> D5
    end

    subgraph TRAIN["🏋️ Model Training"]
        T1["text_classifier_learner\ndls + AWD_LSTM + accuracy metric"]
        T2["learn.fine_tune(3)\n3 epochs of transfer learning\nGradual layer unfreezing"]
        T3["Track Accuracy\nTrain loss · Val loss"]
        T1 --> T2 --> T3
    end

    subgraph SAVE["💾 Export"]
        S1["learn.export('export.pkl')\nFull learner serialized\n(weights + vocab + config)"]
    end

    DATA --> TRAIN --> SAVE

    style DATA fill:#0d3b66,color:#fff,stroke:#4fc3f7
    style TRAIN fill:#1b5e20,color:#fff,stroke:#69f0ae
    style SAVE fill:#4a148c,color:#fff,stroke:#ce93d8
```

#### Inference Flow

```mermaid
sequenceDiagram
    participant U as 🖊️ User Code
    participant ML as 🧠 model_loader.py
    participant M as 📦 export.pkl
    participant R as 📤 Result

    U->>ML: predict_code_smell(code)
    ML->>M: load_learner(model_path)
    M-->>ML: FastAI Learner object
    ML->>M: learner.predict(code)
    Note over M: Tokenize → Forward Pass → Softmax
    M-->>ML: (pred, pred_idx, probs)
    ML->>R: Return JSON
    Note over R: {<br/>  smell_type: "Smelly",<br/>  confidence: 0.95,<br/>  all_probs: {Clean: 0.05, Smelly: 0.95}<br/>}
```

---

### 💬 Layer 3 — LLM Reasoning Engine

> **File:** [`backend/agent_logic.py`](backend/agent_logic.py)

The LLM receives a **structured multi-context prompt** combining the code, AST findings, and ML prediction, then returns a rich structured JSON response.

#### Prompt Construction Flow

```mermaid
flowchart TD
    subgraph INPUTS["📥 Inputs Gathered"]
        I1["📄 Original Source Code"]
        I2["🌳 AST Findings List\n['⚠️ Deep nesting...','⚠️ range(len...)']"]
        I3["🤖 ML Prediction\n{smell_type, confidence, all_probs}"]
        I4["🗣️ Developer's Question\n'What is wrong? Refactor this.'"]
        I5["🔤 Detected Language\n'python' | 'java' | 'cpp' ..."]
    end

    subgraph INTENT["🎯 Intent Detection"]
        K["wants_optimized_code(query)\nKeyword scan:\noptimize · refactor · fix\nimprove · rewrite · cleaner"]
        YES["✅ Generate optimized_code\nfill 'optimized_code' field"]
        NO["❌ Explain only\noptimized_code = ''"]
        K -->|match| YES
        K -->|no match| NO
    end

    subgraph PROMPT["📝 Prompt Assembly"]
        P["System Role:\n'Principal Software Engineer'\n\nUser Prompt:\nLANGUAGE: {lang}\nSOURCE CODE: ```{code}```\nAST FINDINGS: {findings}\nML PREDICTION: {prediction}\nUSER QUERY: {query}\n\nExpected Output Schema:\n{answer, optimized_code}"]
    end

    subgraph LLM_CALL["🌐 LLM API Call"]
        L["POST openrouter.ai/api/v1/chat\nmodel: poolside/laguna-m.1:free\ntemperature: 0.15\nmax_tokens: 3000"]
    end

    subgraph PARSE["🔍 Response Parsing"]
        PJ["extract_llm_payload(response)\nParse JSON from LLM text"]
        PV["Validate optimized_code\nast.parse() if python"]
        PF["Fallback:\nlocal_optimized_code()"]
        PJ --> PV
        PV -->|"invalid"| PF
    end

    INPUTS --> INTENT --> PROMPT --> LLM_CALL --> PARSE

    style INPUTS fill:#0d3b66,color:#fff,stroke:#4fc3f7
    style INTENT fill:#4a148c,color:#fff,stroke:#ce93d8
    style PROMPT fill:#1b5e20,color:#fff,stroke:#69f0ae
    style LLM_CALL fill:#bf360c,color:#fff,stroke:#ffab40
    style PARSE fill:#1a237e,color:#fff,stroke:#82b1ff
```

#### LLM Response Structure

```mermaid
flowchart LR
    JSON["LLM JSON Response"]

    subgraph ANSWER["📝 'answer' field — Markdown"]
        A1["### 1. 🔍 Executive Summary\nWhat the code does · Structural quality"]
        A2["### 2. ⚠️ Code Smells & Anti-Patterns\nLine references · Why each is problematic\nMemory overhead · Dead code · Bad naming"]
        A3["### 3. ⚡ Complexity Analysis\nTime Complexity: O(n²) per function\nSpace Complexity: O(n) auxiliary"]
        A4["### 4. 🛠️ Remediation Strategy\nArchitectural best practices\nClean-code refactoring steps"]
    end

    subgraph OPT["💡 'optimized_code' field"]
        O1["Production-grade refactored code\n(only if user asked to optimize/fix/refactor)"]
    end

    JSON --> ANSWER
    JSON --> OPT

    style JSON fill:#0d47a1,color:#fff,stroke:#42a5f5
    style ANSWER fill:#1b5e20,color:#fff,stroke:#81c784
    style OPT fill:#4a148c,color:#fff,stroke:#ce93d8
```

#### Language Detection Algorithm

```mermaid
flowchart TD
    CODE["Source Code String"]
    C1{"contains\n'import java'\nor 'public class'?"}
    C2{"contains\n'#include'?"}
    C3{"contains\n'console.log'\nor 'function '?"}
    C4{"contains\n'def '?"}
    R1["☕ java"]
    R2["⚙️ cpp"]
    R3["🌐 javascript"]
    R4["🐍 python"]
    R5["📄 plaintext"]

    CODE --> C1
    C1 -->|Yes| R1
    C1 -->|No| C2
    C2 -->|Yes| R2
    C2 -->|No| C3
    C3 -->|Yes| R3
    C3 -->|No| C4
    C4 -->|Yes| R4
    C4 -->|No| R5

    style CODE fill:#0d47a1,color:#fff,stroke:#42a5f5
    style R1 fill:#e65100,color:#fff,stroke:#ffb74d
    style R2 fill:#37474f,color:#fff,stroke:#90a4ae
    style R3 fill:#f9a825,color:#000,stroke:#ffd54f
    style R4 fill:#1565c0,color:#fff,stroke:#64b5f6
    style R5 fill:#424242,color:#fff,stroke:#9e9e9e
```

---

### 📊 Health Score Algorithm

> **File:** [`backend/agent_logic.py → build_quality_report()`](backend/agent_logic.py)

```mermaid
flowchart TD
    F["📋 All Findings List\n(from AST + inline pattern checks)"]

    subgraph MAP["🗺️ Severity Mapping"]
        M1["'syntax error' → 🔴 critical"]
        M2["'deep nesting' / 'range(len' → 🟡 warning"]
        M3["'square' / 'long line' / 'TODO' → 🔵 suggestion"]
        M4["'no major issue' → ⚪ info"]
    end

    subgraph COUNT["🔢 Count per Severity"]
        CC["critical_count  × 25"]
        WC["warning_count   × 12"]
        SC["suggestion_count × 6"]
        IC["info_count       × 0"]
    end

    FORMULA["health_score = max(0,\n100 − critical×25 − warning×12 − suggestion×6)"]

    subgraph BANDS["🎨 Score Bands"]
        B1["🟢 90–100 · Excellent — ship it"]
        B2["🔵 75–89  · Good — minor polish"]
        B3["🟡 50–74  · Fair — address warnings"]
        B4["🟠 25–49  · Poor — critical refactor needed"]
        B5["🔴 0–24   · Critical — do not ship"]
    end

    OUT["📤 quality_report {\n  health_score,\n  severity_counts,\n  findings[],\n  fix_suggestions[]\n}"]

    F --> MAP --> COUNT --> FORMULA --> BANDS --> OUT

    style F fill:#0d3b66,color:#fff,stroke:#4fc3f7
    style MAP fill:#1b5e20,color:#fff,stroke:#69f0ae
    style COUNT fill:#4a148c,color:#fff,stroke:#ce93d8
    style FORMULA fill:#bf360c,color:#fff,stroke:#ffab40
    style BANDS fill:#1a237e,color:#fff,stroke:#82b1ff
    style OUT fill:#004d40,color:#fff,stroke:#4db6ac
```

**Severity weights at a glance:**

| Severity | Weight | Meaning | Max impact |
|---|---|---|---|
| 🔴 **Critical** | `−25` | Syntax errors, catastrophic bugs | 4 criticals → score 0 |
| 🟡 **Warning** | `−12` | Code smells, deep nesting, bad loops | 8 warnings → score 4 |
| 🔵 **Suggestion** | `−6` | Long lines, TODOs, style issues | 16 suggestions → score 4 |
| ⚪ **Info** | `0` | Informational notes only | No penalty |

---

## 🔬 End-to-End Request Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as 🖥️ React Frontend
    participant API as ⚡ FastAPI (main.py)
    participant ORCH as 🧠 agent_logic.py
    participant AST as 🌳 AST Analyzer
    participant ML as 🤖 ML Model
    participant LLM as 💬 OpenRouter LLM
    participant SCORE as 📊 Report Builder

    User->>FE: Paste code + ask question
    FE->>API: POST /analyze-editor {code, user_query}

    API->>ORCH: analyze_user_query(code, query)

    ORCH->>ORCH: create_session(code) → UUID

    par AST Analysis
        ORCH->>AST: analyze_ast(code)
        AST-->>ORCH: ["⚠️ Deep nesting", "⚠️ range(len...)"]
    and ML Classification
        ORCH->>ML: predict_code_smell(code)
        ML-->>ORCH: {smell_type: "Smelly", confidence: 0.95}
    end

    ORCH->>ORCH: detect_language(code) → "python"
    ORCH->>ORCH: wants_optimized_code(query) → True/False

    ORCH->>LLM: call_llm(structured prompt)
    Note over LLM: code + AST findings + ML result<br/>temperature=0.15, max_tokens=3000
    LLM-->>ORCH: {answer: "### 1. Executive...", optimized_code: "..."}

    ORCH->>ORCH: extract_llm_payload() + validate code
    ORCH->>SCORE: build_quality_report(code, findings, optimized)
    SCORE-->>ORCH: {health_score: 76, severity_counts, findings, fix_suggestions}

    ORCH-->>API: Full analysis dict
    API-->>FE: JSON Response
    FE-->>User: Health Score · ML Badge · Markdown Review · Code Diff
```

---

## 📊 Training Data & Model Details

### Dataset: [`backend/model/code_smells.csv`](backend/model/code_smells.csv)

The AWD-LSTM is trained on labeled Python code snippet pairs — one **Smelly** version and one **Clean** version of the same pattern:

| Smelly Code | Clean Code | Smell Type |
|---|---|---|
| `for i in range(len(arr)): print(arr[i])` | `for x in arr: print(x)` | Inefficient index loop |
| `if x == True: print('ok')` | `if x: print('ok')` | Redundant bool comparison |
| `try: x=1/0\nexcept: pass` | `try:\n  x=1/0\nexcept ZeroDivisionError:\n  print('error')` | Bare except clause |
| `print('debug')` | `logging.info('Task completed')` | Debug print in production |
| `for i in range(0, len(data)): process(data[i])` | `for item in data: process(item)` | Index-based iteration |
| `if flag == False: return` | `if not flag: return` | Explicit False comparison |
| `x = 10\nx = 20` | `x = 10\ny = 20` | Immediate variable overwrite |
| `def calc(): return None` | `def calc(a,b): return a+b` | Meaningless function |

### Model Specification

| Property | Value |
|---|---|
| Architecture | AWD-LSTM (3 stacked LSTM layers with Weight Drop) |
| Framework | FastAI `text_classifier_learner` |
| Backend | PyTorch |
| Tokenizer | FastAI `TextBlock` subword tokenizer |
| Train / Validation split | 80% / 20% — `RandomSplitter(valid_pct=0.2)` |
| Batch size | 4 |
| Fine-tune epochs | 3 (`learn.fine_tune(3)`) |
| Optimizer | ASGD (Averaged Stochastic Gradient Descent) |
| Metric | Accuracy |
| Output classes | `["Clean", "Smelly"]` |
| Export format | `export.pkl` — full FastAI serialized learner |

---

## 🚀 API Endpoints

**Base URL:** `https://rigelai.onrender.com`

| Method | Endpoint | Payload | Description |
|---|---|---|---|
| `GET` | `/` | — | Root health ping |
| `GET` | `/health` | — | Status check |
| `POST` | `/analyze-editor` | `{code, user_query, session_id?}` | Analyze code from editor input |
| `POST` | `/analyze-file` | `multipart: file + user_query` | Analyze uploaded source file |
| `POST` | `/analyze-repository` | `{repository_url, user_query}` | Scan a public GitHub repository |
| `POST` | `/followup` | `{user_query, session_id}` | Follow-up question in same session |
| `POST` | `/chat` | `{user_query}` | General programming Q&A (no code) |
| `POST` | `/download-pdf` | `{text}` | Export AI discussion as PDF |

**Example — `/analyze-editor`:**

```jsonc
// REQUEST
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
      "findings": [ /* ... */ ],
      "fix_suggestions": [ /* ... */ ]
    }
  }
}
```

---

## 🗂️ Project Structure

```
CodeSentinel-AI/
│
├── 📁 backend/                          FastAPI Python backend
│   ├── 🐍 main.py                       API server + all route handlers
│   ├── 🧠 agent_logic.py                Core: AST + ML + LLM orchestration
│   ├── 🌳 ast_analyzer.py               Deep AST static analysis
│   ├── 💬 session_store.py              Multi-turn chat session management
│   ├── 📋 requirements.txt              Python dependencies
│   ├── 🔑 .env                          API keys (not committed to git)
│   │
│   ├── 📁 model/                        ML model artefacts
│   │   ├── 📊 code_smells.csv           Labeled training dataset
│   │   ├── 🏋️ train_model.py            AWD-LSTM training script
│   │   └── 🔮 model_loader.py           FastAI inference loader
│   │
│   └── 📁 pdfs/                         Temp-generated PDF exports
│
├── 📁 frontend/                         React + Vite SPA
│   └── 📁 src/
│       ├── 📁 components/
│       │   ├── ⌨️ CodeInputPanel.jsx    Code editor with syntax highlighting
│       │   ├── 💬 Chatbot.jsx           Multi-turn AI chat interface
│       │   ├── 📁 FileUpload.jsx        Drag-and-drop file uploader
│       │   ├── 📊 Results.jsx           Analysis results + health score panel
│       │   └── 🔌 IdeIntegrationModal  VS Code extension setup guide
│       ├── 📁 pages/Home.jsx            Main application page
│       └── 📁 services/api.js           Axios API call wrappers
│
├── 📁 vscode-extension/                 VS Code Extension (VSIX)
│   └── 📁 src/extension.js             Extension activation + commands
│
└── 📄 README.md                         This file
```

---

## ⚙️ Tech Stack

```mermaid
flowchart LR
    subgraph FE["🖥️ Frontend"]
        R["React 18"]
        V["Vite"]
        AX["Axios"]
        CSS["CSS Modules"]
    end

    subgraph BE["⚡ Backend"]
        FA["FastAPI"]
        UV["Uvicorn (ASGI)"]
        PY["Pydantic"]
        RL["ReportLab (PDF)"]
    end

    subgraph ML_STACK["🤖 AI / ML"]
        FAI["FastAI"]
        PT["PyTorch"]
        OAI["OpenAI SDK"]
        OR["OpenRouter API"]
        AST_P["Python ast"]
    end

    subgraph DEPLOY["🚀 Deployment"]
        VER["Vercel\n(Frontend CDN)"]
        REN["Render\n(Backend API)"]
    end

    FE <-->|"HTTP / JSON"| BE
    BE <-->|"model inference"| ML_STACK
    FE --> VER
    BE --> REN

    style FE fill:#0d3b66,color:#fff,stroke:#4fc3f7
    style BE fill:#1b5e20,color:#fff,stroke:#69f0ae
    style ML_STACK fill:#4a148c,color:#fff,stroke:#ce93d8
    style DEPLOY fill:#bf360c,color:#fff,stroke:#ffab40
```

---

## 🛠️ Local Setup

### Prerequisites
- Python **3.11+**
- Node.js **18+**
- [OpenRouter](https://openrouter.ai) API key (free tier available)

### 1 · Clone

```bash
git clone https://github.com/saurabh-yadav/CodeSentinel-AI.git
cd CodeSentinel-AI
```

### 2 · Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=poolside/laguna-m.1:free
GITHUB_TOKEN=your_github_token_here   # optional — enables repo scanning
```

Start backend:

```bash
uvicorn main:app --reload --port 8000
```

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev
# App → http://localhost:5173
# API → http://localhost:8000
```

### 4 · Train ML Model *(optional)*

```bash
cd backend/model
python train_model.py
# Produces: export.pkl
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

⭐ **If you found CodeSentinel AI useful, please star it on GitHub!** ⭐

[![GitHub stars](https://img.shields.io/github/stars/saurabh-yadav/CodeSentinel-AI?style=social)](https://github.com/saurabh-yadav/CodeSentinel-AI)

*Built with ❤️ by Saurabh Yadav*

</div>
