import ast

def analyze_ast(code: str):
    """
    Analyzes Python code using AST to detect common code smells and inefficiencies.
    Returns a list of detected issues.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return [f"❌ Syntax error in code: {e}"]

    issues = []
    function_lengths = {}
    assigned_vars = set()
    used_vars = set()

    # --- Traverse AST ---
    for node in ast.walk(tree):

        # Detect long functions
        if isinstance(node, ast.FunctionDef):
            func_length = len(node.body)
            function_lengths[node.name] = func_length
            if func_length > 20:
                issues.append(f"⚠️ Function '{node.name}' is too long ({func_length} lines). Consider refactoring.")

        # Detect deeply nested 'if', 'for', 'while'
        if isinstance(node, (ast.If, ast.For, ast.While)):
            depth = _get_nesting_depth(node)
            if depth > 3:
                issues.append(f"⚠️ Deep nesting detected (depth {depth}). Simplify conditional logic.")

        # Detect unused imports
        if isinstance(node, ast.Import):
            for alias in node.names:
                issues.append(f"ℹ️ Imported module '{alias.name}' — ensure it's used.")
        if isinstance(node, ast.ImportFrom):
            issues.append(f"ℹ️ From-import '{node.module}' — verify all imported names are used.")

        # Track assigned and used variables
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    assigned_vars.add(target.id)
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            used_vars.add(node.id)

    # --- Post-processing: unused variables ---
    unused_vars = assigned_vars - used_vars
    for var in unused_vars:
        issues.append(f"⚠️ Variable '{var}' assigned but never used.")

    # --- Summary ---
    if not issues:
        issues.append("✅ No major code smells detected!")

    return issues


def _get_nesting_depth(node, current_depth=0):
    """Recursively measure nesting depth."""
    if not isinstance(node, (ast.If, ast.For, ast.While, ast.FunctionDef)):
        return current_depth
    depths = [current_depth]
    for child in ast.iter_child_nodes(node):
        depths.append(_get_nesting_depth(child, current_depth + 1))
    return max(depths)
