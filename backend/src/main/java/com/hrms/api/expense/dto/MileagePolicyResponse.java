package com.hrms.api.expense.dto;

import com.hrms.domain.expense.MileagePolicy;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class MileagePolicyResponse {
    private UUID id;
    private String name;
    private BigDecimal ratePerKm;
    private BigDecimal maxDailyKm;
    private BigDecimal maxMonthlyKm;
    private String vehicleRates;
    private boolean isActive;
    private LocalDate effectiveFrom;
    private LocalDate effectiveTo;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MileagePolicyResponse fromEntity(MileagePolicy entity) {
        return MileagePolicyResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .ratePerKm(entity.getRatePerKm())
                .maxDailyKm(entity.getMaxDailyKm())
                .maxMonthlyKm(entity.getMaxMonthlyKm())
                .vehicleRates(entity.getVehicleRates())
                .isActive(entity.isActive())
                .effectiveFrom(entity.getEffectiveFrom())
                .effectiveTo(entity.getEffectiveTo())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
