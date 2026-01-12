package com.hrms.api.user.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignPermissionsRequest {

    @NotEmpty(message = "Permission codes are required")
    private Set<String> permissionCodes;
}
