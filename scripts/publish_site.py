#!/usr/bin/env python3

from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = ROOT / "dist"
DOCS_DIR = ROOT / "docs"


def main() -> None:
    if not DIST_DIR.exists():
        raise SystemExit(f"Build output not found: {DIST_DIR}")

    DOCS_DIR.mkdir(parents=True, exist_ok=True)

    for child in DOCS_DIR.iterdir():
        if child.name == ".nojekyll":
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()

    for child in DIST_DIR.iterdir():
        target = DOCS_DIR / child.name
        if child.is_dir():
            shutil.copytree(child, target)
        else:
            shutil.copy2(child, target)

    (DOCS_DIR / ".nojekyll").write_text("", encoding="utf-8")
    print(f"Published build from {DIST_DIR} to {DOCS_DIR}")


if __name__ == "__main__":
    main()
