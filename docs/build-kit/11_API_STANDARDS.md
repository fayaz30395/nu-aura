# REST API Standards

The HRMS platform exposes a unified RESTful API surface to external clients, internal frontends, and mobile apps via an API Gateway. All microservices must adhere strictly to these conventions to guarantee a predictable developer experience.

## 1. Base URL & Versioning
All APIs are versioned in the URI. Major breaking changes increment the version number.
Format: `https://api.hrms.example.com/{service}/v{major_version}/{resource}`
Example: `https://api.hrms.example.com/employee/v1/employees`

## 2. Resource Naming (Nouns, Not Verbs)
Endpoints must represent Domain Entities as plural nouns.
- **Good:** `GET /employees`, `POST /leaves`
- **Bad:** `GET /getAllEmployees`, `POST /createLeave`

### Sub-Resources
For hierarchical data, use nested routes, but do not exceed two levels of nesting.
- `GET /employees/{id}/bank-details`
- `POST /departments/{id}/locations`

## 3. Standard HTTP Methods
- `GET`: Retrieve a single resource or a list of resources. (Idempotent, Cacheable)
- `POST`: Create a new resource, or execute a complex domain action (e.g., `POST /payroll-cycles/{id}/run`).
- `PUT`: Fully replace an existing resource. (Idempotent)
- `PATCH`: Partially update an existing resource.
- `DELETE`: Remove a resource (Often implements Soft Delete by toggling an `is_deleted` flag).

## 4. Query Parameters: Filtering, Sorting, Pagination
List endpoints (`GET /resources`) must support standardized query parameters.

### Pagination (Cursor-based or Offset-based)
- `?page=0&size=20` (Offset-based)
- Response must wrap data in a `Page<T>` object detailing `totalElements`, `totalPages`, `hasNext`.

### Filtering
Support exact match, IN clauses, and inequalities via standard operators.
- `?departmentId=123` (Exact match)
- `?status=ACTIVE,SUSPENDED` (IN clause)
- `?joinDate[gte]=2024-01-01` (Greater than or equal)

### Sorting
Comma-separated list of fields with optional `-` prefix for descending order.
- `?sort=lastName,-joinDate` (Sort by lastName ASC, then joinDate DESC)

## 5. Standard Envelope & Error Handling

To provide uniform frontend parsing, all operational responses return standard HTTP status codes.
Payloads are *not* wrapped in `{ "data": ... }` envelopes unless paginating.

### Success Codes
- `200 OK`: Successful GET or PUT/PATCH.
- `201 Created`: Successful POST.
- `204 No Content`: Successful DELETE.

### Error Standards (RFC 7807 Problem Details)
All errors return a standard JSON structure.
```json
{
  "timestamp": "2024-03-10T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation Failed",
  "path": "/api/v1/employees",
  "details": [
    { "field": "email", "issue": "Must be a valid email format" }
  ]
}
```
- `400 Bad Request`: Client input validation failure.
- `401 Unauthorized`: Missing or invalid JWT token.
- `403 Forbidden`: Authenticated, but lacks required RBAC permission (e.g., lacks `employee.delete`).
- `404 Not Found`: Resource ID does not exist.
- `409 Conflict`: Business rule violation (e.g., "Cannot delete Department with active employees").
- `500 Internal Server Error`: Unhandled backend exception.

## 6. Authentication Context Propagation
- The API Gateway validates the JWT token originating from the `Authorization: Bearer <token>` header.
- Upon validation, the Gateway extracts claims (e.g., `user_id`, `tenant_id`, `roles`) and injects them as downstream HTTP headers (e.g., `X-User-Id`, `X-Tenant-Id`) to the internal microservices.
- Microservices trust these internal headers (enforced via network policies) and populate the local ThreadLocal SecurityContext for immediate access during request processing.
