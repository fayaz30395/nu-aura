# ADR-002: JWT-based Authentication with HTTP-only Cookies

## Status
Accepted

## Context
The HRMS platform needs secure authentication supporting:
- Traditional email/password login
- Google SSO integration
- Mobile app compatibility (future)
- Session management with refresh tokens

### Options Considered

1. **Session-based Authentication** - Server-side sessions with cookies
2. **JWT in LocalStorage** - Stateless JWT stored in browser
3. **JWT in HTTP-only Cookies** - Stateless JWT with secure cookie storage

## Decision
We chose **Option 3: JWT in HTTP-only Cookies** with refresh token rotation.

## Rationale

### Security Benefits
- **XSS Protection**: HTTP-only cookies cannot be accessed by JavaScript
- **CSRF Protection**: Implemented with SameSite cookie attribute + CSRF tokens
- **Token Theft Mitigation**: Refresh token rotation invalidates stolen tokens

### Architecture Benefits
- **Stateless Backend**: No server-side session storage required
- **Horizontal Scaling**: Any server can validate tokens
- **Multi-tenant**: Tenant ID embedded in JWT claims

### Trade-offs
- **Token Size**: JWT cookies larger than session IDs
- **Revocation Complexity**: Requires token blacklist for immediate revocation
- **Clock Skew**: Token expiry requires synchronized clocks

## Implementation

### Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@company.com",
  "tenantId": "tenant-uuid",
  "roles": ["EMPLOYEE", "MANAGER"],
  "iat": 1704978600,
  "exp": 1704982200
}
```

### Token Lifetimes
| Token Type | Lifetime | Storage |
|------------|----------|---------|
| Access Token | 1 hour | HTTP-only cookie |
| Refresh Token | 24 hours | HTTP-only cookie |

### Cookie Configuration
```java
ResponseCookie.from("access_token", jwt)
    .httpOnly(true)
    .secure(true)  // HTTPS only in production
    .sameSite("Strict")
    .path("/")
    .maxAge(Duration.ofHours(1))
    .build();
```

### Refresh Flow
1. Client sends request with expired access token
2. Server returns 401 with `X-Token-Expired: true` header
3. Client calls `/auth/refresh` with refresh token cookie
4. Server issues new access token + rotates refresh token
5. Client retries original request

### Google SSO Integration
```
1. Frontend redirects to Google OAuth
2. User authenticates with Google
3. Frontend receives Google ID token
4. Frontend sends ID token to /auth/google
5. Backend validates with Google
6. Backend issues JWT cookies
```

## Security Considerations

### Implemented
- [x] HTTP-only cookies prevent XSS token theft
- [x] Secure flag enforces HTTPS
- [x] SameSite=Strict prevents CSRF
- [x] Token rotation on refresh
- [x] Short access token lifetime

### Future Enhancements
- [ ] Token blacklist for logout/revocation
- [ ] Device fingerprinting
- [ ] Anomaly detection for unusual login patterns

## Consequences

### Positive
- Industry-standard security practices
- Scalable stateless architecture
- Clean separation of auth concerns

### Negative
- Slightly more complex than session-based auth
- Requires HTTPS in production
- Cookie size increases with claims

## Related Decisions
- ADR-001: Multi-Tenant Architecture
- ADR-005: Rate Limiting Strategy
