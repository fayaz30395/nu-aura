package com.hrms.application.platform.service;

import com.hrms.api.auth.dto.AuthResponse;
import com.hrms.api.platform.dto.TenantRegistrationRequest;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.JwtTokenProvider;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.tenant.Tenant;
import com.hrms.domain.user.Role;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.tenant.repository.TenantRepository;
import com.hrms.infrastructure.user.repository.RoleRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Provisions a new tenant for SaaS self-serve registration.
 *
 * <p>Flow:
 * <ol>
 *   <li>Validate uniqueness of company code and admin email</li>
 *   <li>Create the {@link Tenant} record (status ACTIVE)</li>
 *   <li>Create the admin {@link User} with a hashed password</li>
 *   <li>Create a default ADMIN {@link Role} for the tenant</li>
 *   <li>Assign the role to the user</li>
 *   <li>Generate and return JWT so the admin is immediately logged in</li>
 * </ol>
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TenantProvisioningService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public AuthResponse register(TenantRegistrationRequest req) {

        // ── 1. Uniqueness checks ────────────────────────────────────────────
        if (tenantRepository.existsByCode(req.getCompanyCode())) {
            throw new ValidationException("Company code already taken: " + req.getCompanyCode());
        }

        // Tenant does not exist yet — email uniqueness is per tenant, so any existing
        // record with the same email in another tenant is fine.

        // ── 2. Create tenant ────────────────────────────────────────────────
        Tenant tenant = Tenant.builder()
                .code(req.getCompanyCode())
                .name(req.getCompanyName())
                .status(Tenant.TenantStatus.ACTIVE)
                .contactEmail(req.getAdminEmail())
                .contactPhone(req.getContactPhone())
                .build();
        tenant = tenantRepository.save(tenant);
        UUID tenantId = tenant.getId();
        log.info("Provisioned new tenant: {} ({})", tenant.getName(), tenantId);

        // Set context so downstream operations use the correct tenant
        TenantContext.setCurrentTenant(tenantId);

        // ── 3. Create admin user ─────────────────────────────────────────────
        User adminUser = new User();
        adminUser.setTenantId(tenantId);
        adminUser.setEmail(req.getAdminEmail());
        adminUser.setFirstName(req.getAdminFirstName());
        adminUser.setLastName(req.getAdminLastName());
        adminUser.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        adminUser.setStatus(User.UserStatus.ACTIVE);
        adminUser = userRepository.save(adminUser);
        log.info("Created admin user {} for tenant {}", adminUser.getEmail(), tenantId);

        // ── 4. Create default ADMIN role for this tenant ─────────────────────
        Role adminRole = roleRepository.findByCodeAndTenantId("ADMIN", tenantId)
                .orElseGet(() -> {
                    Role r = new Role();
                    r.setTenantId(tenantId);
                    r.setCode("ADMIN");
                    r.setName("Administrator");
                    r.setDescription("Full access to all HRMS features");
                    r.setIsSystemRole(true);
                    return roleRepository.save(r);
                });

        // ── 5. Assign role to user ───────────────────────────────────────────
        adminUser.setRoles(Set.of(adminRole));
        adminUser = userRepository.save(adminUser);

        // ── 6. Generate JWT ──────────────────────────────────────────────────
        Authentication auth = new UsernamePasswordAuthenticationToken(
                adminUser.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );

        String accessToken = jwtTokenProvider.generateToken(auth, tenantId, adminUser.getId());
        String refreshToken = jwtTokenProvider.generateRefreshToken(adminUser.getEmail(), tenantId);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(3600L)
                .userId(adminUser.getId())
                .tenantId(tenantId)
                .email(adminUser.getEmail())
                .fullName(adminUser.getFullName())
                .build();
    }
}
