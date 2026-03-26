# Rigel AI 🚀  
**AI-Powered Code Analysis & Developer Assistant**

Rigel AI is an intelligent developer assistant that analyzes source code, detects potential issues, explains logic, and provides optimization suggestions using **AST analysis, machine learning, and Large Language Models (LLMs)**.

It acts like a **senior engineer reviewing your code**, helping developers understand complexity, detect bugs, and improve maintainability.


## 🌐 Live Demo

Frontend (Vercel)  
👉 https://rigelai-agent.vercel.app/

Backend API (Render)  
👉 https://rigelai.onrender.com/


# ✨ Features

### 🔍 Static Code Analysis
- Detects common **code smells and inefficiencies**
- Uses **AST-based parsing**
- Identifies deep nesting, inefficient loops, repeated operations

### 🤖 AI Code Review
- Uses **LLMs via OpenRouter**
- Explains code logic
- Suggests improvements and refactoring
- Answers developer questions about the code

### ⚡ Performance Insights
- Detect inefficient patterns
- Suggest optimized implementations

### 💬 Multi-Turn AI Chat
- Ask questions about uploaded or pasted code
- Continue conversation using **session-based follow-up**

### 📂 File Upload Support
- Upload source files directly for analysis

### 📝 Code Editor Mode
- Paste code into an editor and analyze instantly

### 📄 Export Discussion as PDF
- Save AI explanations and discussion


# 🧠 How It Works

Rigel AI combines multiple layers of analysis:

1️⃣ **AST Analysis**
- Parses code structure
- Detects patterns like deep nesting

2️⃣ **Machine Learning Code Smell Model**
- Classifies code as **Clean or Smelly**

3️⃣ **LLM Reasoning**
- Explains logic
- Suggests improvements
- Generates optimized code when requested


# 🏗 Tech Stack

### Frontend
- **React.js**
- Vite
- CSS
- Axios / Fetch API

### Backend
- **FastAPI**
- Python
- Async API handling

### AI / ML
- Large Language Models (OpenRouter)
- AST Code Analysis
- Scikit-learn
- NLP techniques

### Deployment
- **Vercel** – Frontend
- **Render** – Backend API

```
# 📁 Project Structure

Rigel AI
│
├── backend/
│ │
│ ├── model/ # ML code smell detection model
│ │ ├── code_smells.csv
│ │ ├── model_loader.py
│ │ ├── train_model.py
│ │ └── pycache/
│ │
│ ├── pdfs/ # Generated PDF discussions
│ │
│ ├── venv/ # Python virtual environment (ignored in Git)
│ │
│ ├── pycache/
│ │
│ ├── agent_logic.py # Core AI agent logic (LLM + analysis)
│ ├── ast_analyzer.py # Static AST-based code analysis
│ ├── session_store.py # Multi-turn chat session management
│ ├── main.py # FastAPI backend server
│ │
│ ├── requirements.txt # Backend dependencies
│ ├── runtime.txt # Python runtime (for deployment)
│ ├── .env # Environment variables (API keys)
│ └── init.py
│
│
├── frontend/
│ │
│ ├── public/
│ │
│ ├── src/
│ │ │
│ │ ├── components/ # UI components
│ │ │ ├── Chatbot.jsx
│ │ │ ├── Chatbot.css
│ │ │ ├── CodeInputPanel.jsx
│ │ │ ├── CodeInputPanel.css
│ │ │ ├── FileUpload.jsx
│ │ │ ├── FileUpload.css
│ │ │ ├── Navbar.jsx
│ │ │ ├── Navbar.css
│ │ │ ├── Results.jsx
│ │ │ └── Results.css
│ │ │
│ │ ├── pages/
│ │ │ ├── Home.jsx
│ │ │ └── Home.css
│ │ │
│ │ ├── services/
│ │ │ └── api.js # API calls to FastAPI backend
│ │ │
│ │ ├── App.jsx # Main React app
│ │ ├── main.jsx # React entry point
│ │ └── styles.css
│ │
│ ├── index.html
│ ├── package.json
│ ├── package-lock.json
│ ├── vite.config.js
│ ├── eslint.config.js
│ └── README.md
│
│
├── .gitignore
└── README.md



```

# 👨‍💻 Author

Saurabh Yadav

B.Tech CSE (AI Driven Language Technology)

Koneru Lakshmaiah University


Portfolio
https://wraithklu.vercel.app

⭐ If you like this project - Give the repository a star ⭐ on GitHub
