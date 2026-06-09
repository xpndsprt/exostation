#!/usr/bin/env python3
"""Stop hook: nudge to keep STRATEGY.md in sync with gameplay code.

If the working tree has changes under src/*.ts but STRATEGY.md hasn't been
touched, emit a systemMessage reminder. Best-effort and silent otherwise;
never blocks. The real rule lives in CLAUDE.md.
"""
import json
import subprocess
import sys


def main():
    try:
        out = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            timeout=10,
        ).stdout
    except Exception:
        return

    src_changed = False
    guide_changed = False
    for line in out.splitlines():
        if not line.strip():
            continue
        path = line[3:]
        if " -> " in path:  # rename
            path = path.split(" -> ")[-1]
        path = path.strip().strip('"')
        if path.startswith("src/") and path.endswith(".ts"):
            src_changed = True
        if path.endswith("STRATEGY.md"):
            guide_changed = True

    if src_changed and not guide_changed:
        print(
            json.dumps(
                {
                    "systemMessage": "Reminder: gameplay code in src/ changed but STRATEGY.md "
                    "was not updated. Update the strategy guide to match (it auto-renders to "
                    "STRATEGY.html).",
                }
            )
        )


if __name__ == "__main__":
    main()
    sys.exit(0)
