#!/usr/bin/env python3
"""Empacota src/ + vendor/ em um único HTML autocontido (offline) em dist/."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
VENDOR = ROOT / "vendor"
DIST = ROOT / "dist"
OUT_FILE = DIST / "Turing_Test_Editor_Master_D1-D6.html"


def read_safe_js(path: Path) -> str:
    content = path.read_text(encoding="utf-8")
    # Garante que nenhuma sequência literal </script feche a tag HTML antes da hora
    return content.replace("</script>", "<\\/script>").replace("</SCRIPT>", "<\\/SCRIPT>")


def build() -> Path:
    vt323_css = (VENDOR / "vt323.css").read_text(encoding="utf-8")
    tailwind_js = read_safe_js(VENDOR / "tailwind-3.4.17.min.js")
    react_js = read_safe_js(VENDOR / "react.production.min.js")
    react_dom_js = read_safe_js(VENDOR / "react-dom.production.min.js")
    styles_css = (SRC / "styles.css").read_text(encoding="utf-8")
    editor_js = read_safe_js(SRC / "editor.js")

    html = (
        "<!DOCTYPE html>\n"
        '<html lang="pt-BR">\n'
        "<head>\n"
        '  <meta charset="UTF-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "  <title>Turing Test · Editor Master D1-D6</title>\n"
        f"  <style>\n{vt323_css}\n  </style>\n"
        f"  <script>\n{tailwind_js}\n  </script>\n"
        '  <script>tailwind.config = { theme: { extend: { fontFamily: { mono: ["VT323", "ui-monospace", "monospace"] } } } };</script>\n'
        f"  <script>\n{react_js}\n  </script>\n"
        f"  <script>\n{react_dom_js}\n  </script>\n"
        f"  <style>\n{styles_css}\n  </style>\n"
        "</head>\n"
        '<body class="crt">\n'
        '  <div id="root"></div>\n'
        f"  <script>\n{editor_js}\n  </script>\n"
        "</body>\n"
        "</html>\n"
    )

    DIST.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(html, encoding="utf-8")
    size_kb = OUT_FILE.stat().st_size / 1024
    print(f"Build concluído: {OUT_FILE} ({size_kb:.1f} KB)")
    return OUT_FILE


if __name__ == "__main__":
    build()
