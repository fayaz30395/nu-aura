package com.hrms.api.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoleRequest {

    @NotBlank(message = "Role code is required")
    @Size(max = 50, message = "Role code must not exceed 50 characters")
    private String code;

    @NotBlank(message = "Role name is required")
    @Size(max = 100, message = "Role name must not exceed 100 characters")
    private String name;

    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    private Set<String> permissionCodes;
}
