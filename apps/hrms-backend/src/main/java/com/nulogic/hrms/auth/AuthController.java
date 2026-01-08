package com.nulogic.hrms.auth;

import com.nulogic.hrms.auth.dto.AuthResponse;
import com.nulogic.hrms.auth.dto.GoogleLoginRequest;
import com.nulogic.hrms.auth.dto.LoginRequest;
import com.nulogic.hrms.config.HrmsProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;
    private final HrmsProperties properties;

    public AuthController(AuthService authService, HrmsProperties properties) {
        this.authService = authService;
        this.properties = properties;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        AuthService.AuthResult result = authService.login(request.getIdToken(), httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"));
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/google")
    public ResponseEntity<AuthResponse> googleLogin(@Valid @RequestBody GoogleLoginRequest request,
                                                    HttpServletRequest httpRequest) {
        AuthService.AuthResult result = authService.loginWithGoogleToken(
                request.getCredential(),
                request.isAccessToken(),
                httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@RequestHeader("X-Refresh-Token") String refreshToken,
                                                HttpServletRequest httpRequest) {
        AuthService.AuthResult result = authService.refresh(refreshToken, httpRequest.getRemoteAddr(),
                httpRequest.getHeader("User-Agent"));
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestHeader(value = "X-Refresh-Token", required = false) String refreshToken,
                                       HttpServletRequest httpRequest) {
        authService.logout(refreshToken, httpRequest.getRemoteAddr(), httpRequest.getHeader("User-Agent"));
        return ResponseEntity.noContent().build();
    }

    private AuthResponse toResponse(AuthService.AuthResult result) {
        List<String> roles = result.roles();
        UUID tenantId = result.user().getOrg().getId();
        long expiresInSeconds = Duration.ofMinutes(properties.getSecurity().getJwt().getAccessTtlMinutes()).toSeconds();
        return AuthResponse.builder()
                .accessToken(result.accessToken())
                .refreshToken(result.refreshToken())
                .tokenType("Bearer")
                .expiresIn(expiresInSeconds)
                .userId(result.user().getId())
                .tenantId(tenantId)
                .employeeId(result.employeeId())
                .email(result.user().getEmail())
                .fullName(result.user().getFullName())
                .user(AuthResponse.UserSummary.builder()
                        .id(result.user().getId())
                        .email(result.user().getEmail())
                        .fullName(result.user().getFullName())
                        .roles(roles)
                        .build())
                .build();
    }
}
