"""Tiny local API client for NU-AURA payroll tests. Password from env NUAURA_DEMO_PW (never printed).
Manual cookie handling (stdlib cookiejar rejects the Domain=localhost cookies)."""
import json, os, urllib.request, urllib.error
BASE = "http://localhost:8080"
JAR_DIR = os.environ.get("NUAURA_JAR_DIR", "/tmp")
KEEP = ("access_token", "refresh_token", "XSRF-TOKEN")

class Client:
    def __init__(self, email):
        self.email = email
        self.path = os.path.join(JAR_DIR, email.replace("@", "_at_") + ".json")
        self.ck = json.load(open(self.path)) if os.path.exists(self.path) else {}
    def call(self, method, path, body=None, raw=False):
        data = json.dumps(body).encode() if body is not None else None
        h = {"Content-Type": "application/json", "Accept": "application/json, application/pdf"}
        if self.ck: h["Cookie"] = "; ".join(f"{k}={v}" for k, v in self.ck.items())
        if "XSRF-TOKEN" in self.ck: h["X-XSRF-TOKEN"] = self.ck["XSRF-TOKEN"]
        import time
        for attempt in range(10):  # single shared per-IP limiter on localhost: retry 429 with backoff
            req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
            try:
                r = urllib.request.urlopen(req); code, rb, hd = r.status, r.read(), r.headers
            except urllib.error.HTTPError as e:
                code, rb, hd = e.code, e.read(), e.headers
            if code != 429: break
            time.sleep(8)
        for sc in hd.get_all("Set-Cookie") or []:
            k, _, rest = sc.partition("="); v = rest.split(";")[0]
            if k in KEEP: self.ck[k] = v
        json.dump(self.ck, open(self.path, "w")); os.chmod(self.path, 0o600)
        if raw: return code, rb, hd.get("Content-Type", "")
        try: return code, (json.loads(rb) if rb else None)
        except Exception: return code, rb[:300].decode("utf8", "replace")
    def login(self):
        code, b = self.call("POST", "/api/v1/auth/login", {"email": self.email, "password": os.environ["NUAURA_TEST_PW" if self.email.startswith("nuaura_test_") else "NUAURA_DEMO_PW"]})
        return code, ("ok" if code == 200 else b)

def get(email):
    c = Client(email)
    code, _ = c.call("GET", "/api/v1/auth/me")
    if code != 200:
        import time
        for _ in range(8):  # shared 5/min limiter: back off on 429
            code, b = c.login()
            if code != 429: break
            time.sleep(25)
        if code != 200: raise SystemExit(f"login failed {email}: {code} {b}")
    return c
