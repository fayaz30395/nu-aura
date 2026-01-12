package com.hrms.api.exit.dto;

import com.hrms.domain.exit.AssetRecovery;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetRecoveryRequest {
    private UUID exitProcessId;
    private UUID employeeId;
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
    private UUID verifiedBy;
    private LocalDate verificationDate;
    private String remarks;
    private Boolean isWaived;
    private String waiverReason;
    private UUID waivedBy;
}
