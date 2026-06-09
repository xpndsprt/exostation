#!/usr/bin/env python3
"""Self-contained Markdown -> HTML converter for the EXOSTATION project.

No third-party dependencies. Handles the Markdown subset used in our design
docs: ATX headings, GitHub-style tables (with alignment), ordered/unordered
nested lists, blockquotes, fenced code, horizontal rules, and inline
formatting (bold, italic, inline code, links). Wraps output in a clean,
self-contained HTML page with embedded CSS.

Usage: python md2html.py <path-to-file.md>
Writes <path-to-file>.html next to the source.
"""
import sys
import os
import re

CSS = """
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6; color: #1c2230; background: #f6f7f9;
  margin: 0; padding: 2.5rem 1rem;
}
main {
  max-width: 920px; margin: 0 auto; background: #ffffff;
  padding: 2.5rem 3rem; border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.05);
}
h1, h2, h3, h4, h5, h6 { line-height: 1.25; font-weight: 700; margin: 1.8em 0 .6em; }
h1 { font-size: 2.1rem; margin-top: 0; border-bottom: 3px solid #2d6cdf; padding-bottom: .3em; }
h2 { font-size: 1.55rem; border-bottom: 1px solid #e3e6ea; padding-bottom: .25em; color: #16203a; }
h3 { font-size: 1.25rem; color: #28324a; }
h4 { font-size: 1.05rem; color: #3a4considerable; }
p { margin: .8em 0; }
a { color: #2d6cdf; text-decoration: none; }
a:hover { text-decoration: underline; }
strong { color: #11151f; }
code {
  font-family: "SF Mono", "Cascadia Code", Consolas, Monaco, monospace;
  background: #eef0f3; padding: .15em .4em; border-radius: 5px; font-size: .88em;
}
pre {
  background: #1e2330; color: #e6e9ef; padding: 1rem 1.2rem;
  border-radius: 8px; overflow-x: auto;
}
pre code { background: none; padding: 0; color: inherit; }
blockquote {
  margin: 1em 0; padding: .6em 1.1em; border-left: 4px solid #2d6cdf;
  background: #f0f5ff; color: #34405c; border-radius: 0 6px 6px 0;
}
ul, ol { padding-left: 1.6em; margin: .7em 0; }
li { margin: .3em 0; }
hr { border: none; border-top: 1px solid #e3e6ea; margin: 2.2em 0; }
table {
  border-collapse: collapse; width: 100%; margin: 1.2em 0; font-size: .94rem;
  overflow: hidden; border-radius: 8px; box-shadow: 0 0 0 1px #e3e6ea;
}
th, td { padding: .55em .8em; border-bottom: 1px solid #e9ecf0; }
th { background: #2d6cdf; color: #fff; font-weight: 600; text-align: left; }
tr:nth-child(even) td { background: #f8f9fb; }
tr:hover td { background: #eef3ff; }
@media (prefers-color-scheme: dark) {
  body { color: #d7dbe2; background: #11141a; }
  main { background: #1a1e26; box-shadow: 0 1px 3px rgba(0,0,0,.4); }
  h2 { color: #e8edf6; border-bottom-color: #2a2f3a; }
  h3 { color: #cfd6e4; } h4 { color: #cfd6e4; }
  strong { color: #fff; }
  code { background: #262b36; }
  blockquote { background: #1f2733; color: #c2cbdc; }
  hr { border-top-color: #2a2f3a; }
  table { box-shadow: 0 0 0 1px #2a2f3a; }
  th, td { border-bottom-color: #2a2f3a; }
  tr:nth-child(even) td { background: #1e232c; }
  tr:hover td { background: #232c3a; }
}
"""
# guard against a typo'd CSS token sneaking in
CSS = CSS.replace("#3a4considerable", "#3a4258")


def inline(text):
    """Apply inline Markdown formatting to an already-trimmed string."""
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`", lambda m: "<code>" + m.group(1) + "</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*\s][^*]*?)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"(?<!\w)_([^_]+)_(?!\w)", r"<em>\1</em>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', text)
    return text


def is_sep(line):
    if "|" not in line:
        return False
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return len(cells) > 0 and all(re.match(r"^:?-+:?$", c) for c in cells)


def align_of(cell):
    cell = cell.strip()
    left = cell.startswith(":")
    right = cell.endswith(":")
    if left and right:
        return "center"
    if right:
        return "right"
    if left:
        return "left"
    return ""


def split_row(line):
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|"):
        line = line[:-1]
    return [c.strip() for c in line.split("|")]


def render_list(items, pos=0, cur_indent=None):
    """Recursively render (indent, ordered, content) tuples into nested lists."""
    if pos >= len(items):
        return "", pos
    if cur_indent is None:
        cur_indent = items[pos][0]
    tag = "ol" if items[pos][1] else "ul"
    out = ["<" + tag + ">"]
    while pos < len(items):
        indent, _ordered, content = items[pos]
        if indent < cur_indent:
            break
        if indent > cur_indent:
            sub, pos = render_list(items, pos, indent)
            out.append(sub)
            out.append("</li>")
            continue
        out.append("<li>" + inline(content))
        if pos + 1 < len(items) and items[pos + 1][0] > cur_indent:
            pos += 1  # leave <li> open for the nested list
        else:
            out.append("</li>")
            pos += 1
    out.append("</" + tag + ">")
    return "".join(out), pos


def is_block_start(line):
    s = line.strip()
    if s == "":
        return True
    if s.startswith("```"):
        return True
    if re.match(r"^#{1,6}\s", line):
        return True
    if re.match(r"^\s*([-*_])\1{2,}\s*$", line):
        return True
    if line.lstrip().startswith(">"):
        return True
    if re.match(r"^(\s*)([-*+]|\d+\.)\s+", line):
        return True
    if "|" in line:
        return True
    return False


def convert(md):
    lines = md.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    out = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()

        # fenced code block
        if stripped.startswith("```"):
            code = []
            i += 1
            while i < n and not lines[i].strip().startswith("```"):
                code.append(lines[i])
                i += 1
            i += 1  # skip closing fence
            esc = "\n".join(code).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            out.append("<pre><code>" + esc + "</code></pre>")
            continue

        # blank line
        if stripped == "":
            i += 1
            continue

        # heading
        m = re.match(r"^(#{1,6})\s+(.*?)\s*#*$", line)
        if m:
            lvl = len(m.group(1))
            out.append("<h%d>%s</h%d>" % (lvl, inline(m.group(2).strip()), lvl))
            i += 1
            continue

        # horizontal rule
        if re.match(r"^\s*([-*_])\1{2,}\s*$", line):
            out.append("<hr>")
            i += 1
            continue

        # table
        if "|" in line and i + 1 < n and is_sep(lines[i + 1]):
            headers = split_row(line)
            aligns = [align_of(c) for c in split_row(lines[i + 1])]
            i += 2
            rows = []
            while i < n and "|" in lines[i] and lines[i].strip() != "":
                rows.append(split_row(lines[i]))
                i += 1
            t = ['<table>', "<thead><tr>"]
            for idx, h in enumerate(headers):
                a = aligns[idx] if idx < len(aligns) else ""
                style = ' style="text-align:%s"' % a if a else ""
                t.append("<th%s>%s</th>" % (style, inline(h)))
            t.append("</tr></thead><tbody>")
            for row in rows:
                t.append("<tr>")
                for idx in range(len(headers)):
                    cell = row[idx] if idx < len(row) else ""
                    a = aligns[idx] if idx < len(aligns) else ""
                    style = ' style="text-align:%s"' % a if a else ""
                    t.append("<td%s>%s</td>" % (style, inline(cell)))
                t.append("</tr>")
            t.append("</tbody></table>")
            out.append("".join(t))
            continue

        # blockquote
        if line.lstrip().startswith(">"):
            quote = []
            while i < n and lines[i].lstrip().startswith(">"):
                quote.append(re.sub(r"^\s*>\s?", "", lines[i]))
                i += 1
            out.append("<blockquote>" + inline(" ".join(quote)) + "</blockquote>")
            continue

        # list
        if re.match(r"^(\s*)([-*+]|\d+\.)\s+", line):
            block = []
            while i < n:
                l = lines[i]
                if l.strip() == "":
                    break
                if re.match(r"^(\s*)([-*+]|\d+\.)\s+", l) or l.startswith((" ", "\t")):
                    block.append(l)
                    i += 1
                else:
                    break
            items = []
            for ln in block:
                m2 = re.match(r"^(\s*)([-*+]|\d+\.)\s+(.*)$", ln)
                if m2:
                    indent = len(m2.group(1).expandtabs(4))
                    ordered = bool(re.match(r"\d+\.", m2.group(2)))
                    items.append([indent, ordered, m2.group(3)])
                elif items:
                    items[-1][2] += " " + ln.strip()
            out.append(render_list(items)[0])
            continue

        # paragraph
        para = []
        while i < n and not is_block_start(lines[i]):
            para.append(lines[i].strip())
            i += 1
        if para:
            out.append("<p>" + inline(" ".join(para)) + "</p>")
        else:
            i += 1  # safety: avoid infinite loop

    return "\n".join(out)


def convert_file(src):
    """Convert a .md file to a sibling .html file. Returns the output path,
    or None if the source is not a Markdown file."""
    if not os.path.isfile(src) or not src.lower().endswith(".md"):
        return None
    with open(src, "r", encoding="utf-8") as f:
        md = f.read()
    body = convert(md)
    m = re.search(r"^#\s+(.*)$", md, re.MULTILINE)
    title = m.group(1).strip() if m else os.path.basename(src)
    title = re.sub(r"[*_`#]", "", title)
    doc = (
        "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        "<title>" + title + "</title>\n<style>" + CSS + "</style>\n</head>\n<body>\n"
        "<main>\n" + body + "\n</main>\n</body>\n</html>\n"
    )
    dst = os.path.splitext(src)[0] + ".html"
    with open(dst, "w", encoding="utf-8") as f:
        f.write(doc)
    return dst


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("usage: md2html.py <file.md>\n")
        return 1
    convert_file(sys.argv[1])
    return 0


if __name__ == "__main__":
    sys.exit(main())
