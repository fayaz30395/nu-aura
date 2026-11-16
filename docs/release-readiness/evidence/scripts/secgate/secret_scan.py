#!/usr/bin/env python3
"""Targeted secret scan (gitleaks substitute). Prints rule + file:line (or commit:file) ONLY, never the matched value.
Usage: secret_scan.py tree | history <N>
"""
import re, subprocess, sys, os, math, collections

REPO = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura"
RULES = {
    "aws-access-key": re.compile(r"\b(AKIA|ASIA)[0-9A-Z]{16}\b"),
    "private-key-block": re.compile(r"-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    "slack-token": re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b"),
    "google-api-key": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
    "google-oauth-secret": re.compile(r"\bGOCSPX-[0-9A-Za-z_-]{20,}\b"),
    "stripe-live": re.compile(r"\b(sk|rk)_live_[0-9A-Za-z]{20,}\b"),
    "anthropic/openai-key": re.compile(r"\bsk-(ant-)?[A-Za-z0-9_-]{32,}\b"),
    "jwt-literal": re.compile(r"\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b"),
    "db-url-with-password": re.compile(r"(postgres(ql)?|mysql|redis|mongodb)(\+srv)?://[^\s:/@'\"]+:[^\s@'\"${}]{3,}@"),
    "vercel/railway-token": re.compile(r"\b(vercel_|railway_)[A-Za-z0-9_]{20,}\b", re.I),
    "neon-conn": re.compile(r"npg_[A-Za-z0-9]{10,}"),
    "generic-secret-assign": re.compile(
        r"(?i)\b(password|passwd|secret|api[_-]?key|token|private[_-]?key|encryption[_-]?key|jwt[_-]?secret)\b[\"']?\s*[:=]\s*[\"']([A-Za-z0-9+/=_!@#$%^&*.-]{12,})[\"']"),
}
# Values that are obviously placeholders / test fixtures
PLACEHOLDER = re.compile(r"(?i)(your[_-]|example|changeme|change_me|placeholder|redacted|xxxx|dummy|fake|test|sample|<|\$\{|\*\*\*|process\.env|env\.|todo|replace|secret_here|not[_-]?set|abcdef|1234|demo)")
SKIP_DIRS = ("node_modules/", "/target/", ".next/", "graphify-out/", ".git/", "/build/", ".ua/", "docs/release-readiness/evidence/", "/dist/", "/coverage/", "playwright-report/", "test-results/")
SKIP_EXT = (".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".jar", ".zip", ".class", ".lock", ".map", ".svg", ".xlsx", ".mp4", ".webp")


def entropy(s):
    c = collections.Counter(s)
    return -sum(v / len(s) * math.log2(v / len(s)) for v in c.values())


def scan_line(line):
    hits = []
    for name, rx in RULES.items():
        m = rx.search(line)
        if not m:
            continue
        val = m.group(2) if name == "generic-secret-assign" else m.group(0)
        if name == "generic-secret-assign":
            if PLACEHOLDER.search(val) or entropy(val) < 3.0:
                continue
        elif name == "db-url-with-password" and PLACEHOLDER.search(m.group(0)):
            continue
        hits.append(name)
    return hits


def tree():
    files = subprocess.check_output(["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"], cwd=REPO).decode().split("\0")
    n = 0
    for f in files:
        if not f or f.lower().endswith(SKIP_EXT) or any(s in "/" + f for s in SKIP_DIRS):
            continue
        p = os.path.join(REPO, f)
        try:
            if os.path.getsize(p) > 2_000_000:
                continue
            with open(p, "r", errors="ignore") as fh:
                for i, line in enumerate(fh, 1):
                    if len(line) > 4000:
                        continue
                    for h in scan_line(line):
                        print(f"{h}\t{f}:{i}")
                        n += 1
        except (IsADirectoryError, FileNotFoundError, PermissionError):
            continue
    print(f"# tree hits: {n}", file=sys.stderr)


def history(n):
    out = subprocess.Popen(["git", "log", f"-{n}", "-p", "--no-color", "--format=@@COMMIT %h %ad", "--date=short", "-U0"],
                           cwd=REPO, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    commit = file = None
    seen = set()
    cnt = 0
    for raw in out.stdout:
        line = raw.decode("utf-8", "ignore")
        if line.startswith("@@COMMIT "):
            commit = line.split()[1] + " " + line.split()[2]
        elif line.startswith("+++ b/"):
            file = line[6:].strip()
        elif line.startswith("+") and not line.startswith("+++"):
            if file and (file.lower().endswith(SKIP_EXT) or any(s in "/" + file for s in SKIP_DIRS)):
                continue
            if len(line) > 4000:
                continue
            for h in scan_line(line[1:]):
                key = (h, commit, file)
                if key in seen:
                    continue
                seen.add(key)
                print(f"{h}\t{commit}\t{file}")
                cnt += 1
    print(f"# history hits: {cnt}", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1] == "tree":
        tree()
    else:
        history(int(sys.argv[2]))
