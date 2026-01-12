package com.hrms.api.user.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssignRolesRequest {

    @NotEmpty(message = "Role codes are required")
    private Set<String> roleCodes;
}
