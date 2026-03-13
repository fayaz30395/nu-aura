package com.hrms.api.contract.dto;

import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ContractType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * DTO for contract response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractDto {

    private UUID id;
    private String title;
    private ContractType type;
    private ContractStatus status;
    private UUID employeeId;
    private String employeeName;
    private String vendorName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean autoRenew;
    private Integer renewalPeriodDays;
    private BigDecimal value;
    private String currency;
    private String description;
    private Map<String, Object> terms;
    private String documentUrl;
    private UUID createdBy;
    private LocalDateTime createdAt;
    private UUID updatedBy;
    private LocalDateTime updatedAt;
    private int signatureCount;
    private int pendingSignatureCount;
    private List<ContractSignatureDto> signatures;
}
