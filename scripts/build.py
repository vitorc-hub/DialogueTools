#!/usr/bin/env python3
"""Empacota src/ + vendor/ nos artefatos HTML únicos autocontidos (offline) em dist/."""

from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
VENDOR = ROOT / "vendor"
DIST = ROOT / "dist"
MAIN_OUT = DIST / "DialogueTools.html"
TURING_ALIAS_OUT = DIST / "Turing_Test_Editor_Master_D1-D6.html"


def read_safe_js(path: Path) -> str:
    content = path.read_text(encoding="utf-8")
    return content.replace("</script>", "<\\/script>").replace("</SCRIPT>", "<\\/SCRIPT>")


def build() -> Path:
    vt323_css = (VENDOR / "vt323.css").read_text(encoding="utf-8")
    tailwind_js = read_safe_js(VENDOR / "tailwind-3.4.17.min.js")
    react_js = read_safe_js(VENDOR / "react.production.min.js")
    react_dom_js = read_safe_js(VENDOR / "react-dom.production.min.js")
    themes_css = (SRC / "themes.css").read_text(encoding="utf-8")
    styles_css = (SRC / "styles.css").read_text(encoding="utf-8")
    editor_js = read_safe_js(SRC / "editor.js")

    html = (
        "<!DOCTYPE html>\n"
        '<html lang="pt-BR" data-theme="cozy_grove">\n'
        "<head>\n"
        '  <meta charset="UTF-8">\n'
        '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "  <title>Dialogue Tool</title>\n"
        '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap">\n'
        f"  <style>\n{vt323_css}\n  </style>\n"
        f"  <script>\n{tailwind_js}\n  </script>\n"
        '  <script>tailwind.config = { theme: { extend: { fontFamily: { sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"], mono: ["JetBrains Mono", "VT323", "ui-monospace", "monospace"] } } } };</script>\n'
        f"  <script>\n{react_js}\n  </script>\n"
        f"  <script>\n{react_dom_js}\n  </script>\n"
        "</head>\n"
        "<body>\n"
        f'  <style id="dtools-themes">\n{themes_css}\n  </style>\n'
        f'  <style id="dtools-styles">\n{styles_css}\n  </style>\n'
        '  <div id="root"></div>\n'
        f"  <script>\n{editor_js}\n  </script>\n"
        "</body>\n"
        "</html>\n"
    )

    DIST.mkdir(parents=True, exist_ok=True)
    MAIN_OUT.write_text(html, encoding="utf-8")
    shutil.copyfile(MAIN_OUT, TURING_ALIAS_OUT)
    size_kb = MAIN_OUT.stat().st_size / 1024
    print(f"Build concluído: {MAIN_OUT.name} + {TURING_ALIAS_OUT.name} ({size_kb:.1f} KB cada)")
    return MAIN_OUT


if __name__ == "__main__":
    build()
