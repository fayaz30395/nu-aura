package com.hrms.api.auth.controller;

import com.hrms.api.auth.dto.MfaSetupResponse;
import com.hrms.api.auth.dto.MfaStatusResponse;
import com.hrms.api.auth.dto.MfaVerifyRequest;
import com.hrms.application.auth.service.MfaService;
import com.hrms.common.exception.AuthenticationException;
import com.hrms.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * REST API controller for Multi-Factor Authentication (MFA) operations.
 * All endpoints require authentication.
 */
@RestController
@RequestMapping("/api/v1/auth/mfa")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "MFA", description = "Multi-Factor Authentication endpoints")
@SecurityRequirement(name = "bearer-jwt")
public class MfaController {

    private final MfaService mfaService;

    /**
     * Initiates MFA setup for the current user.
     * Returns a QR code URL and backup codes that must be saved securely.
     *
     * @return MfaSetupResponse with QR code, secret, and backup codes
     */
    @GetMapping("/setup")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Initiate MFA setup", description = "Generate TOTP secret, QR code, and backup codes for MFA setup")
    public ResponseEntity<MfaSetupResponse> setupMfa() {
        UUID userId = SecurityContext.getCurrentUserId();
        log.info("MFA setup initiated for user: {}", userId);

        MfaSetupResponse response = mfaService.setupMfa(userId);
        return ResponseEntity.ok(response);
    }

    /**
     * Verifies the TOTP code and enables MFA.
     * Must be called after setupMfa() with the code from the authenticator app.
     *
     * @param request the verification request containing the TOTP code
     * @return MfaStatusResponse indicating MFA is now enabled
     */
    @PostMapping("/verify")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Verify and enable MFA", description = "Verify TOTP code and enable MFA for the user")
    public ResponseEntity<MfaStatusResponse> verifyMfa(@Valid @RequestBody MfaVerifyRequest request) {
        UUID userId = SecurityContext.getCurrentUserId();
        log.info("MFA verification initiated for user: {}", userId);

        try {
            mfaService.verifyAndEnableMfa(userId, request.getCode());
            MfaStatusResponse response = mfaService.getMfaStatus(userId);
            response.setVerified(true);
            return ResponseEntity.ok(response);
        } catch (AuthenticationException e) {
            log.warn("MFA verification failed for user: {}", userId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(MfaStatusResponse.builder().verified(false).build());
        }
    }

    /**
     * Disables MFA for the current user.
     * Requires verification with a valid TOTP code.
     *
     * @param request the verification request containing the TOTP code
     * @return success message
     */
    @DeleteMapping("/disable")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Disable MFA", description = "Disable MFA after verifying with TOTP code")
    public ResponseEntity<Map<String, String>> disableMfa(@Valid @RequestBody MfaVerifyRequest request) {
        UUID userId = SecurityContext.getCurrentUserId();
        log.info("MFA disable initiated for user: {}", userId);

        try {
            mfaService.disableMfa(userId, request.getCode());
            return ResponseEntity.ok(Map.of("message", "MFA has been disabled successfully"));
        } catch (AuthenticationException e) {
            log.warn("MFA disable failed for user: {}", userId);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid MFA code"));
        }
    }

    /**
     * Gets the current MFA status for the user.
     *
     * @return MfaStatusResponse with enabled status and setup time
     */
    @GetMapping("/status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get MFA status", description = "Get the current MFA status for the user")
    public ResponseEntity<MfaStatusResponse> getMfaStatus() {
        UUID userId = SecurityContext.getCurrentUserId();
        MfaStatusResponse response = mfaService.getMfaStatus(userId);
        return ResponseEntity.ok(response);
    }
}
