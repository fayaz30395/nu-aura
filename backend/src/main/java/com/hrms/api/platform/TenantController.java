package com.hrms.api.platform;

import com.hrms.api.auth.dto.AuthResponse;
import com.hrms.api.platform.dto.TenantRegistrationRequest;
import com.hrms.application.platform.service.TenantProvisioningService;
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
 * Public endpoint for SaaS self-serve tenant registration.
 *
 * <p>This endpoint is intentionally public (no authentication required) so that
 * new customers can sign up. It is listed in {@code SecurityConfig} under
 * {@code .requestMatchers("/api/v1/tenants/register").permitAll()}.</p>
 */
@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
@Slf4j
public class TenantController {

    private final TenantProvisioningService tenantProvisioningService;

    /**
     * Register a new tenant and provision an admin account.
     *
     * <p>On success the response contains a JWT so the admin can immediately
     * access the application without a separate login step.</p>
     *
     * @param request company details + admin credentials
     * @return {@link AuthResponse} containing access / refresh tokens and user info
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody TenantRegistrationRequest request) {

        log.info("New tenant registration request for company: {}", request.getCompanyName());
        AuthResponse response = tenantProvisioningService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
