package com.nulogic.hrms.org.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class OrgUnitRequest {
    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Active flag is required")
    private Boolean active;
}
