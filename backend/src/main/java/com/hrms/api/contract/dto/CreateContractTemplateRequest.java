package com.hrms.api.contract.dto;

import com.hrms.domain.contract.ContractType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

/**
 * DTO for creating a contract template
 */
@Data
public class CreateContractTemplateRequest {

    @NotBlank(message = "Template name is required")
    @Size(min = 3, max = 255, message = "Name must be between 3 and 255 characters")
    private String name;

    @NotNull(message = "Contract type is required")
    private ContractType type;

    @NotNull(message = "Template content is required")
    private Map<String, Object> content;
}
