#!/usr/bin/env python3
import sys, re, json, time, io, requests
sys.path.insert(0, ".")
from plib import *
H = load_session("hr"); A = load_session("arun")
SRC = open(REPO + "/backend/src/main/java/com/nulogic/application/document/service/FileStorageService.java").read()
cats = re.search(r"ALLOWED_CATEGORIES = Set\.of\(([^)]*)\)", SRC).group(1)
print("categories:", cats.replace("\n", " ")[:200])
me = A.get(BE + "/api/v1/employees/me", timeout=20).json(); eid = me["id"]
# ---------- F13 upload ----------
L = Log("NU-SEC-GATE-F13-upload")
def up(label, name, data, ctype, cat="documents", ent=eid, session=H):
    t = xsrf(session)
    r = requests.post(BE + "/api/v1/files/upload", files={"file": (name, data, ctype)}, data={"category": cat, "entityId": ent},
                      headers={"Cookie": "; ".join(f"{k}={v}" for k, v in session.ck.items() if k in ("access_token", "XSRF-TOKEN")), "X-XSRF-TOKEN": t}, timeout=60)
    L.w(f"{label}: {r.status_code} {r.text[:140]!r}")
    return r
PDFH = b"%PDF-1.4\n"; PNGH = b"\x89PNG\r\n\x1a\n"; GIFH = b"GIF89a"
up("HTML body declared text/plain", "NUAURA_TEST_x.txt", b"<html><script>alert(1)</script></html>", "text/plain")
up("EXE (MZ) declared application/pdf", "NUAURA_TEST_x.pdf", b"MZ\x90\x00" + b"A" * 100, "application/pdf")
up("PHP declared image/png (no PNG magic)", "NUAURA_TEST_x.php", b"<?php system($_GET[0]); ?>", "image/png")
up("SVG with script (image/svg+xml)", "NUAURA_TEST_x.svg", b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "image/svg+xml")
up("HTML declared text/html", "NUAURA_TEST_x.html", b"<html></html>", "text/html")
up("Path traversal filename", "../../../etc/NUAURA_TEST_passwd.pdf", PDFH + b"x" * 50, "application/pdf")  # control: valid pdf magic; may store
up("Oversize 11MB pdf", "NUAURA_TEST_big.pdf", PDFH + b"0" * (11 * 1024 * 1024), "application/pdf")
up("ZIP bomb-shaped declared docx w/ wrong body", "NUAURA_TEST_x.docx", b"PK\x03\x04" + b"0" * 200, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
up("invalid category traversal", "NUAURA_TEST_x.pdf", PDFH + b"x", "application/pdf", cat="../../tmp")
up("EMPLOYEE (arun) uploads for ANOTHER employee id", "NUAURA_TEST_x.pdf", PDFH + b"x", "application/pdf", ent="00000000-0000-0000-0000-000000000001", session=A)
# ---------- F15 injection ----------
L = Log("NU-SEC-GATE-F15-injection-errors")
def g(label, path, s=H):
    r = s.get(BE + path, timeout=30)
    leak = sorted(set(re.findall(r"(PSQLException|SQLState|org\.hibernate|org\.springframework|java\.lang|\.java:\d+|Exception in|stackTrace|at com\.nulogic|PropertyReferenceException|No property|syntax error|/Users/)", r.text)))
    L.w(f"{label}: {r.status_code} len={len(r.text)} leak={leak} body={r.text[:120]!r}")
    return r
for lab, p in [("SQLi search quote", "/api/v1/employees?search=%27%20OR%20%271%27%3D%271"), ("SQLi search union", "/api/v1/employees?search=x%27%29%20UNION%20SELECT%20password_hash%20FROM%20users--"),
               ("sort injection", "/api/v1/employees?sort=id%3Bselect%20pg_sleep(3)"), ("sort unknown prop", "/api/v1/employees?sort=nonexistentProp,desc"),
               ("sort subselect", "/api/v1/employees?sort=(select%201)"), ("size=abc", "/api/v1/employees?size=abc"), ("page=-1", "/api/v1/employees?page=-1"),
               ("size huge", "/api/v1/employees?size=100000"), ("invalid uuid", "/api/v1/employees/not-a-uuid"), ("status enum invalid", "/api/v1/leave-requests?status=%27BOGUS"),
               ("departments sort", "/api/v1/departments?sort=name%27--,asc"), ("path traversal encoded", "/api/v1/files/download?path=..%2F..%2Fetc%2Fpasswd"),
               ("download direct traversal", "/api/v1/files/download/direct?objectName=..%2F..%2Fetc%2Fpasswd")]:
    t0 = time.time(); r = g(lab, p); L.w(f"   elapsed={time.time()-t0:.2f}s"); time.sleep(0.3)
for lab, body in [("type mismatch", {"firstName": {"a": 1}}), ("enum invalid", {"gender": "ZZZ"}), ("huge int", {"postalCode": 10 ** 40})]:
    r = mut(H, "PUT", "/api/v1/employees/me", json=body); L.w(f"PUT /employees/me {lab}: {r.status_code} {r.text[:140]!r}")
# ---------- F16 stored XSS (self-service address, restored) ----------
L = Log("NU-SEC-GATE-F16-xss-stored")
orig = me.get("address")
payload = "NUAURA_TEST_<img src=x onerror=alert(1)><script>alert(2)</script>"
r = mut(A, "PUT", "/api/v1/employees/me", json={"address": payload}); L.w("PUT address with HTML payload ->", r.status_code)
rb = A.get(BE + "/api/v1/employees/me", timeout=20).json().get("address")
L.w("read-back address contains raw <script>/<img onerror>:", "<script>" in (rb or "") or "onerror" in (rb or ""), "| stored value length", len(rb or ""))
r = mut(A, "PUT", "/api/v1/employees/me", json={"address": orig}); L.w("restore original address ->", r.status_code)
for lab, path, body in [("announcement", "/api/v1/announcements", {"title": "NUAURA_TEST_xss", "content": "<img src=x onerror=alert(1)><script>alert(2)</script><p>ok</p>", "priority": "NORMAL"}),
                        ("wiki page", "/api/v1/knowledge/wiki/pages", {"title": "NUAURA_TEST_xss", "content": "<script>alert(1)</script><p>ok</p>"})]:
    r = mut(H, "POST", path, json=body); L.w(f"{lab} create as HR_MANAGER -> {r.status_code} {r.text[:200]!r}")
# ---------- F17 SSRF via webhook config ----------
L = Log("NU-SEC-GATE-F17-ssrf")
for u in ("http://127.0.0.1:8080/actuator/health", "https://169.254.169.254/latest/meta-data/", "https://[::1]/", "https://2130706433/", "https://localhost/"):
    r = mut(H, "POST", "/api/webhooks", json={"name": "NUAURA_TEST_ssrf", "url": u, "events": ["EMPLOYEE_CREATED"]})
    L.w(f"webhook url={u} -> {r.status_code} {r.text[:160]!r}")
