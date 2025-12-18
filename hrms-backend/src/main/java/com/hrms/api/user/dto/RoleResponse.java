package com.hrms.api.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleResponse {
    private UUID id;
    private String code;
    private String name;
    private String description;
    private Boolean isSystemRole;
    private UUID tenantId;
    private Set<PermissionResponse> permissions;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
