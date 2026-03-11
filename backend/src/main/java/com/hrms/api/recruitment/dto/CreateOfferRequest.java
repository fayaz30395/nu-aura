package com.hrms.api.recruitment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO for creating/extending a job offer to a candidate.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateOfferRequest {
    private BigDecimal offeredSalary;
    private String positionTitle;
    private LocalDate joiningDate;
    private LocalDate offerExpiryDate;
    private String notes;
}
