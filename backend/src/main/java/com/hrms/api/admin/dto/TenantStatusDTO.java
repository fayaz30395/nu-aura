package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Response DTO for tenant status change operations (suspend / activate).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TenantStatusDTO {
    private UUID tenantId;
    private String name;
    private String status;
}
