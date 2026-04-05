package com.hrms.api.recruitment.dto;

import com.hrms.domain.recruitment.RecruitmentAgency.AgencyStatus;
import com.hrms.domain.recruitment.RecruitmentAgency.FeeType;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class UpdateAgencyRequest {

    @Size(max = 200, message = "Agency name must not exceed 200 characters")
    private String name;

    @Size(max = 200, message = "Contact person must not exceed 200 characters")
    private String contactPerson;

    @Email(message = "Email must be a valid email address")
    @Size(max = 200, message = "Email must not exceed 200 characters")
    private String email;

    @Size(max = 50, message = "Phone must not exceed 50 characters")
    private String phone;

    @Size(max = 500, message = "Website must not exceed 500 characters")
    private String website;

    private String address;

    private FeeType feeType;

    @DecimalMin(value = "0.00", message = "Fee amount must be non-negative")
    private BigDecimal feeAmount;

    private LocalDate contractStartDate;

    private LocalDate contractEndDate;

    private AgencyStatus status;

    private String specializations;

    @Size(max = 5000, message = "Notes must not exceed 5000 characters")
    private String notes;

    @Min(value = 1, message = "Rating must be between 1 and 5")
    @Max(value = 5, message = "Rating must be between 1 and 5")
    private Integer rating;
}
