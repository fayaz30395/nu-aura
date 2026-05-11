# NU-AURA External API Guide

**Audience:** Tenant administrators and integration developers building against NU-AURA's public API surface.
**Companion:** This guide complements the OpenAPI/Swagger UI hosted at `/api/v1/swagger-ui.html`. Use Swagger for endpoint-level schemas; use this guide for cross-cutting concerns (auth, rate limits, pagination, errors, versioning).

---

## 1. Overview

The NU-AURA external API surface lives under `/api/v1/external/**` and exposes integration-safe endpoints for tenant administrators to read and write data programmatically. It is distinct from internal UI endpoints, which are tightly coupled to the Next.js frontend and not stability-guaranteed.

**What you can do with the external API:**

- Read & write Employees, Departments, Designations, Locations
- Submit and approve Leave requests
- Submit and approve Expenses
- Create and read Payroll runs (admin scope)
- Manage Contracts (HR scope)
- Register and manage Webhooks
- Trigger and read Reports
- Search Wiki, Wall posts, Applicants (Hire scope)

**What is NOT in the external API:**

- Internal UI helpers (autocomplete, picker payloads, etc.)
- Multi-tenant orchestration endpoints
- Debug, health, and metrics endpoints (these live under `/actuator/**` and are restricted)

---

## 2. Authentication

NU-AURA supports two authentication mechanisms for the external API. Use whichever fits your integration model.

### 2.1 API Key (recommended for server-to-server)

Send your API key in the `X-API-Key` HTTP header on every request:

```http
GET /api/v1/external/employees HTTP/1.1
Host: api.nu-aura.example.com
X-API-Key: nuk_live_1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT
Accept: application/json
```

- API keys are scoped to a single tenant and a single permission set.
- API keys never expire by default, but they can be revoked or regenerated via the admin API.
- Keys are prefixed `nuk_live_` (live tenants) or `nuk_test_` (sandbox tenants).
- Treat keys as secrets — they grant the same access as the issuing user.

### 2.2 JWT cookie (browser / first-party clients)

For browser-based integrations or first-party clients, NU-AURA issues JWT cookies on `POST /api/v1/auth/login`. The cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, and carries roles only; permissions are loaded server-side from the DB + Redis cache on each request.

```http
POST /api/v1/auth/login HTTP/1.1
Content-Type: application/json

{"email": "admin@acme.com", "password": "..."}
```

Subsequent requests include the cookie automatically. JWTs expire after 24 hours; use the refresh-token endpoint to get a new one.

### 2.3 Combining both

If both `X-API-Key` and a JWT cookie are present, the API key takes precedence and the cookie is ignored. This lets you test integrations from a browser session without re-authenticating.

---

## 3. API Key Management

API keys are created and managed via the admin endpoints under `/api/v1/admin/api-keys`. You must hold the `apikey:manage` permission (granted by default to tenant admins).

### 3.1 Create a key

```http
POST /api/v1/admin/api-keys HTTP/1.1
X-API-Key: <existing-admin-key>
Content-Type: application/json

{
  "name": "Payroll Integration - Production",
  "scopes": ["employees:read", "payroll:read", "payroll:write"],
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

**Response:**

```json
{
  "id": "f3a1c2d4-...",
  "name": "Payroll Integration - Production",
  "key": "nuk_live_1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT",
  "scopes": ["employees:read", "payroll:read", "payroll:write"],
  "expiresAt": "2027-01-01T00:00:00Z",
  "createdAt": "2026-05-12T12:34:56Z"
}
```

> **The `key` field is shown only once.** Store it in your secret manager immediately. NU-AURA stores only a salted SHA-256 hash; we cannot recover lost keys.

### 3.2 Rotate / regenerate

```http
POST /api/v1/admin/api-keys/{id}/regenerate HTTP/1.1
```

Returns a new key value. The old key is invalidated within ~5 seconds across the cluster.

### 3.3 Revoke

```http
DELETE /api/v1/admin/api-keys/{id} HTTP/1.1
```

Returns `204 No Content`. The key is invalidated immediately; in-flight requests using the revoked key may receive `401 Unauthorized` mid-response.

### 3.4 List

```http
GET /api/v1/admin/api-keys HTTP/1.1
```

Returns an array of API key metadata (without the secret value).

---

## 4. Rate Limits

Rate limits are enforced per-tenant and per-bucket via Redis-backed distributed rate limiting (Bucket4j 8.7.0 with Lua scripts).

| Bucket                       | Limit            | Applies to                                                |
|------------------------------|------------------|-----------------------------------------------------------|
| **Auth**                     | 5 / minute       | `/api/v1/auth/login`, `/api/v1/auth/refresh`, password ops |
| **API (default)**            | 100 / minute     | All `/api/v1/external/**` reads & writes                  |
| **Exports / heavy reports**  | 5 / 5 minutes    | `/api/v1/external/reports/*/export`, bulk CSV/XLSX outputs |

### Response headers

Every response includes:

```http
X-RateLimit-Limit:     100
X-RateLimit-Remaining: 87
X-RateLimit-Reset:     1715518440
```

`X-RateLimit-Reset` is a Unix timestamp (seconds) indicating when the bucket refills.

### 429 Too Many Requests

When you exceed a bucket, the response is:

```json
{
  "timestamp": "2026-05-12T12:34:56Z",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded for bucket 'api'. Retry after 23 seconds.",
  "path": "/api/v1/external/employees",
  "retryAfterSeconds": 23
}
```

The `Retry-After` HTTP header is also set. Always respect it — repeatedly hammering a locked bucket can trigger account lockout (5 failures / 15 minutes via `AccountLockoutService`).

---

## 5. Pagination

All list endpoints use cursor-less offset/page pagination with Spring Data conventions.

### Query parameters

| Param  | Default       | Description                                              |
|--------|---------------|----------------------------------------------------------|
| `page` | `0`           | Zero-indexed page number                                 |
| `size` | `20`          | Page size; max `100`                                     |
| `sort` | `createdAt,desc` | Comma-separated `field,direction`. Multiple sort params allowed. |

### Example

```http
GET /api/v1/external/employees?page=2&size=50&sort=lastName,asc&sort=firstName,asc HTTP/1.1
```

### Response envelope

```json
{
  "content": [ { /* employee */ }, ... ],
  "page": {
    "number": 2,
    "size": 50,
    "totalElements": 1247,
    "totalPages": 25,
    "first": false,
    "last": false
  }
}
```

### Tips

- `totalElements` requires a `COUNT(*)` query — for hot endpoints, consider passing `?countQuery=false` (where supported) to skip it.
- Sort fields must be allow-listed per endpoint; passing an unsupported field returns `400 Bad Request`.

---

## 6. Search

Free-text search uses Elasticsearch 8.11 under the hood. List endpoints accept a `q` query parameter:

```http
GET /api/v1/external/employees?q=jane+doe&size=10 HTTP/1.1
```

Search behaviour:

- Multi-field fuzzy match on common fields (name, email, employee code, etc.)
- Stopwords removed; stemming applied (English only — multi-language search is on the roadmap)
- Results are scored and returned in relevance order regardless of `sort` (unless `sort=createdAt,desc` is explicit; sort always wins)
- Empty `q` is treated as no filter

For structured filtering (e.g. `?department=ENG&status=ACTIVE`), use field-specific query parameters, not `q`.

---

## 7. Error Response Shape

All error responses follow the canonical `ErrorResponse` envelope:

```json
{
  "timestamp": "2026-05-12T12:34:56Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Field 'email' must be a valid email address.",
  "path": "/api/v1/external/employees",
  "fieldErrors": [
    {
      "field": "email",
      "rejectedValue": "not-an-email",
      "message": "must be a valid email address"
    }
  ],
  "traceId": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
}
```

| Field          | Always present | Description                                         |
|----------------|----------------|-----------------------------------------------------|
| `timestamp`    | yes            | ISO-8601 UTC timestamp                              |
| `status`       | yes            | HTTP status code (mirrors response status line)     |
| `error`        | yes            | HTTP reason phrase                                  |
| `message`      | yes            | Human-readable summary; safe to surface to end users for 4xx |
| `path`         | yes            | Request path                                        |
| `fieldErrors`  | only on 400    | Array of per-field validation errors                |
| `traceId`      | yes            | W3C tracecontext trace ID; include in support tickets |

### Status code conventions

| Code  | Meaning                                                            |
|-------|--------------------------------------------------------------------|
| `200` | Success                                                            |
| `201` | Resource created (with `Location` header)                          |
| `204` | Success, no body                                                   |
| `400` | Validation error (see `fieldErrors`)                               |
| `401` | Missing or invalid auth                                            |
| `403` | Authenticated but not authorized (permission denied)               |
| `404` | Resource not found, or visible-but-access-denied (RBAC-shielded)   |
| `409` | Conflict (duplicate, optimistic-lock collision, state-machine bad transition) |
| `422` | Business-rule violation (semantically valid but operationally rejected) |
| `429` | Rate limit exceeded                                                |
| `500` | Internal server error — always opens an alert; report with `traceId` |
| `503` | Dependency unavailable (Redis, Kafka, ES) — retryable               |

> **Never parse `message` for control flow.** Use `status` + `error` + field-specific codes when available.

---

## 8. Idempotency

> **Status: TODO — not yet implemented as of API v1.**

The roadmap includes an `Idempotency-Key` header (RFC draft) on `POST`/`PATCH` endpoints. When shipped:

- Clients include `Idempotency-Key: <uuid>` on retryable writes
- The server stores `(tenant, idempotency_key) → response` for 24 hours in Redis
- Retries with the same key replay the original response without re-executing
- Until then, treat all writes as **not** idempotent — implement client-side deduplication for critical paths.

Kafka producer paths already use `IdempotencyService` internally (atomic SETNX, 24hr TTL) for event dedup; this is invisible to HTTP callers.

---

## 9. CORS

CORS is configured per-tenant. Each tenant has an allow-list of origins maintained at `/api/v1/admin/tenant/cors-origins`.

- The default origin for SaaS tenants is `https://{tenant-slug}.nu-aura.example.com`.
- Custom domains require platform admin approval.
- Preflight requests (`OPTIONS`) are cached at the browser per the `Access-Control-Max-Age: 3600` response header.
- `Access-Control-Allow-Credentials: true` is sent on authenticated requests, so wildcard (`*`) origins are never used.

For server-to-server integrations, CORS is irrelevant — browsers enforce it, not curl.

---

## 10. Versioning & Migration

NU-AURA follows URL-path versioning: `/api/v1/...`, `/api/v2/...`.

### Current state

- `v1` is the active, stable version. All endpoints documented here are v1.
- `v2` is not yet published. When it lands, both `v1` and `v2` will run side-by-side for a minimum of 12 months.

### Backward compatibility promise (within a version)

We will **not** within `v1`:

- Remove a field from a response
- Rename a field
- Tighten a field's type or validation
- Remove a query parameter
- Change a status code for an existing scenario

We **may**:

- Add new endpoints
- Add new optional fields to responses
- Add new optional query parameters
- Loosen validation
- Add new status codes for new scenarios (e.g. a new 422 sub-code)

Clients MUST tolerate unknown fields gracefully (parse with strict-mode off, or whitelist known fields).

### Deprecation flow

When an endpoint or field is slated for removal in `v2`:

1. The response includes `Deprecation: <date>` and `Sunset: <date>` headers per RFC 8594 / draft-ietf-httpapi-deprecation-header.
2. A `Link: <docs-url>; rel="deprecation"` header points to migration notes.
3. Server logs emit a warning per call (visible in your audit log).
4. Email notification sent to the tenant's billing contact 90 days before removal.

---

## 11. Examples

All examples assume:

- Base URL: `https://api.nu-aura.example.com`
- API key: `nuk_live_xxx` (export as `$NU_API_KEY`)

### 11.1 List employees

```bash
curl -s "https://api.nu-aura.example.com/api/v1/external/employees?page=0&size=10&sort=lastName,asc" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Accept: application/json" | jq .
```

### 11.2 Get a single employee

```bash
curl -s "https://api.nu-aura.example.com/api/v1/external/employees/f3a1c2d4-..." \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Accept: application/json" | jq .
```

### 11.3 Create an employee

```bash
curl -s -X POST "https://api.nu-aura.example.com/api/v1/external/employees" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane.doe@acme.com",
    "departmentId": "d1...",
    "designationId": "g2...",
    "joiningDate": "2026-06-01"
  }' | jq .
```

### 11.4 Register a webhook

```bash
curl -s -X POST "https://api.nu-aura.example.com/api/v1/webhooks" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://hooks.acme.com/nu-aura",
    "events": ["employee.created", "leave.requested"],
    "secret": "whsec_replace_with_strong_random_32+_bytes",
    "customHeaders": { "X-Acme-Source": "nu-aura" }
  }' | jq .
```

(See `webhook-payload-reference.md` for the full webhook contract.)

### 11.5 Submit a leave request

```bash
curl -s -X POST "https://api.nu-aura.example.com/api/v1/external/leave-requests" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "f3a1c2d4-...",
    "leaveTypeId": "lt-annual",
    "fromDate": "2026-06-10",
    "toDate": "2026-06-12",
    "reason": "Family trip"
  }' | jq .
```

### 11.6 Trigger a payroll report export

```bash
curl -s -X POST "https://api.nu-aura.example.com/api/v1/external/reports/payroll/export" \
  -H "X-API-Key: $NU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "fromDate": "2026-04-01",
    "toDate": "2026-04-30",
    "format": "XLSX"
  }' | jq .
```

Exports are async. The response includes a `jobId`; poll `GET /api/v1/external/jobs/{jobId}` until `status: "COMPLETED"`, then download from the included `resultUrl` (signed, expires in 1 hour).

---

## 12. Support & Next Steps

- **Swagger UI**: `/api/v1/swagger-ui.html` for endpoint-level schemas
- **OpenAPI JSON**: `/api/v1/v3/api-docs`
- **Quick start**: see `api-quick-start.md`
- **Webhooks**: see `webhook-payload-reference.md`
- **Status page**: `https://status.nu-aura.example.com`
- **Support**: include the `traceId` from the failing response when filing tickets.

---

**Last reviewed:** 2026-05-12
