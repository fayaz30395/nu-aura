import sys, time, requests
sys.path.insert(0, ".")
from plib import *
L = Log("NU-SEC-GATE-F18-public-bucket-webhooks")
codes = []
for i in range(26):
    r = requests.get(BE + "/api/v1/public/careers/filters", headers={"X-Forwarded-For": "198.51.100.240"}, timeout=15); codes.append(r.status_code)
L.w("PUBLIC bucket: 26 GETs /api/v1/public/careers/filters, fixed XFF:", codes.count(200), "x200,", codes.count(429), "x429; first 429 at request #", (codes.index(429) + 1) if 429 in codes else None)
for lab, m, p, h, b in [("razorpay no signature", "POST", "/api/v1/payments/webhooks/razorpay", {}, "{}"),
                         ("razorpay bogus signature", "POST", "/api/v1/payments/webhooks/razorpay", {"X-Razorpay-Signature": "deadbeef"}, "{}"),
                         ("stripe bogus signature", "POST", "/api/v1/payments/webhooks/stripe", {"Stripe-Signature": "t=1,v1=deadbeef"}, "{}"),
                         ("docusign no signature", "POST", "/api/v1/integrations/docusign/webhook", {}, "{}"),
                         ("biometric punch bogus api key", "POST", "/api/v1/biometric/punch", {"X-Biometric-Api-Key": "bogus"}, "{}"),
                         ("careers apply no captcha token (public form)", "POST", "/api/v1/public/careers/apply", {}, "{}")]:
    hh = {"Content-Type": "application/json", "X-Forwarded-For": "198.51.100.241"}; hh.update(h)
    r = requests.request(m, BE + p, data=b, headers=hh, timeout=20)
    L.w(f"{lab}: {r.status_code} {r.text[:130]!r}")
