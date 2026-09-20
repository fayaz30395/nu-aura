package com.nulogic.api.platform;

import com.nulogic.api.auth.dto.AuthResponse;
import com.nulogic.api.platform.dto.TenantRegistrationRequest;
import com.nulogic.application.platform.service.TenantProvisioningService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Internal tenant provisioning — SUPER_ADMIN only.
 *
 * <p>NU-AURA is NULogic's internal platform, not a SaaS product with public
 * self-serve signup (see product vision: internal cost-elimination Keka
 * replacement, not sold externally). This endpoint used to be unauthenticated
 * ({@code permitAll()} in {@code SecurityConfig}) under a stale "SaaS self-serve"
 * framing — an unauthenticated create-tenant-and-admin-with-JWT API is a real
 * account-creation vector with zero product justification here. Locked down to
 * {@link Permission#TENANT_MANAGE} (SUPER_ADMIN-only per RoleHierarchy).</p>
 */
@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
@Slf4j
public class TenantController {

    private final TenantProvisioningService tenantProvisioningService;

    /**
     * Provision a new tenant and its initial admin account.
     *
     * <p>On success the response contains a JWT for the new tenant's admin,
     * for the calling SUPER_ADMIN to hand off during onboarding.</p>
     *
     * @param request company details + admin credentials
     * @return {@link AuthResponse} containing access / refresh tokens and user info
     */
    @PostMapping("/register")
    @RequiresPermission(Permission.TENANT_MANAGE)
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody TenantRegistrationRequest request) {

        log.info("New tenant registration request for company: {}", request.getCompanyName());
        AuthResponse response = tenantProvisioningService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
