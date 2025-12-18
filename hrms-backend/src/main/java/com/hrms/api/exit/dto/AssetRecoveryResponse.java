package com.hrms.api.exit.dto;

import com.hrms.domain.exit.AssetRecovery;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetRecoveryResponse {
    private UUID id;
    private UUID tenantId;
    private UUID exitProcessId;
    private UUID employeeId;
    private String employeeName;
    private UUID assetId;
    private String assetName;
    private AssetRecovery.AssetType assetType;
    private String assetTag;
    private String serialNumber;
    private LocalDate assignedDate;
    private LocalDate expectedReturnDate;
    private LocalDate actualReturnDate;
    private AssetRecovery.RecoveryStatus status;
    private AssetRecovery.AssetCondition conditionOnReturn;
    private String damageDescription;
    private BigDecimal deductionAmount;
    private UUID recoveredBy;
    private String recoveredByName;
    private UUID verifiedBy;
    private String verifiedByName;
    private LocalDate verificationDate;
    private String remarks;
    private Boolean isWaived;
    private String waiverReason;
    private UUID waivedBy;
    private String waivedByName;
    private Boolean isRecovered;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
