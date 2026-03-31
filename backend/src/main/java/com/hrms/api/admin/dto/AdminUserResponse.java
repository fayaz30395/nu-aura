package com.hrms.api.admin.dto;

import com.hrms.api.user.dto.RoleResponse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Response DTO for global user listing with tenant information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminUserResponse {
    private UUID id;
    private String email;
    private String firstName;
    private String lastName;
    private String userStatus;
    private UUID tenantId;
    private String tenantName;
    private String departmentName;
    private Set<RoleResponse> roles;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    public String getFullName() {
        return firstName + (lastName != null ? " " + lastName : "");
    }
}
