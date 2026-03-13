package com.hrms.api.contract.dto;

import com.hrms.domain.contract.ContractType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for contract template
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractTemplateDto {

    private UUID id;
    private String name;
    private ContractType type;
    private Map<String, Object> content;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
