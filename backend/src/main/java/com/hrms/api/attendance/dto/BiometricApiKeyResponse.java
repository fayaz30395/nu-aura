package com.hrms.api.attendance.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricApiKeyResponse {

    private UUID id;
    private String keyName;
    private String keySuffix;
    private UUID deviceId;
    private Boolean isActive;
    private LocalDateTime expiresAt;
    private LocalDateTime lastUsedAt;
    private LocalDateTime createdAt;

    /**
     * The plaintext API key. Only populated when a key is first created.
     */
    private String plaintextKey;
}
