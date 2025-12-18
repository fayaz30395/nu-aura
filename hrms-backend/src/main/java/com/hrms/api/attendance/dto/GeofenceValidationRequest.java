package com.hrms.api.attendance.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GeofenceValidationRequest {

    @NotNull(message = "Latitude is required")
    private BigDecimal latitude;

    @NotNull(message = "Longitude is required")
    private BigDecimal longitude;
}
