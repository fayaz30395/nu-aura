package com.hrms.api.asset.dto;

import com.hrms.domain.asset.Asset;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class AssetRequest {

    @NotBlank(message = "Asset code is required")
    private String assetCode;

    @NotBlank(message = "Asset name is required")
    private String assetName;

    @NotNull(message = "Category is required")
    private Asset.AssetCategory category;

    private String brand;

    private String model;

    private String serialNumber;

    private LocalDate purchaseDate;

    private BigDecimal purchaseCost;

    private BigDecimal currentValue;

    private Asset.AssetStatus status;

    private UUID assignedTo;

    private String location;

    private LocalDate warrantyExpiry;

    private String notes;
}
