import uuid

_sessions = {}

def create_session(code: str) -> str:
    session_id = str(uuid.uuid4())
    _sessions[session_id] = {
        "code": code,
        "chat": []   # 👈 ADD chat memory
    }
    return session_id


def get_code(session_id: str) -> str:
    return _sessions.get(session_id, {}).get("code", "")


def update_code(session_id: str, code: str):
    if session_id in _sessions:
        _sessions[session_id]["code"] = code


# 🔽 NEW FUNCTIONS (DO NOT SKIP)

def add_message(session_id: str, role: str, content: str):
    if session_id in _sessions:
        _sessions[session_id]["chat"].append({
            "role": role,
            "content": content
        })


def get_chat(session_id: str):
    return _sessions.get(session_id, {}).get("chat", [])


def clear_chat(session_id: str):
    if session_id in _sessions:
        _sessions[session_id]["chat"] = []
