#!/usr/bin/env python3
"""PostToolUse hook entrypoint: reads the hook JSON from stdin, and if a
Markdown file inside this project was just written/edited, regenerates a
sibling .html via md2html.convert_file.

Invoked as `python <this>` so it works regardless of which shell the harness
uses for hooks (bash or PowerShell). Never raises — a hook must not break the
triggering tool.
"""
import sys
import os
import json

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)  # c:\exostation
sys.path.insert(0, HERE)


def run():
    # Read as bytes and decode with utf-8-sig so a leading BOM (added by some
    # shells when piping) is stripped automatically.
    try:
        raw = sys.stdin.buffer.read().decode("utf-8-sig", "replace").strip()
    except Exception:
        return
    if not raw:
        return
    try:
        data = json.loads(raw)
    except Exception:
        return

    ti = data.get("tool_input") or {}
    path = ti.get("file_path")
    if not path:
        tr = data.get("tool_response") or {}
        path = tr.get("filePath") or tr.get("file_path")
    if not path or not path.lower().endswith(".md"):
        return

    # Only act on files inside this project folder.
    try:
        root = os.path.normcase(os.path.normpath(PROJECT_ROOT))
        target = os.path.normcase(os.path.normpath(path))
        if not target.startswith(root):
            return
    except Exception:
        return

    try:
        import md2html
        out = md2html.convert_file(path)
        if out:
            print(json.dumps({"suppressOutput": True}))
    except Exception:
        # Stay silent; never disrupt the editing tool.
        return


if __name__ == "__main__":
    run()
