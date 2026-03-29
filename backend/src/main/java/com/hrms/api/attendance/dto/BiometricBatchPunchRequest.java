package com.hrms.api.attendance.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

/**
 * Batch punch request for devices that buffer and send punches in bulk.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricBatchPunchRequest {

    @NotEmpty(message = "At least one punch is required")
    @Size(max = 500, message = "Maximum 500 punches per batch")
    @Valid
    private List<BiometricPunchRequest> punches;
}
