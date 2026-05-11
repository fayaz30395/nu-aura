# NU-AURA API Quick Start

**Goal:** Make your first authenticated request, register your first webhook, and handle pagination + errors — in **5 minutes**.

**Companion docs:**

- Full API guide: `external-api-guide.md`
- Webhook reference: `webhook-payload-reference.md`
- Endpoint schemas (interactive): `/api/v1/swagger-ui.html`

---

## What you need

- A NU-AURA tenant (live or sandbox)
- The base URL of your tenant's API host (e.g. `https://api.nu-aura.example.com`)
- `curl` (or any HTTP client) on your terminal
- Tenant-admin access to mint an API key

Export the base URL once so the snippets below stay short:

```bash
export NU_BASE="https://api.nu-aura.example.com"
```

---

## Step 1 — Get an API key (60 seconds)

You can mint a key either from the admin UI (recommended for humans) or from the admin endpoint (recommended for scripts and CI).

### Option A — admin UI

1. Sign in as a tenant admin.
2. Go to **Settings → Integrations → API Keys**.
3. Click **New API Key**, give it a name and the scopes you need.
4. Copy the key value immediately — it is shown only once.

### Option B — admin endpoint

If you already have a key with `apikey:manage` scope (or are using a JWT cookie session), you can mint additional keys via HTTP:

```bash
curl -s -X POST "$NU_BASE/api/v1/admin/api-keys" \
  -H "X-API-Key: $NU_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Quickstart key",
    "scopes": ["employees:read", "webhooks:manage"]
  }' | jq .
```

The response includes a `key` field. **Copy it now**:

```bash
export NU_API_KEY="nuk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

> Keys are SHA-256 hashed at rest. We cannot recover lost keys. Use a secret manager.

---

## Step 2 — Your first request (30 seconds)

List the first page of employees:

```bash
curl -s "$NU_BASE/api/v1/external/employees?size=5" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Accept: application/json" | jq .
```

Expected (shape):

```json
{
  "content": [
    {
      "id": "e-9f3a...",
      "employeeCode": "ACME-0001",
      "firstName": "Jane",
      "lastName": "Doe",
      "email": "jane.doe@acme.com",
      "status": "ACTIVE"
    }
  ],
  "page": {
    "number": 0,
    "size": 5,
    "totalElements": 247,
    "totalPages": 50,
    "first": true,
    "last": false
  }
}
```

If you got a `401`, your key is wrong or missing the right scope. If `403`, the key is valid but lacks the scope. If `429`, slow down — you hit the rate limiter.

---

## Step 3 — Your first webhook (90 seconds)

Stand up a receiver (anything that prints request headers + body). For a one-off test, [webhook.site](https://webhook.site) gives you a free disposable URL.

### Register the subscription

```bash
curl -s -X POST "$NU_BASE/api/v1/webhooks" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/your-uuid-here",
    "events": ["employee.created"],
    "secret": "whsec_replace_with_32_bytes_of_random",
    "description": "Quickstart webhook"
  }' | jq .
```

Response includes a webhook `id` (e.g. `wh-7c3a...`). Save it:

```bash
export NU_WEBHOOK_ID="wh-7c3a..."
```

### Fire a test ping

```bash
curl -s -X POST "$NU_BASE/api/v1/webhooks/$NU_WEBHOOK_ID/test" \
  -H "X-API-Key: $NU_API_KEY" | jq .
```

Refresh webhook.site — you should see the `POST` arrive within a few seconds, carrying:

- `X-NU-Event: webhook.test`
- `X-NU-Signature: t=...,v1=...`
- A JSON body with the standard envelope (`id`, `event`, `timestamp`, `tenantId`, `data`, `version`).

### Verify the signature

Before trusting any production payload, verify the HMAC. The minimal Python check:

```python
import hmac, hashlib, time

def verify(raw_body: bytes, signature_header: str, secret: bytes,
           tolerance_seconds: int = 300) -> bool:
    parts = dict(p.split("=", 1) for p in signature_header.split(","))
    ts = int(parts["t"])
    if abs(time.time() - ts) > tolerance_seconds:
        return False
    expected = hmac.new(secret, f"{ts}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, parts["v1"])
```

Full Node and Go examples live in `webhook-payload-reference.md`.

### Trigger a real event

Create an employee — the webhook will fire `employee.created`:

```bash
curl -s -X POST "$NU_BASE/api/v1/external/employees" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Quick",
    "lastName": "Start",
    "email": "quick.start+demo@acme.com",
    "joiningDate": "2026-06-01"
  }' | jq .
```

Your receiver should get the `employee.created` delivery within a few seconds.

---

## Step 4 — Filter & paginate (45 seconds)

All list endpoints accept `page`, `size`, `sort`, and a free-text `q`. They follow the same envelope shape.

### Paginate

```bash
curl -s "$NU_BASE/api/v1/external/employees?page=2&size=20&sort=lastName,asc" \
  -H "X-API-Key: $NU_API_KEY" | jq .
```

- `page` is zero-indexed
- `size` defaults to 20, max 100
- `sort` is `field,direction`; pass multiple for tie-breakers

### Filter (structured)

```bash
curl -s "$NU_BASE/api/v1/external/employees?status=ACTIVE&departmentId=d-eng" \
  -H "X-API-Key: $NU_API_KEY" | jq .
```

Field-specific filters are listed per endpoint in Swagger.

### Free-text search

```bash
curl -s "$NU_BASE/api/v1/external/employees?q=jane" \
  -H "X-API-Key: $NU_API_KEY" | jq .
```

Search uses Elasticsearch fuzzy match across name, email, and code. Empty `q` is treated as no filter.

### Loop through all pages

```bash
page=0
while :; do
  resp=$(curl -s "$NU_BASE/api/v1/external/employees?page=$page&size=100" \
    -H "X-API-Key: $NU_API_KEY")
  echo "$resp" | jq '.content[] | .id'
  last=$(echo "$resp" | jq -r '.page.last')
  [ "$last" = "true" ] && break
  page=$((page+1))
done
```

> Watch the **rate limit headers** (`X-RateLimit-Remaining`) and pause if you're close to 0.

---

## Step 5 — Error handling (45 seconds)

Every error response uses the canonical `ErrorResponse` envelope:

```json
{
  "timestamp": "2026-05-12T12:34:56Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Field 'email' must be a valid email address.",
  "path": "/api/v1/external/employees",
  "fieldErrors": [
    { "field": "email", "rejectedValue": "not-an-email", "message": "must be a valid email address" }
  ],
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

### What to do per status

| Status | Handle by                                                                  |
|--------|---------------------------------------------------------------------------|
| `400`  | Show `fieldErrors` to the user; do not retry                              |
| `401`  | Refresh credentials or surface "auth failed"; do not retry blindly        |
| `403`  | Surface "permission denied"; check key scopes                             |
| `404`  | Treat as "not found"; do not retry                                        |
| `409`  | Conflict — show user, ask them to refresh and retry                       |
| `422`  | Business-rule rejection — surface `message`; do not retry                 |
| `429`  | Read `Retry-After` and back off                                           |
| `5xx`  | Retry with exponential backoff (caps at 3 retries; respect `Retry-After`) |

Always log the `traceId` — it's required for support tickets.

### Minimal robust client

A safe retry loop in pseudocode:

```text
attempt = 0
while attempt < 3:
  response = call(endpoint, headers, body)
  if 200 <= response.status < 300:
    return response.body
  if response.status in {408, 429} or 500 <= response.status < 600:
    sleep(response.header("Retry-After") or backoff(attempt))
    attempt += 1
    continue
  raise PermanentError(response.body.message, response.body.traceId)
raise TransientError("exhausted retries")
```

---

## SDK pseudocode

NU-AURA doesn't ship official SDKs yet, but the API is small enough to wrap. Sketches for the three common stacks:

### Python

```python
import requests, time

class NuAura:
    def __init__(self, base_url: str, api_key: str):
        self.base = base_url.rstrip("/")
        self.s = requests.Session()
        self.s.headers.update({
            "X-API-Key": api_key,
            "Accept": "application/json",
            "Content-Type": "application/json",
        })

    def _req(self, method, path, **kw):
        for attempt in range(3):
            r = self.s.request(method, f"{self.base}{path}", timeout=30, **kw)
            if r.status_code < 300:
                return r.json() if r.content else None
            if r.status_code in (408, 429) or r.status_code >= 500:
                time.sleep(int(r.headers.get("Retry-After", 2 ** attempt)))
                continue
            r.raise_for_status()
        raise RuntimeError("retries exhausted")

    def list_employees(self, **params):
        return self._req("GET", "/api/v1/external/employees", params=params)

    def create_employee(self, payload):
        return self._req("POST", "/api/v1/external/employees", json=payload)

    def register_webhook(self, url, events, secret):
        return self._req("POST", "/api/v1/webhooks",
                         json={"url": url, "events": events, "secret": secret})

# usage
api = NuAura("https://api.nu-aura.example.com", "nuk_live_xxx")
for emp in api.list_employees(size=100)["content"]:
    print(emp["email"])
```

### Node.js (TypeScript)

```typescript
import { setTimeout as sleep } from 'node:timers/promises';

export class NuAura {
  constructor(private base: string, private apiKey: string) {}

  private async req<T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(this.base + path);
    if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
      if (res.status === 408 || res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
        await sleep(retryAfter * 1000);
        continue;
      }
      throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
    }
    throw new Error('retries exhausted');
  }

  listEmployees(query?: Record<string, string>) {
    return this.req<{ content: any[]; page: any }>('GET', '/api/v1/external/employees', undefined, query);
  }

  createEmployee(payload: Record<string, unknown>) {
    return this.req<any>('POST', '/api/v1/external/employees', payload);
  }

  registerWebhook(url: string, events: string[], secret: string) {
    return this.req<any>('POST', '/api/v1/webhooks', { url, events, secret });
  }
}

// usage
const api = new NuAura('https://api.nu-aura.example.com', process.env.NU_API_KEY!);
const { content } = await api.listEmployees({ size: '100' });
content.forEach(e => console.log(e.email));
```

### Go

```go
package nuaura

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"time"
)

type Client struct {
	Base    string
	APIKey  string
	HTTP    *http.Client
}

func New(base, key string) *Client {
	return &Client{Base: base, APIKey: key, HTTP: &http.Client{Timeout: 30 * time.Second}}
}

func (c *Client) do(method, path string, body, out any, q url.Values) error {
	u := c.Base + path
	if q != nil {
		u += "?" + q.Encode()
	}
	var buf io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		buf = bytes.NewReader(b)
	}
	for attempt := 0; attempt < 3; attempt++ {
		req, _ := http.NewRequest(method, u, buf)
		req.Header.Set("X-API-Key", c.APIKey)
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		res, err := c.HTTP.Do(req)
		if err != nil {
			time.Sleep(time.Duration(1<<attempt) * time.Second)
			continue
		}
		defer res.Body.Close()
		if res.StatusCode < 300 {
			if out == nil || res.StatusCode == http.StatusNoContent {
				return nil
			}
			return json.NewDecoder(res.Body).Decode(out)
		}
		if res.StatusCode == 408 || res.StatusCode == 429 || res.StatusCode >= 500 {
			retry, _ := strconv.Atoi(res.Header.Get("Retry-After"))
			if retry == 0 {
				retry = 1 << attempt
			}
			time.Sleep(time.Duration(retry) * time.Second)
			continue
		}
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("%d %s: %s", res.StatusCode, res.Status, body)
	}
	return errors.New("retries exhausted")
}

func (c *Client) ListEmployees(q url.Values) (map[string]any, error) {
	var out map[string]any
	return out, c.do("GET", "/api/v1/external/employees", nil, &out, q)
}
```

---

## Where to next

- **Endpoint catalog (interactive)** — `/api/v1/swagger-ui.html`
- **Full API conventions** — `external-api-guide.md` (auth, rate limits, pagination, errors, versioning)
- **Webhook contract** — `webhook-payload-reference.md` (HMAC, retries, event catalog)
- **Status page** — `https://status.nu-aura.example.com`
- **Support** — include the `traceId` from the failing response

You're done. Total: under 5 minutes. Happy building.

---

**Last reviewed:** 2026-05-12
