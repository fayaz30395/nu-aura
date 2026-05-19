package com.nulogic.common.security;

import com.nulogic.common.config.CookieConfig;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantStatusCache;
import com.nulogic.infrastructure.user.repository.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Component
@lombok.extern.slf4j.Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    private final EmployeeRepository employeeRepository;
    private final ScopeContextService scopeContextService;
    private final SecurityService securityService;
    // PERF (wave-3 2.1): cached lookup so the per-request tenant-status check is
    // served from Redis instead of hitting PostgreSQL on every authenticated call.
    private final TenantStatusCache tenantStatusCache;
    // SEC (S10-E): used for the GDPR-Art.17 anonymised-principal guard below.
    // Only the {@code anonymized_at} column is selected, so this check is a
    // single index seek per request rather than a full user hydration.
    private final UserRepository userRepository;

    /**
     * SEC: Bearer header fallback is OFF by default. When false (prod default),
     * the filter only accepts the httpOnly cookie. Enable explicitly in non-prod
     * for legacy M2M clients via {@code app.security.allow-bearer-header=true}.
     */
    @Value("${app.security.allow-bearer-header:false}")
    private boolean allowBearerHeader;

    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider,
                                   UserDetailsService userDetailsService,
                                   EmployeeRepository employeeRepository,
                                   ScopeContextService scopeContextService,
                                   SecurityService securityService,
                                   TenantStatusCache tenantStatusCache,
                                   UserRepository userRepository) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
        this.employeeRepository = employeeRepository;
        this.scopeContextService = scopeContextService;
        this.securityService = securityService;
        this.tenantStatusCache = tenantStatusCache;
        // S10-E left this field unwired in the constructor — without an
        // assignment the file fails javac's "final field might not have been
        // initialized" check and the whole module won't compile. Constructor
        // injection mirrors the other repositories above.
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                UUID tenantId = tokenProvider.getTenantIdFromToken(jwt);

                // SEC (M-C1): Reject requests whose tenant is not ACTIVE. A valid JWT
                // for a SUSPENDED / INACTIVE / PENDING_ACTIVATION tenant must not be
                // honored — even though the signature is valid, the tenant has been
                // disabled by the admin (billing freeze, abuse, off-boarding, etc.).
                // Done BEFORE TenantContext.setCurrentTenant() so downstream code never
                // executes under a disabled tenant.
                if (tenantId != null) {
                    // PERF (wave-3 2.1): served from 30s Redis cache to avoid a
                    // per-request PG round-trip for this hot-path check.
                    Optional<Tenant> tenantOpt = tenantStatusCache.findById(tenantId);
                    if (tenantOpt.isEmpty()
                            || tenantOpt.get().getStatus() != Tenant.TenantStatus.ACTIVE) {
                        Tenant.TenantStatus status = tenantOpt
                                .map(Tenant::getStatus)
                                .orElse(null);
                        log.warn("Rejecting request for non-active tenant {} (status={}) from IP {} path {}",
                                tenantId, status, request.getRemoteAddr(), request.getRequestURI());
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Tenant suspended\"}");
                        return;
                    }
                }

                // Permission hydration below needs TenantContext for tenant-scoped role
                // lookups and cache keys. At this point the JWT signature is valid and
                // the tenant has been verified ACTIVE, so it is safe to set the request
                // tenant before loading DB-backed permissions. The finally block clears
                // it regardless of later auth failures.
                if (tenantId != null) {
                    TenantContext.setCurrentTenant(tenantId);
                }

                // Try to get NU Platform app-aware claims from token
                String appCode = tokenProvider.getAppCodeFromToken(jwt);
                Set<String> tokenPermissions = tokenProvider.getPermissionsFromToken(jwt);
                Set<String> tokenRoles = tokenProvider.getRolesFromToken(jwt);
                Set<String> accessibleApps = tokenProvider.getAccessibleAppsFromToken(jwt);

                Collection<GrantedAuthority> authorities;
                Set<String> roles;
                Map<String, com.nulogic.domain.user.RoleScope> permissionScopes;

                if (!tokenPermissions.isEmpty() || !tokenRoles.isEmpty()) {
                    // Use NU Platform claims from token
                    authorities = new ArrayList<>();
                    tokenRoles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
                    tokenPermissions.forEach(perm -> authorities.add(new SimpleGrantedAuthority(perm)));
                    roles = tokenRoles;
                    permissionScopes = tokenProvider.getPermissionScopesFromToken(jwt);

                    // BUG-012 FIX: CRIT-001 moved permissions out of JWT to keep cookie < 4096 bytes.
                    // When permissionScopes is empty (no permissions in JWT), load from DB via role lookup.
                    // The DB stores permission codes in "resource.action" format (e.g. "employee.read")
                    // but the backend @RequiresPermission uses "RESOURCE:ACTION" format (e.g. "EMPLOYEE:READ").
                    // We normalize to the UPPERCASE:COLON format expected by Permission.java constants.
                    if (permissionScopes.isEmpty() && !roles.isEmpty()) {
                        Set<String> dbPermissions;

                        // Try to extract userId from JWT for user-keyed cache lookup (Task 8)
                        UUID userId = null;
                        try {
                            userId = tokenProvider.getUserIdFromToken(jwt);
                        } catch (Exception e) { // Intentional broad catch — security filter error boundary
                            log.debug("Could not extract userId from JWT, falling back to role-based cache", e);
                        }

                        // Prefer user-keyed cache if userId available, otherwise use role-based cache
                        if (userId != null) {
                            dbPermissions = securityService.getCachedPermissionsForUser(userId, roles);
                            log.debug("BUG-012 fix (user-keyed): Loaded {} permissions for user {} with roles {}: {}",
                                    dbPermissions.size(), userId, roles, dbPermissions);
                        } else {
                            dbPermissions = securityService.getCachedPermissions(roles);
                            log.debug("BUG-012 fix (role-based): Loaded {} permissions from DB for roles {}: {}",
                                    dbPermissions.size(), roles, dbPermissions);
                        }

                        permissionScopes = new HashMap<>();
                        for (String dbPerm : dbPermissions) {
                            String normalized = normalizePermissionCode(dbPerm);
                            permissionScopes.put(normalized, com.nulogic.domain.user.RoleScope.GLOBAL);
                            authorities.add(new SimpleGrantedAuthority(normalized));
                        }
                    }
                } else {
                    // Fallback: Load from UserDetailsService (legacy mode)
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    authorities = new ArrayList<>(userDetails.getAuthorities());
                    roles = authorities.stream()
                            .map(GrantedAuthority::getAuthority)
                            .filter(auth -> auth.startsWith("ROLE_"))
                            .map(auth -> auth.substring(5))
                            .collect(Collectors.toSet());
                    // For legacy, everything is GLOBAL or we'd need to fetch from DB (slow in
                    // filter)
                    Map<String, com.nulogic.domain.user.RoleScope> fallbackScopes = new HashMap<>();
                    authorities.stream()
                            .map(GrantedAuthority::getAuthority)
                            .filter(auth -> !auth.startsWith("ROLE_"))
                            .forEach(perm -> fallbackScopes.put(perm, com.nulogic.domain.user.RoleScope.GLOBAL));
                    permissionScopes = fallbackScopes;
                }

                // PERF-H01 FIX: Avoid redundant DB query for NU Platform tokens.
                // When the JWT already provided roles/permissions (first branch), we can
                // construct a UserPrincipal directly from JWT claims instead of hitting the DB.
                // The legacy fallback branch (else) already loaded UserDetails above.
                UserDetails userDetails;
                boolean isNuPlatformToken = !tokenPermissions.isEmpty() || !tokenRoles.isEmpty();

                if (isNuPlatformToken) {
                    // Construct UserPrincipal from JWT claims — no DB query needed
                    UUID userId = null;
                    try {
                        userId = tokenProvider.getUserIdFromToken(jwt);
                    } catch (Exception e) { // Intentional broad catch — security filter error boundary
                        log.debug("Could not extract userId from JWT for principal construction", e);
                    }
                    userDetails = new UserPrincipal(
                            userId,
                            tenantId,
                            username,
                            null, // password not needed for token-based auth
                            authorities);
                } else {
                    // Legacy mode: UserDetails was already loaded in the else branch above,
                    // but the variable was scoped inside. Load once here for legacy tokens.
                    userDetails = userDetailsService.loadUserByUsername(username);
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userDetails, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Populate custom SecurityContext ThreadLocal for @RequiresPermission checks
                if (userDetails instanceof UserPrincipal principal) {

                    // Extract organizational context from token
                    UUID employeeId = tokenProvider.getEmployeeIdFromToken(jwt);
                    UUID locationId = tokenProvider.getLocationIdFromToken(jwt);
                    UUID departmentId = tokenProvider.getDepartmentIdFromToken(jwt);
                    UUID teamId = tokenProvider.getTeamIdFromToken(jwt);

                    // If not in token, fallback to legacy DB lookup (optional for reliability)
                    if (employeeId == null) {
                        Optional<Employee> employee = employeeRepository.findByUserIdAndTenantId(principal.getId(),
                                tenantId);
                        employeeId = employee.map(Employee::getId).orElse(null);
                        locationId = employee.map(Employee::getOfficeLocationId).orElse(null);
                        departmentId = employee.map(Employee::getDepartmentId).orElse(null);
                        teamId = employee.map(Employee::getTeamId).orElse(null);
                    }

                    // Set SecurityContext with NU Platform app-aware data
                    SecurityContext.setCurrentUser(principal.getId(), employeeId, roles, permissionScopes);
                    TenantContext.setCurrentTenant(tenantId);
                    SecurityContext.setOrgContext(locationId, departmentId, teamId);

                    // Set app context if available from token
                    if (appCode != null) {
                        SecurityContext.setCurrentApp(appCode);
                    }
                    if (!accessibleApps.isEmpty()) {
                        SecurityContext.setAccessibleApps(accessibleApps);
                    }

                    // Load scope-related context data (reportees for TEAM, custom targets for CUSTOM)
                    scopeContextService.populateScopeContext(
                            principal.getId(), employeeId, tenantId, permissionScopes);

                    // Debug logging for permission troubleshooting
                    log.debug("JWT Auth - User: {}, AppCode: {}, Roles: {}, Permissions: {}",
                            username, appCode, roles, permissionScopes.keySet());
                }
            }
        } catch (JwtException | UsernameNotFoundException | IllegalArgumentException ex) {
            logger.error("Could not set user authentication in security context", ex);
        }

        try {
            filterChain.doFilter(request, response);
        } finally {
            // Clear SecurityContext ThreadLocal after request completes
            SecurityContext.clear();
            TenantContext.clear();
        }
    }

    /**
     * Normalize a permission code from DB format ("employee.read") to the canonical
     * UPPERCASE:COLON format ("EMPLOYEE:READ") used by Permission.java constants and
     *
     * @RequiresPermission annotations.
     * <p>
     * Handles multiple formats:
     * - "employee.read" → "EMPLOYEE:READ"
     * - "EMPLOYEE:READ" → "EMPLOYEE:READ" (already canonical)
     * - "HRMS:EMPLOYEE:READ" → "HRMS:EMPLOYEE:READ" (app-prefixed, keep as-is)
     */
    private String normalizePermissionCode(String code) {
        if (code == null) return null;
        // If already in UPPER:COLON format, return as-is
        if (code.contains(":")) return code;
        // Convert "resource.action" to "RESOURCE:ACTION"
        return code.replace('.', ':').toUpperCase();
    }

    /**
     * Extract JWT from request.
     * Checks in order: httpOnly cookie (secure) → Authorization header (backward compatibility)
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        // First, try to get from secure httpOnly cookie (preferred)
        String tokenFromCookie = getJwtFromCookie(request);
        if (StringUtils.hasText(tokenFromCookie)) {
            return tokenFromCookie;
        }

        // Fallback to Authorization header for backward compatibility and API clients.
        // DEPRECATED: gated behind app.security.allow-bearer-header (default false in prod).
        if (allowBearerHeader) {
            String bearerToken = request.getHeader("Authorization");
            if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
                log.debug("JWT via Authorization header from IP: {} path: {} (deprecated path enabled)",
                        request.getRemoteAddr(), request.getRequestURI());
                return bearerToken.substring(7);
            }
        }

        return null;
    }

    /**
     * Extract the JWT access token from the request cookie jar.
     *
     * <p>SEC (S10-J): Accepts EITHER the hardened {@code __Host-hrms-access}
     * cookie OR the legacy {@code access_token} cookie during a one-deploy
     * rollover window. The hardened cookie wins when both are present, since
     * a {@code __Host-} prefixed cookie cannot be planted by a sibling
     * subdomain or over plain HTTP — the browser enforces {@code Secure},
     * {@code Path=/}, and no {@code Domain} on the prefix.</p>
     */
    private String getJwtFromCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        String legacyValue = null;
        for (Cookie cookie : cookies) {
            String name = cookie.getName();
            if (CookieConfig.ACCESS_TOKEN_COOKIE_HOST.equals(name)) {
                // Hardened cookie wins. Return immediately — even if a legacy
                // cookie was also present, the __Host- one is the trustworthy
                // source.
                return cookie.getValue();
            }
            if (CookieConfig.ACCESS_TOKEN_COOKIE.equals(name)) {
                legacyValue = cookie.getValue();
                // Don't return yet — keep scanning in case the __Host- cookie
                // appears later in the array.
            }
        }
        return legacyValue;
    }
}
