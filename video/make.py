# Builds the Deadline Desk demo: live LEG data from Jira (live.mjs), the Rovo Studio capture, real npm test, `say` narration -> docs/demo.mp4
import subprocess, pathlib, json
from PIL import Image, ImageDraw, ImageFont
V = pathlib.Path(__file__).parent
R = V.parent
W, H = 1920, 1080
F = "/System/Library/Fonts/HelveticaNeue.ttc"
SANS, SUB = ImageFont.truetype(F, 62, index=1), ImageFont.truetype(F, 36)
MONO = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 26)
live = json.loads((V/"live.json").read_text())
rovo = Image.open(R/"docs/rovo-studio-audit-leg.png").convert("RGB")
rovo.crop((0, 0, rovo.width, rovo.height)).save(V/"rovo-full.png")
rovo.crop((int(rovo.width * 0.745), 0, rovo.width, rovo.height)).save(V/"rovo-chat.png")
tests = [l.replace("ℹ ", "").split(" (")[0] for l in
         subprocess.run(["npm", "test"], cwd=R, capture_output=True, text=True).stdout.splitlines()
         if l.startswith(("✔", "✖", "ℹ pass", "ℹ fail"))]
ex = live["example"]
skips = [f"  skip {s['date']}  {s['reason'].replace('Sábado', 'Saturday').replace('Domingo', 'Sunday')}" for s in ex["skipped"]]
jira = [f"{i['key']:<6} {(i['duedate'] or '(none)'):<11} {' '.join(i['labels'])}" for i in live["issues"]]
audit = [f"{r['key']:<6} {r['status']:<18} jira {(r.get('jiraDue') or '-'):<11} legal {r.get('legalDue') or '-'}" for r in live["rows"]]
S = [
 ("Deadline Desk", ["Brazilian court deadlines as MCP tools for Rovo and Jira.", "", "Forge app · Runs on Atlassian · rovo:mcp", "",
   "github.com/DesignMaster-Solutions/deadline-desk", "", "Design Master Solutions LLC · Codegeist 2026"], None, None,
  "Deadline Desk. A Forge app that turns Brazilian court deadline rules into M C P tools, so a Rovo agent can audit a legal team's Jira project without guessing a single date."),
 ("Why a tool, not a prompt", ["In Brazil a missed deadline loses the case.", "", "Only business days count (CPC art. 219).",
   "The start day is excluded (art. 224).", "Movable holidays change every year.", "Dec 20 - Jan 20 recess suspends the count.",
   "Gazette acts are published the next business day.", "Public entities get double the term.", "", "LLMs get this wrong with confidence."], None, None,
  "In Brazil, a missed procedural deadline loses the case. And the count is not calendar math: only business days count, the start day is excluded, movable holidays change every year, the year end recess suspends the count, gazette acts are only published the next business day, and public entities get double the term. Language models get this wrong with confidence. So the rule becomes a deterministic tool, and the model only explains the result."),
 ("Tool 1: compute-deadline", ["Intimation Thu 2026-10-29, 15 business days"], ["$ compute-deadline startDate=2026-10-29 days=15",
   f"  first day {ex['firstDay']}"] + skips + [f"  due date  {ex['dueDate']}"], None,
  f"The first tool computes one deadline. An intimation on Thursday, October twenty ninth, with fifteen business days. Every skipped day comes back with its legal reason, including Finados and Consciência Negra, and the due date is November twenty third."),
 ("A real legal project in Jira", ["Project LEG on our test site, read live", "through the Jira REST API.", "",
   "Convention: label prazo<N> + intimacao-YYYY-MM-DD,", "optional dje and dobro."], ["$ project = LEG   key / due date / labels"] + jira, None,
  "The second tool audits a whole Jira project. On our test site, project L E G holds eight litigation deadlines. Each issue carries its term and its intimation date as labels, plus optional flags for the electronic gazette and for double terms."),
 ("Tool 2: audit-deadlines", ["Same rules, applied to every issue:"], ["$ audit-deadlines projectKey=LEG"] + audit, None,
  "Audit deadlines checks every issue against the law. Three are right. L E G two is due three days after the legal date, the most dangerous error. Two were set too early, because someone forgot the recess or the double term. One has no due date at all, and one is missing its labels."),
 ("Rovo agent on the MCP tools", ["Rovo Studio > Tools > Connected apps > deadline-desk.", "",
   "An agent with only these two tools,", "read-only instructions:", "never compute a date yourself,", "never state a value", "the tool did not return."], None, ["rovo-full.png"],
  "In Rovo Studio, the two M C P tools show up under connected apps. We built an agent with only these two tools and strict read only instructions: never compute a date yourself, and never state a value the tool did not return."),
 ("Ask in plain language", ["\"Audit the deadlines in project LEG\"", "", "The agent invokes the MCP tool and", "answers from its result:",
   "3 OK, 1 too late, 2 early,", "1 missing, 1 incomplete,", "each with the smallest fix."], None, ["rovo-chat.png"],
  "Then a lawyer just asks: audit the deadlines in project L E G. The agent invokes the tool and answers from its result, the same numbers as the live audit, with the smallest fix for each issue."),
 ("Tested", [], ["$ npm test"] + tests + ["", "Scope: read:jira-work only. No data leaves Atlassian.",
   "Production v2.0.0, Runs on Atlassian, public installation link. MIT."], None,
  "The rules are covered by tests: weekends and national holidays, the gazette rule, the recess, double terms, bad input, and an audit that flags late, missing, incomplete and overdue deadlines. The app only reads Jira work, and no data leaves Atlassian."),
 ("Deadline Desk", ["Install from the public link in the README, label your", "deadlines, and ask Rovo.", "",
   "github.com/DesignMaster-Solutions/deadline-desk  (MIT)", "MCP: mcp.atlassian.com/forge/70055465-241f-4a2a-ac0d-dd864dea7178"], None, None,
  "Install it from the public link in the readme, label your deadlines, and ask Rovo. Deadline Desk is open source, by Design Master Solutions. Thanks for watching."),
]
parts = []
for i, (title, sub, mono, shots, narr) in enumerate(S):
    im = Image.new("RGB", (W, H), "#0f1b2d"); d = ImageDraw.Draw(im)
    d.rectangle([0, 0, W, 10], fill="#2563eb")
    d.text((110, 80), title, font=SANS, fill="white")
    y = 200
    for l in sub: d.text((110, y), l, font=SUB, fill="#dbe5f3"); y += 56
    if mono:
        y += 20
        d.rounded_rectangle([90, y - 20, W - 90, min(H - 90, y + 40 * len(mono) + 20)], 16, fill="#060c16")
        for l in mono:
            col = "#86efac" if l.startswith(("$", "✔", "pass")) or " OK " in l else "#fca5a5" if any(
                k in l for k in ("TOO_LATE", "MISSING", "✖", "fail 1")) else "#fde68a" if any(k in l for k in ("EARLY", "INCOMPLETE")) else "#e2e8f0"
            d.text((120, y), l, font=MONO, fill=col); y += 40
    for s in shots or []:
        p = Image.open(V/s).convert("RGB"); p.thumbnail((1180, 840))
        x = W - 70 - p.width
        im.paste(p, (x, 170)); d.rectangle([x - 2, 168, x + p.width + 1, 171 + p.height], outline="#33507a", width=2)
    d.text((110, H - 70), "Deadline Desk · Design Master Solutions LLC", font=MONO, fill="#7f93b0")
    png, aiff, mp4 = V/f"s{i}.png", V/f"s{i}.aiff", V/f"s{i}.mp4"
    im.save(png)
    subprocess.run(["say", "-v", "Samantha", "-r", "186", "-o", aiff, narr], check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", png, "-i", aiff, "-af", "apad=pad_dur=0.6",
                    "-shortest", "-c:v", "libx264", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "30",
                    "-c:a", "aac", "-ar", "48000", mp4], check=True)
    parts.append(mp4)
(V/"list.txt").write_text("".join(f"file '{p}'\n" for p in parts))
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", V/"list.txt", "-c", "copy",
                "-movflags", "+faststart", R/"docs/demo.mp4"], check=True)
