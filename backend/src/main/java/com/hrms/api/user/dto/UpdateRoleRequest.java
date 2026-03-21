package com.hrms.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRoleRequest {

    @NotBlank(message = "Role name is required")
    @Size(max = 100, message = "Role name must not exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    /**
     * Task 9: Optional parent role ID for role hierarchy inheritance.
     * If null, clears the parent (role has no parent).
     * Validated in RoleManagementService.validateAndSetParentRole() for cycle detection.
     */
    private UUID parentRoleId;
}
