"""
CodeSentinel AI — Universal Multi-Language AST & Complexity Engine
==================================================================
Implements Section 7 universal_ast.py:
Multi-language AST, McCabe Cyclomatic Complexity, nesting depth, and static
defect pattern analysis across 6 languages: Python, JavaScript, TypeScript,
Java, C++, and Go.
"""

import ast
import re
from typing import List, Dict, Any, Optional

SUPPORTED_LANGUAGES = ["python", "javascript", "typescript", "java", "cpp", "c", "go", "rust"]


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


def parse_ast_multi_language(code: str, language: str = "python") -> List[str]:
    """
    Performs multi-language AST / structural anomaly checks:
    - Deeply nested branches (>3 levels)
    - Inefficient loops (range(len), index lookup in for-loop)
    - Repeated computations
    - Catch-all exception blocks
    - High cyclomatic complexity (>10)
    """
    findings = []
    lines = code.splitlines()
    lang = language.lower()

    # 1. Native Python AST parsing if available
    if lang == "python":
        try:
            tree = ast.parse(code)
            for node in ast.walk(tree):
                # Detect bare except
                if isinstance(node, ast.ExceptHandler) and node.type is None:
                    findings.append(f"Line {node.lineno}: Catch-all bare `except:` block masks critical system errors (CWE-391)")
        except SyntaxError as e:
            findings.append(f"Syntax error at line {e.lineno}: {e.msg}")

    # 2. Line-level deep nesting and loop anti-patterns
    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        indent = len(line) - len(line.lstrip())
        depth = indent // 4

        if depth >= 4 and any(stripped.startswith(k) for k in ("if ", "if(", "for ", "for(", "while ", "while(")):
            findings.append(f"Deep nesting at line {i} (depth {depth}): `{stripped[:60]}`")

        # Inefficient loops
        if "range(len(" in stripped:
            findings.append(f"Line {i}: Inefficient index loop using `range(len(...))` — use direct iteration or `enumerate()`")
        if "for (var i = 0; i < arr.length" in stripped or "for (let i = 0; i <" in stripped:
            findings.append(f"Line {i}: Manual index iteration — prefer `for...of` or `.forEach()` in modern JavaScript")

        # Repeated square / powers
        if "**2" in stripped or "** 2" in stripped or "Math.pow(" in stripped:
            findings.append(f"Line {i}: Repeated power/square calculation — cache in a named variable")

    # 3. Overall complexity check
    complexity = calculate_cyclomatic_complexity(code, lang)
    if complexity > 15:
        findings.append(f"Critical Cognitive Complexity ({complexity}): Function violates single responsibility; refactor into modular subroutines")
    elif complexity > 10:
        findings.append(f"High Cyclomatic Complexity ({complexity}): Consider extracting nested decision branches")

    return findings


# Alias for backward compatibility
analyze_ast = parse_ast_multi_language
universal_ast = parse_ast_multi_language
