package com.nulogic.hrms.auth.dto;

import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuthResponse {
    String accessToken;
    String refreshToken;
    String tokenType;
    long expiresIn;
    UUID userId;
    UUID tenantId;
    UUID employeeId;
    String email;
    String fullName;
    UserSummary user;

    @Value
    @Builder
    public static class UserSummary {
        UUID id;
        String email;
        String fullName;
        List<String> roles;
    }
}
