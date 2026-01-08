package com.nulogic.hrms.iam.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class RoleRequest {
    @NotBlank(message = "Role name is required")
    private String name;

    private String description;

    private List<UUID> permissionIds;

    private List<UUID> permissionGroupIds;
}
