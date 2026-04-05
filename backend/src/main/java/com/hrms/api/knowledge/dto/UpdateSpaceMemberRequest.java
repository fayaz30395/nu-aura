package com.hrms.api.knowledge.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateSpaceMemberRequest {

    @NotNull(message = "Role is required")
    private String role;
}
