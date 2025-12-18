package com.hrms.api.asset.dto;

import com.hrms.domain.asset.Asset;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class AssetResponse {

    private UUID id;
    private UUID tenantId;
    private String assetCode;
    private String assetName;
    private Asset.AssetCategory category;
    private String brand;
    private String model;
    private String serialNumber;
    private LocalDate purchaseDate;
    private BigDecimal purchaseCost;
    private BigDecimal currentValue;
    private Asset.AssetStatus status;
    private UUID assignedTo;
    private String assignedToName;
    private String location;
    private LocalDate warrantyExpiry;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
