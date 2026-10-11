package com.nulogic.common.security;

import com.nulogic.common.config.CookieConfig;
import com.nulogic.domain.tenant.Tenant;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tenant.repository.TenantStatusCache;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * S10-E principal guard and #14 roles-claim guard in {@link JwtAuthenticationFilter}.
 * A rejected principal must reach the rest of the chain unauthenticated (protected
 * endpoints then answer 401 via the entry point), exactly like an invalid token.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("JwtAuthenticationFilter principal guard")
class JwtAuthenticationFilterPrincipalGuardTest {

    private static final String JWT = "signed.jwt.token";

    @Mock private JwtTokenProvider tokenProvider;
    @Mock private UserDetailsService userDetailsService;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private ScopeContextService scopeContextService;
    @Mock private SecurityService securityService;
    @Mock private TenantStatusCache tenantStatusCache;
    @Mock private UserAuthStatusCache userAuthStatusCache;

    private JwtAuthenticationFilter filter;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID userId = UUID.randomUUID();
    private final AtomicReference<Authentication> authSeenByChain = new AtomicReference<>();
    private final AtomicReference<Boolean> chainInvoked = new AtomicReference<>(false);

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(tokenProvider, userDetailsService, employeeRepository,
                scopeContextService, securityService, tenantStatusCache, userAuthStatusCache);

        Tenant tenant = new Tenant();
        tenant.setStatus(Tenant.TenantStatus.ACTIVE);
        when(tenantStatusCache.findById(tenantId)).thenReturn(Optional.of(tenant));

        when(tokenProvider.validateToken(JWT)).thenReturn(true);
        when(tokenProvider.hasRolesClaim(JWT)).thenReturn(true);
        when(tokenProvider.getUsernameFromToken(JWT)).thenReturn("user@example.com");
        when(tokenProvider.getTenantIdFromToken(JWT)).thenReturn(tenantId);
        when(tokenProvider.getUserIdFromToken(JWT)).thenReturn(userId);
        when(tokenProvider.getRolesFromToken(JWT)).thenReturn(Set.of("EMPLOYEE"));
        when(tokenProvider.getEmployeeIdFromToken(JWT)).thenReturn(UUID.randomUUID());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        SecurityContext.clear();
        TenantContext.clear();
    }

    private MockHttpServletResponse run() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/employees");
        request.setCookies(new Cookie(CookieConfig.ACCESS_TOKEN_COOKIE, JWT));
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = (req, res) -> {
            chainInvoked.set(true);
            authSeenByChain.set(SecurityContextHolder.getContext().getAuthentication());
        };
        filter.doFilter(request, response, chain);
        return response;
    }

    @Test
    @DisplayName("inactive / anonymised user: chain continues unauthenticated (401 at entry point)")
    void inactiveUserIsNotAuthenticated() throws Exception {
        when(userAuthStatusCache.isActive(tenantId, userId)).thenReturn(false);

        MockHttpServletResponse response = run();

        assertThat(chainInvoked.get()).isTrue();
        assertThat(authSeenByChain.get()).isNull();
        assertThat(response.getStatus()).isEqualTo(200);
        verify(securityService, never()).getCachedPermissionScopesForUser(any(), any());
    }

    @Test
    @DisplayName("guard runs with TenantContext set to the token tenant (users table is under RLS)")
    void guardRunsUnderTokenTenant() throws Exception {
        AtomicReference<UUID> tenantDuringLookup = new AtomicReference<>();
        when(userAuthStatusCache.isActive(tenantId, userId)).thenAnswer(inv -> {
            tenantDuringLookup.set(TenantContext.getCurrentTenant());
            return false;
        });

        run();

        assertThat(tenantDuringLookup.get()).isEqualTo(tenantId);
    }

    @Test
    @DisplayName("active user is authenticated")
    void activeUserIsAuthenticated() throws Exception {
        when(userAuthStatusCache.isActive(tenantId, userId)).thenReturn(true);

        run();

        assertThat(chainInvoked.get()).isTrue();
        assertThat(authSeenByChain.get()).isNotNull();
        assertThat(authSeenByChain.get().getPrincipal()).isInstanceOf(UserPrincipal.class);
        assertThat(((UserPrincipal) authSeenByChain.get().getPrincipal()).getId()).isEqualTo(userId);
    }

    @Test
    @DisplayName("token without userId claim is rejected")
    void missingUserIdIsRejected() throws Exception {
        when(tokenProvider.getUserIdFromToken(JWT)).thenReturn(null);
        when(userAuthStatusCache.isActive(tenantId, null)).thenReturn(false);

        run();

        assertThat(authSeenByChain.get()).isNull();
    }

    @Test
    @DisplayName("impersonation token skips the user guard (impersonator row is in another tenant)")
    void impersonationSkipsGuard() throws Exception {
        when(tokenProvider.isImpersonationToken(JWT)).thenReturn(true);

        run();

        verify(userAuthStatusCache, never()).isActive(any(), any());
        assertThat(authSeenByChain.get()).isNotNull();
    }

    @Test
    @DisplayName("#14: token with no roles claim is rejected instead of getting legacy GLOBAL scopes")
    void tokenWithoutRolesClaimIsRejected() throws Exception {
        when(tokenProvider.hasRolesClaim(JWT)).thenReturn(false);
        when(userAuthStatusCache.isActive(tenantId, userId)).thenReturn(true);

        run();

        assertThat(chainInvoked.get()).isTrue();
        assertThat(authSeenByChain.get()).isNull();
        verify(userDetailsService, never()).loadUserByUsername(any());
    }
}
