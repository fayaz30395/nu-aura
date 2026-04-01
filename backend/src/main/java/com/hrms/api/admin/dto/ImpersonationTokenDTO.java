package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response containing an impersonation token for accessing a specific tenant
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImpersonationTokenDTO {
    private String token;
    private String tokenType;
    private long expiresIn;
    private String tenantId;
    private String tenantName;
}
