package com.hrms.api.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrantAccessRequest {
    @NotNull(message = "User ID is required")
    private UUID userId;

    @NotBlank(message = "Application code is required")
    private String appCode;

    private Set<String> roleCodes;
}
