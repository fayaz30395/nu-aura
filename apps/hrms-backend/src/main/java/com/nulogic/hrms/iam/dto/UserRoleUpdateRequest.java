package com.nulogic.hrms.iam.dto;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class UserRoleUpdateRequest {
    @NotEmpty(message = "At least one role is required")
    private List<UUID> roleIds;
}
