"""Shared harness for the tenant/RBAC agent. Cookie jars are curl Netscape files kept OUTSIDE the repo (JARS env).
Transcripts go to evidence/logs/<test-id>.txt with cookies/tokens never written. Min 0.7s between calls per account
(API bucket is 100/min per token)."""
import os, json, time, urllib.request, urllib.error, urllib.parse, re
JARS = os.environ.get('JARS', '')
LOGDIR = '/Users/fayaz.m/IdeaProjects/nulogic/nu-aura/docs/release-readiness/evidence/logs'
BASE = 'http://localhost:8080'
_last = {}
_sess = {}

def session(label):
    if label in _sess: return _sess[label]
    c = {}
    for line in open(os.path.join(JARS, label + '.jar')):
        line = line.rstrip('\n')
        if line.startswith('#HttpOnly_'): line = line[len('#HttpOnly_'):]
        elif line.startswith('#') or not line.strip(): continue
        p = line.split('\t')
        if len(p) >= 7: c[p[5]] = p[6]
    _sess[label] = c
    return c

def call(label, method, path, body=None, headers=None, cookies='auto', test=None, note='', max_body=260, snippet=True):
    """Returns (status, text). cookies: 'auto' = the label's jar, None = no cookies, dict = explicit."""
    h = {'Accept': 'application/json'}
    if cookies == 'auto' and label:
        ck = session(label)
    elif isinstance(cookies, dict):
        ck = cookies
    else:
        ck = {}
    if ck:
        h['Cookie'] = '; '.join(f'{k}={v}' for k, v in ck.items())
        if 'XSRF-TOKEN' in ck: h['X-XSRF-TOKEN'] = ck['XSRF-TOKEN']
    data = None
    if body is not None:
        data = json.dumps(body).encode(); h['Content-Type'] = 'application/json'
    if headers: h.update(headers)
    key = label or 'anon'
    dt = time.time() - _last.get(key, 0)
    if dt < 0.7: time.sleep(0.7 - dt)
    req = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        r = urllib.request.urlopen(req, timeout=40); st = r.status; txt = r.read().decode('utf-8', 'replace'); rh = dict(r.headers)
    except urllib.error.HTTPError as e:
        st = e.code; txt = e.read().decode('utf-8', 'replace'); rh = dict(e.headers)
    except Exception as e:
        st = -1; txt = f'EXC {e}'; rh = {}
    _last[key] = time.time()
    if st == 429:  # shared auth/api bucket: one polite retry
        time.sleep(float(rh.get('Retry-After', '5')) + 1)
        return call(label, method, path, body, headers, cookies, test, note, max_body, snippet)
    if test:
        os.makedirs(LOGDIR, exist_ok=True)
        with open(os.path.join(LOGDIR, test + '.txt'), 'a') as f:
            sn = re.sub(r'\s+', ' ', txt)[:max_body] if snippet else '(omitted)'
            hs = ' '.join(f'{k}: {v}' for k, v in (headers or {}).items())
            f.write(f'{time.strftime("%H:%M:%S")} [{label}] {method} {path}{" +hdr{"+hs+"}" if hs else ""}{" BODY=" + json.dumps(body)[:200] if body is not None else ""} -> {st}  {note}\n    {sn}\n')
    return st, txt

def js(txt):
    try: return json.loads(txt)
    except Exception: return None
