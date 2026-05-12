package com.hrms.api.knowledge.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSpaceMemberRequest {

    @NotNull(message = "Role is required")
    private String role;
}
