# NU-AURA Webhook Payload Reference

**Audience:** Tenant administrators and integration developers building HTTP receivers for NU-AURA webhook events.
**Companion:** Use this alongside the external API guide (`external-api-guide.md`) for authentication, rate limits, and CORS, and the Swagger UI for `/api/v1/webhooks` endpoint schemas.

---

## 1. Overview

NU-AURA fires outbound HTTP `POST` webhooks to subscribed URLs whenever configurable domain events occur. Webhooks are the recommended way to drive near-real-time integrations (ERP sync, finance reconciliation, slack/teams alerts, etc.) without polling the API.

**Delivery model:**

- Direction: NU-AURA → your endpoint (HTTPS only; HTTP rejected on registration)
- Verb: always `POST`
- Body: `application/json` with the standard envelope (section 5)
- Signature: HMAC-SHA256 in the `X-NU-Signature` header (section 4)
- Delivery: at-least-once with 3 retries and circuit breaker (section 6)
- Ordering: not guaranteed across events; consumers must be idempotent on `id`

---

## 2. Configuration

Webhooks are registered per-tenant via the external API.

### 2.1 Create a webhook subscription

```http
POST /api/v1/webhooks HTTP/1.1
X-API-Key: <tenant-api-key>
Content-Type: application/json

{
  "url": "https://hooks.acme.com/nu-aura",
  "events": [
    "employee.created",
    "employee.updated",
    "leave.requested",
    "leave.approved"
  ],
  "secret": "whsec_32_bytes_of_random_hex_or_b64",
  "customHeaders": {
    "X-Acme-Source": "nu-aura",
    "X-Acme-Env": "prod"
  },
  "description": "Acme HR sync",
  "active": true
}
```

**Response:**

```json
{
  "id": "wh-7c3a...",
  "url": "https://hooks.acme.com/nu-aura",
  "events": ["employee.created", "employee.updated", "leave.requested", "leave.approved"],
  "active": true,
  "secretLastFour": "f9a2",
  "customHeaders": { "X-Acme-Source": "nu-aura", "X-Acme-Env": "prod" },
  "createdAt": "2026-05-12T12:34:56Z"
}
```

> **The `secret` is never returned again after creation.** Store it in your secret manager. To rotate, call `POST /api/v1/webhooks/{id}/rotate-secret`.

### 2.2 Field requirements

| Field            | Required | Notes                                                                 |
|------------------|----------|-----------------------------------------------------------------------|
| `url`            | yes      | HTTPS only; must respond `2xx` within 10s on the ping test            |
| `events`         | yes      | Non-empty array; see section 7 catalog                                |
| `secret`         | yes      | 16+ characters; recommended 32+ bytes of cryptographic random         |
| `customHeaders`  | no       | Map of additional headers; allowlist enforced (section 8)             |
| `description`    | no       | Free-text label for your own bookkeeping                              |
| `active`         | no       | Default `true`; set `false` to pause deliveries without deleting      |

### 2.3 Manage subscriptions

| Operation                 | Endpoint                                            |
|---------------------------|-----------------------------------------------------|
| List                      | `GET /api/v1/webhooks`                              |
| Get                       | `GET /api/v1/webhooks/{id}`                         |
| Update                    | `PATCH /api/v1/webhooks/{id}`                       |
| Delete                    | `DELETE /api/v1/webhooks/{id}`                      |
| Pause                     | `PATCH /api/v1/webhooks/{id}` with `{"active":false}` |
| Rotate secret             | `POST /api/v1/webhooks/{id}/rotate-secret`          |
| Send test ping            | `POST /api/v1/webhooks/{id}/test`                   |
| List delivery attempts    | `GET /api/v1/webhooks/{id}/deliveries`              |
| Replay a delivery         | `POST /api/v1/webhooks/{id}/deliveries/{deliveryId}/replay` |

---

## 3. Receiver expectations

Your endpoint must:

1. Accept `POST` with a JSON body up to **256 KiB**.
2. Respond with a `2xx` status within **10 seconds** to acknowledge receipt.
3. Validate the HMAC signature **before** trusting the payload.
4. Be idempotent on the envelope `id` field (deliveries can be repeated on retry).
5. Process the event asynchronously after returning `2xx` — do not block the response on downstream work.

A `2xx` is treated as success. Any `4xx` (except `408`/`429`) is treated as a permanent failure and is **not** retried (the assumption is the request is malformed and retrying will not help). `408`, `429`, `5xx`, timeouts, and TCP-level errors trigger retry.

---

## 4. HMAC Signature Verification

Every delivery includes:

```http
X-NU-Signature: t=1715518440,v1=8f7a3e2c4b...hexdigest
X-NU-Event:     employee.created
X-NU-Delivery:  d1e5f6a7-...
X-NU-Webhook:   wh-7c3a...
X-NU-Tenant:    t1-acme-...
User-Agent:     NU-AURA-Webhook/1.0
```

The signature is computed over the **exact raw request body bytes** as:

```
HMAC_SHA256(secret, "{timestamp}.{raw_body}")
```

`t=` is the Unix timestamp (seconds) used in the HMAC input, and `v1=` is the lowercase hex digest. Reject deliveries where `|now - t|` exceeds 5 minutes (replay protection).

### 4.1 Python (Flask example)

```python
import hmac
import hashlib
import time
from flask import Flask, request, abort

app = Flask(__name__)
WEBHOOK_SECRET = b"whsec_replace_with_your_secret"

def parse_signature_header(header: str) -> tuple[int, str]:
    parts = dict(p.split("=", 1) for p in header.split(","))
    return int(parts["t"]), parts["v1"]

def verify(payload_bytes: bytes, signature_header: str, secret: bytes,
           tolerance_seconds: int = 300) -> bool:
    try:
        ts, sig = parse_signature_header(signature_header)
    except (KeyError, ValueError):
        return False
    if abs(time.time() - ts) > tolerance_seconds:
        return False  # replay window exceeded
    signed_payload = f"{ts}.".encode() + payload_bytes
    expected = hmac.new(secret, signed_payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig)

@app.post("/nu-aura")
def receive():
    sig = request.headers.get("X-NU-Signature", "")
    if not verify(request.get_data(), sig, WEBHOOK_SECRET):
        abort(401)
    event = request.json
    # enqueue for async processing — return fast
    return "", 204
```

### 4.2 Node.js (Express example)

```javascript
const express = require('express');
const crypto = require('crypto');

const app = express();
const SECRET = Buffer.from(process.env.NU_WEBHOOK_SECRET);

// IMPORTANT: capture the raw body for signature verification
app.use('/nu-aura', express.raw({ type: 'application/json', limit: '256kb' }));

function verifySignature(rawBody, signatureHeader, secret, toleranceSeconds = 300) {
  const parts = Object.fromEntries(signatureHeader.split(',').map(p => p.split('=', 2)));
  const ts = parseInt(parts.t, 10);
  const sig = parts.v1;
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > toleranceSeconds) return false;
  const signedPayload = Buffer.concat([Buffer.from(`${ts}.`), rawBody]);
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

app.post('/nu-aura', (req, res) => {
  if (!verifySignature(req.body, req.headers['x-nu-signature'] || '', SECRET)) {
    return res.sendStatus(401);
  }
  const event = JSON.parse(req.body.toString('utf8'));
  // enqueue and ack immediately
  res.sendStatus(204);
});
```

### 4.3 Go (net/http example)

```go
package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

var secret = []byte("whsec_replace_with_your_secret")

func parseSig(h string) (int64, string, bool) {
	parts := map[string]string{}
	for _, p := range strings.Split(h, ",") {
		kv := strings.SplitN(p, "=", 2)
		if len(kv) == 2 {
			parts[kv[0]] = kv[1]
		}
	}
	ts, err := strconv.ParseInt(parts["t"], 10, 64)
	if err != nil {
		return 0, "", false
	}
	return ts, parts["v1"], true
}

func verify(body []byte, sigHeader string, secret []byte) bool {
	ts, sig, ok := parseSig(sigHeader)
	if !ok {
		return false
	}
	if abs(time.Now().Unix()-ts) > 300 {
		return false
	}
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(strconv.FormatInt(ts, 10) + "."))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(sig))
}

func abs(x int64) int64 {
	if x < 0 {
		return -x
	}
	return x
}

func handler(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	if !verify(body, r.Header.Get("X-NU-Signature"), secret) {
		http.Error(w, "invalid signature", http.StatusUnauthorized)
		return
	}
	// enqueue work and return fast
	w.WriteHeader(http.StatusNoContent)
}
```

> **Always use a constant-time compare** (`hmac.compare_digest`, `crypto.timingSafeEqual`, `hmac.Equal`). Do not use `==` on strings — it leaks information through timing.

---

## 5. Payload Envelope

Every event body uses the same envelope:

```json
{
  "id": "d1e5f6a7-8b9c-4d10-9e2f-3a4b5c6d7e8f",
  "event": "employee.created",
  "timestamp": "2026-05-12T12:34:56.789Z",
  "tenantId": "t1-acme-c8d9e0f1...",
  "data": {
    /* event-specific payload — see section 7 */
  },
  "version": "1.0"
}
```

| Field        | Type    | Description                                                  |
|--------------|---------|--------------------------------------------------------------|
| `id`         | UUID    | Unique per **delivery** — repeats on retry. Idempotency key. |
| `event`      | string  | Event type, dotted notation (resource.action)                |
| `timestamp`  | ISO-8601 UTC | When the event was emitted server-side                  |
| `tenantId`   | UUID    | Tenant the event belongs to                                  |
| `data`       | object  | Event-specific payload                                       |
| `version`    | string  | Envelope schema version (semver). Currently `1.0`.           |

Inside `data`, **timestamps are ISO-8601 UTC**, **IDs are UUIDs**, and **monetary amounts are objects** of the shape `{"amount": "1234.56", "currency": "USD"}` (string amount to avoid float precision loss).

Receivers MUST ignore unknown fields in both envelope and `data`. We add fields without bumping `version`.

---

## 6. Retry Policy & Circuit Breaker

| Property                | Value                                                                  |
|-------------------------|------------------------------------------------------------------------|
| Total attempts          | **3** (1 initial + 2 retries)                                          |
| Backoff schedule        | `4s`, `16s`, `60s` (exponential, jittered ±20%)                        |
| Request timeout         | 10 seconds per attempt (connect + first-byte + body)                   |
| Retry triggers          | `408`, `429`, `5xx`, connection error, TLS error, timeout              |
| Permanent-failure triggers | `400`, `401`, `403`, `404`, `410`, `415`, `422`                     |
| Circuit breaker         | Opens after 10 consecutive permanent failures within 5 minutes         |
| Open-state duration     | 5 minutes; deliveries marked `FAILED` and not attempted                |
| Half-open               | After 5 minutes, a single test ping is sent; success closes the breaker |
| Final state             | After 3 attempts fail, the delivery is marked `FAILED` and the event is dead-lettered |

### 6.1 Delivery log

Inspect all attempts (success or failure):

```http
GET /api/v1/webhooks/{id}/deliveries?status=FAILED&from=2026-05-10T00:00:00Z
```

Response:

```json
{
  "content": [
    {
      "deliveryId": "d1e5f6a7-...",
      "event": "employee.created",
      "status": "FAILED",
      "attempts": 3,
      "lastAttemptAt": "2026-05-12T12:35:36Z",
      "lastResponseStatus": 502,
      "lastResponseBody": "Bad Gateway",
      "lastErrorClass": "io.netty.handler.timeout.ReadTimeoutException",
      "nextAttemptAt": null
    }
  ],
  "page": { "number": 0, "size": 20, "totalElements": 47, "totalPages": 3 }
}
```

### 6.2 Replay

You can manually replay any delivery within 30 days of the original event:

```http
POST /api/v1/webhooks/{id}/deliveries/{deliveryId}/replay
```

The replay carries the same envelope `id` — your idempotency logic will see it as a duplicate.

### 6.3 Bulk replay after outage

If your receiver was down, list `FAILED` deliveries and replay them in batch. The admin UI also exposes a one-click "Replay all failed in last 24h" button.

---

## 7. Event Catalog

Below are all currently supported event types, grouped by domain. Each shows the `data` payload shape. Optional fields may be omitted when null.

### 7.1 Employee events

#### `employee.created`

```json
{
  "id": "d1e5f6a7-...",
  "event": "employee.created",
  "timestamp": "2026-05-12T12:34:56Z",
  "tenantId": "t1-...",
  "version": "1.0",
  "data": {
    "employeeId": "e-9f3a...",
    "employeeCode": "ACME-0421",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@acme.com",
    "departmentId": "d-...",
    "departmentName": "Engineering",
    "designationId": "g-...",
    "designationName": "Senior Engineer",
    "locationId": "l-...",
    "managerId": "e-...",
    "joiningDate": "2026-06-01",
    "employmentType": "FULL_TIME",
    "status": "ACTIVE"
  }
}
```

#### `employee.updated`

Same shape as `employee.created`, plus a `changedFields` array:

```json
"data": {
  "employeeId": "e-9f3a...",
  "changedFields": ["designationId", "managerId"],
  "previous": { "designationId": "g-old", "managerId": "e-old" },
  "current":  { "designationId": "g-new", "managerId": "e-new" },
  /* full employee snapshot follows */
}
```

#### `employee.terminated`

```json
"data": {
  "employeeId": "e-9f3a...",
  "terminationDate": "2026-05-31",
  "terminationReason": "RESIGNATION",
  "lastWorkingDay": "2026-05-31",
  "exitInterviewCompleted": false,
  "rehireEligible": true
}
```

### 7.2 Leave events

#### `leave.requested`

```json
"data": {
  "leaveRequestId": "lr-...",
  "employeeId": "e-...",
  "leaveTypeId": "lt-annual",
  "leaveTypeName": "Annual Leave",
  "fromDate": "2026-06-10",
  "toDate": "2026-06-12",
  "totalDays": 3,
  "reason": "Family trip",
  "status": "PENDING",
  "submittedAt": "2026-05-12T12:34:56Z"
}
```

#### `leave.approved`

```json
"data": {
  "leaveRequestId": "lr-...",
  "employeeId": "e-...",
  "approvedBy": "e-mgr...",
  "approvedAt": "2026-05-13T09:00:00Z",
  "comments": "Approved.",
  "status": "APPROVED"
}
```

#### `leave.rejected`

```json
"data": {
  "leaveRequestId": "lr-...",
  "employeeId": "e-...",
  "rejectedBy": "e-mgr...",
  "rejectedAt": "2026-05-13T09:00:00Z",
  "reason": "Coverage gap during release week.",
  "status": "REJECTED"
}
```

### 7.3 Expense events

#### `expense.submitted`

```json
"data": {
  "expenseId": "ex-...",
  "employeeId": "e-...",
  "category": "TRAVEL",
  "amount": { "amount": "245.75", "currency": "USD" },
  "expenseDate": "2026-05-10",
  "description": "Client visit — taxi",
  "receiptUrl": "https://files.nu-aura.example.com/...",
  "status": "SUBMITTED"
}
```

#### `expense.approved`

```json
"data": {
  "expenseId": "ex-...",
  "approvedBy": "e-mgr...",
  "approvedAt": "2026-05-12T14:00:00Z",
  "status": "APPROVED"
}
```

#### `expense.reimbursed`

```json
"data": {
  "expenseId": "ex-...",
  "reimbursedAt": "2026-05-30T00:00:00Z",
  "payrollRunId": "pr-...",
  "amount": { "amount": "245.75", "currency": "USD" },
  "status": "REIMBURSED"
}
```

### 7.4 Payroll events

#### `payroll.run.created`

```json
"data": {
  "payrollRunId": "pr-...",
  "periodStart": "2026-05-01",
  "periodEnd": "2026-05-31",
  "currency": "USD",
  "employeeCount": 247,
  "status": "DRAFT",
  "createdBy": "e-admin..."
}
```

#### `payroll.run.processed`

```json
"data": {
  "payrollRunId": "pr-...",
  "processedAt": "2026-05-28T18:00:00Z",
  "grossTotal": { "amount": "1247800.00", "currency": "USD" },
  "netTotal":   { "amount": "923450.00",  "currency": "USD" },
  "taxTotal":   { "amount": "324350.00",  "currency": "USD" },
  "status": "PROCESSED"
}
```

#### `payroll.run.approved`

```json
"data": {
  "payrollRunId": "pr-...",
  "approvedBy": "e-cfo...",
  "approvedAt": "2026-05-29T10:00:00Z",
  "status": "APPROVED",
  "payDate": "2026-05-31"
}
```

### 7.5 Contract events

#### `contract.created`

```json
"data": {
  "contractId": "c-...",
  "employeeId": "e-...",
  "contractType": "EMPLOYMENT",
  "title": "Senior Engineer Offer",
  "startDate": "2026-06-01",
  "endDate": null,
  "status": "DRAFT"
}
```

#### `contract.signed`

```json
"data": {
  "contractId": "c-...",
  "signedBy": "jane.doe@acme.com",
  "signedAt": "2026-05-25T16:30:00Z",
  "signatureMethod": "ESIGN_OTP",
  "documentUrl": "https://files.nu-aura.example.com/...",
  "status": "SIGNED"
}
```

#### `contract.terminated`

```json
"data": {
  "contractId": "c-...",
  "terminationDate": "2026-12-31",
  "terminationReason": "END_OF_TERM",
  "status": "TERMINATED"
}
```

### 7.6 Fluence (wall + wiki) events

#### `wall.post.created`

```json
"data": {
  "postId": "wp-...",
  "authorId": "e-...",
  "title": "Welcome new joiners!",
  "contentSnippet": "Please welcome...",
  "audience": "TENANT",
  "createdAt": "2026-05-12T10:00:00Z"
}
```

#### `wall.post.reaction.added`

```json
"data": {
  "postId": "wp-...",
  "reactionId": "wr-...",
  "userId": "e-...",
  "reactionType": "LIKE",
  "createdAt": "2026-05-12T10:05:00Z"
}
```

#### `wiki.page.published`

```json
"data": {
  "pageId": "wk-...",
  "spaceId": "ws-...",
  "title": "Engineering Onboarding",
  "slug": "engineering-onboarding",
  "publishedBy": "e-...",
  "publishedAt": "2026-05-12T11:00:00Z",
  "version": 7
}
```

### 7.7 Recruitment events

#### `applicant.created`

```json
"data": {
  "applicantId": "ap-...",
  "jobOpeningId": "jo-...",
  "firstName": "Sam",
  "lastName": "Lee",
  "email": "sam.lee@example.com",
  "source": "CAREER_PAGE",
  "appliedAt": "2026-05-12T09:00:00Z",
  "stage": "APPLIED"
}
```

#### `applicant.status.changed`

```json
"data": {
  "applicantId": "ap-...",
  "previousStage": "APPLIED",
  "currentStage": "PHONE_SCREEN",
  "changedBy": "e-recruiter...",
  "changedAt": "2026-05-13T15:00:00Z",
  "comment": "Resume looks promising."
}
```

---

## 8. Custom Headers — Allowlist & Forbidden List

When registering a webhook, you may add custom headers (e.g. for downstream auth, tracing, source tagging). To prevent abuse, NU-AURA enforces a forbidden list — registration fails if any forbidden header is supplied.

### 8.1 Forbidden custom headers

These cannot be set via `customHeaders`:

- `Authorization`
- `Cookie`
- `Set-Cookie`
- `Host`
- `Content-Length`
- `Content-Type` (always `application/json`)
- `Transfer-Encoding`
- `Connection`
- `Upgrade`
- `X-Forwarded-For`
- `X-Forwarded-Host`
- `X-Forwarded-Proto`
- `X-Forwarded-Port`
- `X-Real-IP`
- Any header starting with `X-NU-` (reserved for NU-AURA-controlled metadata)

Why: forbidden headers either control transport semantics, fake provenance, or impersonate NU-AURA's own signature/event headers.

### 8.2 Allowed custom headers

Anything not on the forbidden list, up to:

- Max 20 custom headers per webhook
- Max header name length 64 chars; value 1024 chars
- ASCII printable only; no CR/LF

Typical legitimate uses:

- `X-Acme-Source: nu-aura` — tag the source for your gateway
- `X-Acme-Env: prod` — route by environment
- `X-Tenant-Id: acme` — flatten multi-tenant routing
- `Idempotency-Key: <static-or-templated>` — feed into your dedup logic (note: NU-AURA's envelope `id` is the recommended idempotency key)

### 8.3 NU-AURA-controlled headers (reserved)

Every delivery carries:

- `X-NU-Signature` — HMAC signature (section 4)
- `X-NU-Event` — event type, e.g. `employee.created`
- `X-NU-Delivery` — delivery UUID (matches envelope `id`)
- `X-NU-Webhook` — webhook subscription ID
- `X-NU-Tenant` — tenant ID
- `User-Agent` — `NU-AURA-Webhook/1.0`

You cannot override these.

---

## 9. Troubleshooting

| Symptom                                  | Likely cause                                          | Fix                                                          |
|------------------------------------------|-------------------------------------------------------|--------------------------------------------------------------|
| Signature always fails                   | Comparing parsed JSON instead of raw bytes            | Use raw request body in HMAC input                           |
| Signature fails intermittently           | Body parser middleware rewrites payload before HMAC  | Capture raw body before any JSON parsing                     |
| Replays not recognized as duplicates     | Idempotency keyed on payload contents, not envelope `id` | Use envelope `id` as the dedup key                        |
| Sporadic timeouts at 10s                  | Synchronous downstream call in handler                | Ack first, process async                                     |
| Webhook silently stops firing             | Circuit breaker opened                                 | Check `GET /api/v1/webhooks/{id}` — `breakerState: OPEN`     |
| Receiving events I didn't subscribe to    | Filter cached at edge for ~5min after update          | Wait or call `PATCH` again to bust cache                     |
| Missing `data` fields                     | Event fired before optional fields populated          | Ignore unknown/missing fields; rely on `version` semantics    |
| Timestamp drift > 5min                    | NTP not synced on receiver                            | Sync clock; tolerance is 5 minutes                           |

---

## 10. Related

- **External API guide**: `external-api-guide.md` — auth, rate limits, pagination, errors
- **Quick start**: `api-quick-start.md` — 5-minute getting-started including webhooks
- **Swagger UI**: `/api/v1/swagger-ui.html` — full endpoint schemas

---

**Last reviewed:** 2026-05-12
