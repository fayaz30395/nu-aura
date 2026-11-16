"""Shared helpers for secgate probes. Redacts cookies/tokens/passwords from all transcript output."""
import re, time, json, os, sys, requests, warnings
warnings.filterwarnings("ignore")

REPO = "/Users/fayaz.m/IdeaProjects/nulogic/nu-aura"
BE = "http://localhost:8080"
FE = "http://localhost:3000"
LOGDIR = REPO + "/docs/release-readiness/evidence/logs"
SCRATCH = "/private/tmp/claude-504/-Users-fayaz-m-IdeaProjects-nulogic-nu-aura/31fd4514-1941-4084-b1c8-e1a40e6df684/scratchpad/secgate"

_JWT = re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*")
_COOKIEVAL = re.compile(r"((?:access_token|refresh_token|XSRF-TOKEN|__Host-hrms-access|__Host-hrms-refresh)=)[^;\s,]+")


def demo_pw():
    t = open(REPO + "/docs/qa/AUTONOMOUS-UI-E2E-RUNBOOK.md").read()
    return re.search(r"all `([^`]+)`\)", t).group(1)


def test_pw():
    return open(SCRATCH + "/testuser.pw").read().strip()


def redact(s):
    s = _JWT.sub("[JWT-REDACTED]", str(s))
    s = _COOKIEVAL.sub(r"\1[REDACTED]", s)
    s = re.sub(r'("(?:password|newPassword|currentPassword|token|accessToken|refreshToken)"\s*:\s*")[^"]*(")', r"\1[REDACTED]\2", s)
    return s


class Log:
    def __init__(self, name):
        self.path = f"{LOGDIR}/{name}.txt"
        self.f = open(self.path, "w")

    def w(self, *a):
        line = " ".join(redact(x) for x in a)
        self.f.write(line + "\n")
        self.f.flush()
        print(line)

    def req(self, label, r, body_chars=300):
        hdr = {k: v for k, v in r.headers.items() if k.lower() in (
            "content-type", "location", "www-authenticate", "access-control-allow-origin", "access-control-allow-credentials",
            "retry-after", "x-ratelimit-remaining", "server", "x-powered-by")}
        self.w(f"[{label}] {r.request.method} {r.request.url.replace(BE,'')} -> {r.status_code} hdr={hdr} body={r.text[:body_chars]!r}")


class CS(requests.Session):
    """Session that sends auth cookies explicitly (requests' cookiejar drops Domain=localhost cookies over http)."""
    def __init__(self):
        super().__init__()
        self.ck = {}

    def request(self, method, url, **kw):
        h = dict(kw.pop("headers", None) or {})
        if "Cookie" not in h and self.ck:
            parts = [f"{k}={v}" for k, v in self.ck.items() if not (k in ("refresh_token",) and "/api/v1/auth" not in url) and not k.startswith("__Host")]
            h["Cookie"] = "; ".join(parts)
        kw["headers"] = h
        return super().request(method, url, **kw)


def _absorb(s, r):
    for c in r.raw.headers.getlist("Set-Cookie"):
        nv = c.split(";", 1)[0]
        n, v = nv.split("=", 1)
        s.ck[n] = v


def login(email, password, log=None, tries=14):
    """Login once; retries only on 429 (shared per-IP auth bucket). Returns (session, response)."""
    for i in range(tries):
        s = CS()
        r = s.post(BE + "/api/v1/auth/login", json={"email": email, "password": password}, timeout=20)
        if r.status_code == 429:
            if log:
                log.w(f"login {email}: 429, waiting 25s (shared bucket)")
            time.sleep(25)
            continue
        _absorb(s, r)
        return s, r
    return s, r


def xsrf(s):
    return s.ck.get("XSRF-TOKEN")


def mut(s, method, path, **kw):
    h = kw.pop("headers", {})
    t = xsrf(s)
    if t:
        h["X-XSRF-TOKEN"] = t
    return s.request(method, BE + path, headers=h, timeout=20, **kw)


def save_session(name, s):
    p = f"{SCRATCH}/sess_{name}.json"
    json.dump(s.ck, open(p, "w"))
    os.chmod(p, 0o600)


def load_session(name):
    s = CS()
    s.ck = json.load(open(f"{SCRATCH}/sess_{name}.json"))
    return s
