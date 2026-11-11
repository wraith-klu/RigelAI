# ast_analyzer.py - Multi-Language AST & Cyclomatic Complexity Engine
# Supports Python (native AST) and JavaScript, TypeScript, Go, Java, C++, Rust

import ast
import re


def calculate_cyclomatic_complexity(code: str, language: str = "python") -> int:
    """
    Calculate McCabe Cyclomatic Complexity (M = E - N + 2P).
    Approximated by counting independent decision pathways + 1 base path.
    """
    if not code.strip():
        return 1

    decision_keywords = [
        r"\bif\b",
        r"\belif\b",
        r"\belse\s+if\b",
        r"\bfor\b",
        r"\bwhile\b",
        r"\bcatch\b",
        r"\bexcept\b",
        r"\bcase\b",
        r"\bswitch\b",
        r"&&",
        r"\|\|",
        r"\band\b",
        r"\bor\b",
        r"\?",
    ]
    pattern = re.compile("|".join(decision_keywords))
    decision_count = len(pattern.findall(code))
    return max(1, decision_count + 1)


def calculate_max_nesting_depth(code: str, language: str = "python") -> int:
    """Measure maximum block/bracket nesting depth across languages."""
    max_depth = 0
    current_depth = 0

    if language.lower() == "python":
        for line in code.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            indent = len(line) - len(line.lstrip())
            depth = indent // 4
            max_depth = max(max_depth, depth)
    else:
        for char in code:
            if char in "{[(":
                current_depth += 1
                max_depth = max(max_depth, current_depth)
            elif char in "}])":
                current_depth = max(0, current_depth - 1)

    return max_depth


def analyze_ast(code: str, language: str = "python") -> list[str]:
    """
    Multi-language AST and static syntax analyzer.
    Detects high cyclomatic complexity, deep nesting, long methods, and anti-patterns.
    """
    if not code or not code.strip():
        return ["ℹ️ Empty source input provided."]

    lang = (language or "python").lower()
    issues = []

    # 1. Cyclomatic Complexity Check
    complexity = calculate_cyclomatic_complexity(code, lang)
    if complexity > 15:
        issues.append(f"⚠️ High Cyclomatic Complexity ({complexity} paths). Refactor decision branches to reduce risk.")
    elif complexity > 10:
        issues.append(f"ℹ️ Moderate Cyclomatic Complexity ({complexity} paths). Consider extracting sub-functions.")

    # 2. Maximum Nesting Depth Check
    nesting = calculate_max_nesting_depth(code, lang)
    if nesting >= 4:
        issues.append(f"⚠️ Deep nesting detected (depth {nesting}). Flatten logic with early return guards.")

    # 3. Native Python AST Inspection
    if lang == "python":
        try:
            tree = ast.parse(code)
            assigned_vars = set()
            used_vars = set()

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_len = len(node.body)
                    if func_len > 25:
                        issues.append(f"⚠️ Long Method: Function '{node.name}' contains {func_len} statements.")

                if isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            assigned_vars.add(target.id)
                elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                    used_vars.add(node.id)

            unused = assigned_vars - used_vars - {"_", "__name__", "__doc__"}
            for var in list(unused)[:3]:
                issues.append(f"⚠️ Unused Variable: '{var}' is assigned but never loaded.")

            if "range(len(" in code:
                issues.append("⚠️ Inefficient Loop: Uses 'range(len(...))'. Prefer direct iteration or 'enumerate()'.")

            if "**2" in code or "** 2" in code:
                issues.append("⚠️ Repeated Math: Inefficient square computation inside loop scope.")

        except SyntaxError as e:
            issues.append(f"❌ Syntax Error (line {e.lineno}): {e.msg}")

    # 4. Multi-language (JS, TS, Java, C++, Go) Heuristic Checks
    else:
        lines = code.splitlines()
        for idx, line in enumerate(lines, start=1):
            if len(line) > 120:
                issues.append(f"ℹ️ Line {idx} exceeds 120 characters ({len(line)} chars).")
                break

        if re.search(r"\bvar\s+[a-zA-Z0-9_]+", code):
            issues.append("⚠️ Legacy Variable Declaration: Use 'const' or 'let' instead of 'var'.")

        if re.search(r"==(?!=)", code) and lang in ("javascript", "typescript"):
            issues.append("⚠️ Loose Equality: Use strict equality '===' instead of '=='.")

    return issues or ["✅ No major structural syntax defects detected."]
