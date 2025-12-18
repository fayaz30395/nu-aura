package com.hrms.api.performance.dto;

import com.hrms.domain.performance.KeyResult.MeasurementType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KeyResultRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private MeasurementType measurementType;

    private BigDecimal startValue;

    @NotNull(message = "Target value is required")
    private BigDecimal targetValue;

    private String measurementUnit;

    private Integer weight;

    private LocalDate dueDate;

    private Boolean isMilestone;

    private Integer milestoneOrder;

    private UUID ownerId;
}
