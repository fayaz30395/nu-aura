package com.hrms.common.security;

import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                UUID tenantId = tokenProvider.getTenantIdFromToken(jwt);
                UUID userId = tokenProvider.getUserIdFromToken(jwt);

                TenantContext.setCurrentTenant(tenantId);

                // Try to get NU Platform app-aware claims from token
                String appCode = tokenProvider.getAppCodeFromToken(jwt);
                Set<String> tokenPermissions = tokenProvider.getPermissionsFromToken(jwt);
                Set<String> tokenRoles = tokenProvider.getRolesFromToken(jwt);
                Set<String> accessibleApps = tokenProvider.getAccessibleAppsFromToken(jwt);

                // Build authorities from token claims if available (NU Platform format)
                Collection<GrantedAuthority> authorities;
                Set<String> permissions;
                Set<String> roles;

                if (!tokenPermissions.isEmpty() || !tokenRoles.isEmpty()) {
                    // Use NU Platform claims from token
                    authorities = new ArrayList<>();
                    tokenRoles.forEach(role -> authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
                    tokenPermissions.forEach(perm -> authorities.add(new SimpleGrantedAuthority(perm)));
                    permissions = tokenPermissions;
                    roles = tokenRoles;
                } else {
                    // Fallback: Load from UserDetailsService (legacy mode)
                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    authorities = new ArrayList<>(userDetails.getAuthorities());
                    permissions = authorities.stream()
                            .map(GrantedAuthority::getAuthority)
                            .filter(auth -> !auth.startsWith("ROLE_"))
                            .collect(Collectors.toSet());
                    roles = authorities.stream()
                            .map(GrantedAuthority::getAuthority)
                            .filter(auth -> auth.startsWith("ROLE_"))
                            .map(auth -> auth.substring(5))
                            .collect(Collectors.toSet());
                }

                // Create authentication with combined authorities
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);

                // Populate custom SecurityContext ThreadLocal for @RequiresPermission checks
                if (userDetails instanceof UserPrincipal) {
                    UserPrincipal principal = (UserPrincipal) userDetails;

                    // Look up employee ID if exists
                    Optional<Employee> employee = employeeRepository.findByUserIdAndTenantId(principal.getId(), tenantId);
                    UUID employeeId = employee.map(Employee::getId).orElse(null);

                    // Set SecurityContext with NU Platform app-aware data
                    SecurityContext.setCurrentUser(principal.getId(), employeeId, roles, permissions);
                    SecurityContext.setCurrentTenantId(tenantId);

                    // Set app context if available from token
                    if (appCode != null) {
                        SecurityContext.setCurrentApp(appCode);
                    }
                    if (!accessibleApps.isEmpty()) {
                        SecurityContext.setAccessibleApps(accessibleApps);
                    }
                }
            }
        } catch (Exception ex) {
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

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
