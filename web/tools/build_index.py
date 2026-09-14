"""Bundle web/_shell.html + style.css + JS sources into a single self-contained web/index.html.

iOS Safari's file:// sandbox (when a page is opened via the Files app) only
reliably grants access to the single opened file, not to sibling files or
subfolders reached via <link>/<script src>. Bundling everything inline into
one HTML file avoids that failure mode entirely, at the cost of needing to
re-run this script (and convert_excel.py first, if the Excel changed) after
editing style.css, app.js, js/quiz-logic.js, or js/bank-store.js.
"""
from pathlib import Path

WEB_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = WEB_DIR.parent


def build():
    shell = (WEB_DIR / "_shell.html").read_text(encoding="utf-8")
    style = (WEB_DIR / "style.css").read_text(encoding="utf-8")
    sentences = (WEB_DIR / "data" / "sentences.js").read_text(encoding="utf-8")
    quiz_logic = (WEB_DIR / "js" / "quiz-logic.js").read_text(encoding="utf-8")
    bank_store = (WEB_DIR / "js" / "bank-store.js").read_text(encoding="utf-8")
    app = (WEB_DIR / "app.js").read_text(encoding="utf-8")

    output = shell
    output = output.replace("<!--STYLE-->", style)
    output = output.replace("<!--SENTENCES-->", sentences)
    output = output.replace("<!--QUIZ_LOGIC-->", quiz_logic)
    output = output.replace("<!--BANK_STORE-->", bank_store)
    output = output.replace("<!--APP-->", app)

    (WEB_DIR / "index.html").write_text(output, encoding="utf-8")
    print(f"已產生自包含的 {WEB_DIR / 'index.html'}")

    # Also write a copy at the repo root so GitHub Pages ("Deploy from
    # branch: main / (root)") can serve it directly, no CI workflow needed.
    (REPO_ROOT / "index.html").write_text(output, encoding="utf-8")
    print(f"已同步一份到 {REPO_ROOT / 'index.html'}（供 GitHub Pages 使用）")


if __name__ == "__main__":
    build()
