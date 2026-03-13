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
import java.util.UUID;

/**
 * DTO for contract list response (lightweight)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContractListDto {

    private UUID id;
    private String title;
    private ContractType type;
    private ContractStatus status;
    private String employeeName;
    private String vendorName;
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal value;
    private String currency;
    private int pendingSignatureCount;
    private LocalDateTime createdAt;
    private boolean isExpiring;
    private boolean isExpired;
}
