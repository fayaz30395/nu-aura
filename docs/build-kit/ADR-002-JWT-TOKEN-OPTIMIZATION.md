# ADR-002: JWT Token Size Optimization

**Status:** Proposed
**Date:** 2026-03-11
**Decision Makers:** Security & Backend Architecture Team
**Priority:** High (Performance Impact)

---

## Context

The current JWT implementation stores extensive data in the token payload:

### Current JWT Payload Analysis

From `JwtTokenProvider.java` (line 66-96):

```java
return Jwts.builder()
    .id(generateJti())
    .subject(user.getEmail())
    .claim("userId", user.getId().toString())
    .claim("tenantId", tenantId.toString())
    .claim("appCode", appCode)
    .claim("roles", new ArrayList<>(roles))                        // Array of role names
    .claim("permissions", new ArrayList<>(permissions.keySet()))   // Array of permission strings
    .claim("permissionScopes", permissions.entrySet().stream()     // Map of permission → scope
            .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().name())))
    .claim("accessibleApps", new ArrayList<>(accessibleApps))      // Array of app codes
    .claim("employeeId", employeeId != null ? employeeId.toString() : null)
    .claim("locationId", locationId != null ? locationId.toString() : null)
    .claim("departmentId", departmentId != null ? departmentId.toString() : null)
    .claim("teamId", teamId != null ? teamId.toString() : null)
    .issuedAt(now)
    .expiration(expiryDate)
    .signWith(getSigningKey())
    .compact();
```

### Token Size Calculation

**Scenario: Average HRMS User with Multiple Permissions**

Base claims (~150 bytes):
- `jti`: UUID (36 chars)
- `sub`: email (avg 25 chars)
- `userId`: UUID (36 chars)
- `tenantId`: UUID (36 chars)
- `appCode`: "HRMS" (4 chars)
- `iat`, `exp`: timestamps (10 chars each)

**Permission Claims (Variable, can be massive):**

Example user with 50+ permissions:
```json
{
  "roles": ["ROLE_MANAGER", "ROLE_RECRUITER"],
  "permissions": [
    "employee.view_all",
    "employee.create",
    "employee.update",
    "employee.delete",
    "leave.view_team",
    "leave.approve",
    "recruitment.view_all",
    "recruitment.create",
    "recruitment.update",
    "candidate.view_all",
    "candidate.create",
    "interview.schedule",
    "payroll.view_team",
    "attendance.view_team",
    "performance.view_all",
    "training.assign",
    /* ... 35 more permissions ... */
  ],
  "permissionScopes": {
    "employee.view_all": "ALL",
    "employee.create": "DEPARTMENT",
    "employee.update": "DEPARTMENT",
    "leave.view_team": "TEAM",
    "leave.approve": "TEAM",
    /* ... 45 more scope mappings ... */
  },
  "accessibleApps": ["HRMS", "PSA", "LMS", "HELPDESK"],
  "employeeId": "uuid",
  "locationId": "uuid",
  "departmentId": "uuid",
  "teamId": "uuid"
}
```

**Estimated Token Sizes:**

| User Type | Permissions Count | Estimated JWT Size | Base64 Encoded Size |
|-----------|-------------------|--------------------|--------------------|
| Employee (Self-Service) | 10 | ~800 bytes | ~1.1 KB |
| Manager | 30 | ~2,200 bytes | ~3 KB |
| HR Admin | 80 | ~5,500 bytes | ~7.3 KB |
| Super Admin | 150+ | ~10,000 bytes | ~13.3 KB |

### Network Overhead Impact

**API Request Breakdown:**

1. **Authorization Header**: `Bearer <JWT_TOKEN>`
2. **Per Request Overhead**: ~13.5 KB (for Super Admin)
3. **100 API Requests/Session**: 1.35 MB transferred just for auth headers
4. **1000 Concurrent Users**: 13.5 GB memory in transit per request cycle

**HTTP/2 Header Compression:**
- HPACK compresses headers, but large JWTs still problematic
- First request: Full token size
- Subsequent requests: ~30% reduction (still 9.3 KB for Super Admin)

### Current Problems

1. **Large Token Size**: Up to 13 KB for admin users
2. **Network Bandwidth Waste**: Every API call sends full permission list
3. **Parsing Overhead**: JWT parsing on every request is CPU-intensive
4. **Cookie Storage Limit**: Browsers limit cookies to 4KB (can't use httpOnly cookies)
5. **Mobile Performance**: Large headers impact mobile data consumption
6. **CDN/Load Balancer Limits**: Some CDNs have header size limits (8-16 KB)

---

## Decision

Implement **Hybrid Token Approach**: Minimal JWT + Redis Permission Cache

### Architecture Design

**1. Minimal JWT Payload**

Store only essential, immutable claims:

```java
// New: generateLightweightToken()
public String generateLightweightToken(User user, UUID tenantId, String appCode,
                                        Set<String> roles, UUID employeeId) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + jwtExpiration);

    return Jwts.builder()
            .id(generateJti())                              // JTI for revocation
            .subject(user.getEmail())                       // User identifier
            .claim("userId", user.getId().toString())       // User UUID
            .claim("tenantId", tenantId.toString())         // Tenant isolation
            .claim("appCode", appCode)                      // Current application
            .claim("roles", new ArrayList<>(roles))         // Core roles only
            .claim("employeeId", employeeId != null ? employeeId.toString() : null)
            .claim("sessionId", generateSessionId())        // Session identifier
            .issuedAt(now)
            .expiration(expiryDate)
            .signWith(getSigningKey())
            .compact();
}
```

**Reduced Token Size:**
- Employee: ~350 bytes (~470 bytes base64) - **60% reduction**
- Manager: ~380 bytes (~507 bytes base64) - **84% reduction**
- Super Admin: ~420 bytes (~560 bytes base64) - **96% reduction**

**2. Redis Permission Cache**

Create new service: `PermissionCacheService.java`

```java
@Service
@RequiredArgsConstructor
public class PermissionCacheService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String PERMISSION_CACHE_PREFIX = "user:permissions:";
    private static final long CACHE_TTL = 3600; // 1 hour (matches JWT expiration)

    /**
     * Cache user permissions in Redis with same TTL as JWT
     */
    public void cacheUserPermissions(String sessionId, UUID userId,
                                      Map<String, RoleScope> permissions,
                                      Set<String> accessibleApps,
                                      UserContext context) {
        String key = PERMISSION_CACHE_PREFIX + sessionId;

        PermissionCache cache = PermissionCache.builder()
                .userId(userId.toString())
                .permissions(permissions)
                .permissionScopes(permissions.entrySet().stream()
                        .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().name())))
                .accessibleApps(accessibleApps)
                .locationId(context.getLocationId() != null ? context.getLocationId().toString() : null)
                .departmentId(context.getDepartmentId() != null ? context.getDepartmentId().toString() : null)
                .teamId(context.getTeamId() != null ? context.getTeamId().toString() : null)
                .cachedAt(Instant.now())
                .build();

        redisTemplate.opsForValue().set(key, cache, CACHE_TTL, TimeUnit.SECONDS);
    }

    /**
     * Retrieve cached permissions by session ID
     */
    public Optional<PermissionCache> getCachedPermissions(String sessionId) {
        String key = PERMISSION_CACHE_PREFIX + sessionId;
        PermissionCache cache = (PermissionCache) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(cache);
    }

    /**
     * Invalidate user permissions on role/permission change
     */
    public void invalidateUserPermissions(UUID userId) {
        String pattern = PERMISSION_CACHE_PREFIX + "*";
        Set<String> keys = redisTemplate.keys(pattern);

        if (keys != null) {
            for (String key : keys) {
                PermissionCache cache = (PermissionCache) redisTemplate.opsForValue().get(key);
                if (cache != null && userId.toString().equals(cache.getUserId())) {
                    redisTemplate.delete(key);
                }
            }
        }
    }

    /**
     * Invalidate all sessions for a tenant (used when tenant-level permission changes)
     */
    public void invalidateTenantPermissions(UUID tenantId) {
        // Implementation: iterate and check tenant context, delete matching keys
    }
}

@Data
@Builder
class PermissionCache implements Serializable {
    private String userId;
    private Map<String, RoleScope> permissions;
    private Map<String, String> permissionScopes;
    private Set<String> accessibleApps;
    private String locationId;
    private String departmentId;
    private String teamId;
    private Instant cachedAt;
}
```

**3. Updated JWT Authentication Filter**

Modify `JwtAuthenticationFilter.java`:

```java
@Override
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                  FilterChain filterChain) throws ServletException, IOException {
    try {
        String jwt = getJwtFromRequest(request);

        if (StringUtils.hasText(jwt) && jwtTokenProvider.validateToken(jwt)) {
            String username = jwtTokenProvider.getUsernameFromToken(jwt);
            String sessionId = jwtTokenProvider.getSessionIdFromToken(jwt);
            UUID userId = jwtTokenProvider.getUserIdFromToken(jwt);
            UUID tenantId = jwtTokenProvider.getTenantIdFromToken(jwt);

            // Set tenant context
            TenantContext.setCurrentTenant(tenantId);

            // Load user details
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(username);

            // **NEW: Load permissions from Redis cache**
            Optional<PermissionCache> cachedPermissions = permissionCacheService.getCachedPermissions(sessionId);

            if (cachedPermissions.isEmpty()) {
                // Cache miss - reload permissions and cache them
                Map<String, RoleScope> permissions = userPermissionService.getUserPermissions(userId);
                Set<String> accessibleApps = userPermissionService.getAccessibleApps(userId);
                UserContext context = userPermissionService.getUserContext(userId);

                permissionCacheService.cacheUserPermissions(sessionId, userId,
                                                            permissions, accessibleApps, context);

                cachedPermissions = Optional.of(PermissionCache.builder()
                        .permissions(permissions)
                        .accessibleApps(accessibleApps)
                        /* ... set context ... */
                        .build());
            }

            // Build authentication with cached permissions
            PermissionCache cache = cachedPermissions.get();
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null,
                                                            buildAuthorities(cache));

            // Set security context with permissions
            SecurityContext.setAuthentication(authentication);
            SecurityContext.setPermissions(cache.getPermissions());
            SecurityContext.setPermissionScopes(cache.getPermissionScopes());

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }
    } catch (Exception ex) {
        logger.error("Could not set user authentication in security context", ex);
    }

    filterChain.doFilter(request, response);
}
```

**4. Permission Invalidation Strategy**

Invalidate cached permissions when:

```java
@Service
public class RoleManagementService {

    @Autowired
    private PermissionCacheService permissionCacheService;

    @Transactional
    public void updateUserRoles(UUID userId, Set<String> roleIds) {
        // Update roles in database
        userRoleRepository.deleteByUserId(userId);
        roleIds.forEach(roleId -> {
            userRoleRepository.save(new UserRole(userId, UUID.fromString(roleId)));
        });

        // **INVALIDATE PERMISSION CACHE**
        permissionCacheService.invalidateUserPermissions(userId);

        // Audit log
        auditLogService.logAction("USER", userId, AuditAction.UPDATE,
                                   "Roles updated - cache invalidated");
    }

    @Transactional
    public void updateRolePermissions(UUID roleId, Set<String> permissionIds) {
        // Update role permissions
        rolePermissionRepository.deleteByRoleId(roleId);
        permissionIds.forEach(permId -> {
            rolePermissionRepository.save(new RolePermission(roleId, UUID.fromString(permId)));
        });

        // **INVALIDATE ALL USERS WITH THIS ROLE**
        Set<UUID> affectedUsers = userRoleRepository.findUserIdsByRoleId(roleId);
        affectedUsers.forEach(permissionCacheService::invalidateUserPermissions);

        auditLogService.logAction("ROLE", roleId, AuditAction.UPDATE,
                                   "Permissions updated - " + affectedUsers.size() + " users cache invalidated");
    }
}
```

---

## Comparison: Before vs. After

### Token Size Comparison

| Metric | Current (Full Payload) | Optimized (Minimal + Redis) |
|--------|------------------------|------------------------------|
| Employee JWT | ~1.1 KB | ~470 bytes (57% smaller) |
| Manager JWT | ~3 KB | ~507 bytes (83% smaller) |
| HR Admin JWT | ~7.3 KB | ~540 bytes (93% smaller) |
| Super Admin JWT | ~13.3 KB | ~560 bytes (96% smaller) |
| **Network Transfer (100 req)** | **1.35 MB** | **56 KB** (96% reduction) |
| **CDN Header Limit Risk** | **High** | **None** |

### Performance Impact

| Operation | Current | Optimized | Improvement |
|-----------|---------|-----------|-------------|
| JWT Parsing | 2-5 ms | 0.5-1 ms | 75% faster |
| Permission Lookup | Inline (JWT) | Redis GET: 1-2 ms | Negligible |
| First Request (cache miss) | N/A | +5 ms (DB lookup + cache) | Acceptable |
| Subsequent Requests | 0 ms | 1 ms (Redis) | Negligible |
| **Total per request** | **2-5 ms** | **1.5-3 ms** | **~40% faster** |

### Redis Memory Footprint

**Per-user cache size:**
- Manager (30 permissions): ~2 KB in Redis
- 1000 concurrent users: ~2 MB Redis memory
- **Acceptable overhead for massive token reduction**

---

## Implementation Plan

### Phase 1: Foundation (Day 1, 4 hours)
- [ ] Create `PermissionCacheService.java`
- [ ] Create `PermissionCache` DTO
- [ ] Add Redis serialization configuration
- [ ] Write unit tests for cache service

### Phase 2: JWT Provider Update (Day 2, 6 hours)
- [ ] Add `generateLightweightToken()` method
- [ ] Add `getSessionIdFromToken()` extractor
- [ ] Update `AuthService` to use lightweight tokens
- [ ] Maintain backward compatibility (support both token types during migration)

### Phase 3: Filter Integration (Day 3, 8 hours)
- [ ] Update `JwtAuthenticationFilter` to use cache
- [ ] Implement cache-miss fallback logic
- [ ] Add cache warming on login
- [ ] Test authentication flow end-to-end

### Phase 4: Invalidation Hooks (Day 4, 6 hours)
- [ ] Add cache invalidation to `RoleManagementService`
- [ ] Add cache invalidation to `PermissionManagementService`
- [ ] Add cache invalidation to `UserService` (password change, logout)
- [ ] Create admin endpoint to manually clear cache if needed

### Phase 5: Migration & Rollout (Day 5, 4 hours)
- [ ] Deploy to staging environment
- [ ] Load test with 1000 concurrent users
- [ ] Monitor Redis memory usage
- [ ] Feature flag: enable for 10% of users, then 50%, then 100%

---

## Benefits

1. **96% Token Size Reduction** for admin users (13 KB → 560 bytes)
2. **Network Savings**: 1.35 MB → 56 KB per 100 API requests
3. **CDN Compatibility**: All tokens under 1 KB (well below 8 KB limits)
4. **Mobile Performance**: Reduced data consumption on cellular networks
5. **Cookie-Based Auth Option**: Tokens now fit in httpOnly cookies (< 4 KB)
6. **Faster Parsing**: Smaller JWTs = faster base64 decode + JSON parse
7. **Real-Time Permission Updates**: Cache invalidation allows immediate permission revocation

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Redis Downtime | High | Fallback to DB lookup if cache unavailable; Monitor Redis health |
| Cache Invalidation Lag | Medium | Invalidation is synchronous; TTL ensures max 1-hour stale data |
| Memory Overhead | Low | 2 MB per 1000 users is negligible; Set Redis max memory policy |
| Session ID Guessing | Medium | Use cryptographically secure random UUIDs; Same security as JTI |

---

## Alternatives Considered

### Alternative 1: Keep Large JWT, Use HTTP/2 HPACK

**Pros:**
- No architecture change
- HPACK provides ~30% compression

**Cons:**
- Still 9 KB per token for admins
- Doesn't solve cookie storage issue
- Doesn't reduce parsing overhead

**Verdict:** Not sufficient

### Alternative 2: Use Opaque Tokens (Session-Based)

**Pros:**
- Smallest token size (random string)
- Full control over session management

**Cons:**
- Loses JWT benefits (stateless, no DB lookup per request)
- Requires distributed session storage
- Breaks existing JWT-based integrations

**Verdict:** Too disruptive

### Alternative 3: Token Refresh with Shorter TTL

**Pros:**
- Smaller token if fewer permissions cached
- Frequent rotation improves security

**Cons:**
- Doesn't reduce token size, just lifetime
- More token refresh requests = more load

**Verdict:** Doesn't solve the problem

---

## Monitoring & Metrics

**Key Metrics to Track:**

1. **Token Size Distribution**
   - p50, p95, p99 token sizes
   - Target: p99 < 1 KB

2. **Redis Cache Performance**
   - Hit rate (target: > 95%)
   - Miss rate (should decrease after cache warming)
   - Average GET latency (target: < 2 ms)

3. **Authentication Latency**
   - Before: p95 @ 5 ms
   - After: p95 @ 3 ms (target: 40% reduction)

4. **Network Transfer**
   - Total bytes transferred in Authorization headers
   - Before: 13 KB * requests
   - After: 560 bytes * requests

5. **Redis Memory Usage**
   - Monitor memory growth
   - Alert if > 100 MB (unexpected)

**Grafana Dashboard Queries:**

```promql
# JWT token size distribution
histogram_quantile(0.99, rate(jwt_token_size_bytes_bucket[5m]))

# Redis cache hit rate
rate(redis_cache_hits_total[5m]) / (rate(redis_cache_hits_total[5m]) + rate(redis_cache_misses_total[5m]))

# Authentication filter latency
histogram_quantile(0.95, rate(http_filter_duration_seconds_bucket{filter="JwtAuthenticationFilter"}[5m]))
```

---

## Decision

**Approved for Implementation**: Hybrid Minimal JWT + Redis Permission Cache

**Responsible Team**: Backend Security & Performance Team
**Implementation Start**: Week 2
**Review Date**: After Phase 5 (staging load test results)
**Feature Flag**: `feature.jwt_optimization.enabled` (gradual rollout)

---

## References

- [JWT Best Practices - RFC 8725](https://datatracker.ietf.org/doc/html/rfc8725)
- [Redis as a Session Store](https://redis.io/docs/manual/patterns/session-store/)
- [HTTP/2 Header Compression](https://tools.ietf.org/html/rfc7541)
- [Spring Security Authentication Architecture](https://docs.spring.io/spring-security/reference/servlet/authentication/architecture.html)
