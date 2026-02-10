package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitClaim;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class ClaimRequest {

    @NotNull(message = "Enrollment ID is required")
    private UUID enrollmentId;

    @NotNull(message = "Claim type is required")
    private BenefitClaim.ClaimType claimType;

    @Size(max = 2000, message = "Description cannot exceed 2000 characters")
    private String description;

    @NotNull(message = "Service date is required")
    private LocalDate serviceDate;

    // For medical claims
    @Size(max = 20, message = "Diagnosis code cannot exceed 20 characters")
    private String diagnosisCode;

    @Size(max = 20, message = "Procedure code cannot exceed 20 characters")
    private String procedureCode;

    @Size(max = 200, message = "Provider name cannot exceed 200 characters")
    private String providerName;

    @Size(max = 100, message = "Provider type cannot exceed 100 characters")
    private String providerType;

    @Size(max = 200, message = "Hospital name cannot exceed 200 characters")
    private String hospitalName;

    private boolean isHospitalization;
    private LocalDate admissionDate;
    private LocalDate dischargeDate;

    @PositiveOrZero(message = "Number of days cannot be negative")
    private Integer numberOfDays;

    // For dependent claims
    private UUID dependentId;

    @NotNull(message = "Claimed amount is required")
    @Positive(message = "Claimed amount must be positive")
    private BigDecimal claimedAmount;

    // Pre-authorization
    private boolean preAuthorizationRequired;

    @Size(max = 50, message = "Pre-authorization number cannot exceed 50 characters")
    private String preAuthorizationNumber;

    // Documents
    @Size(max = 10, message = "Cannot have more than 10 document URLs")
    private List<String> documentUrls;

    @Size(max = 50, message = "Bill number cannot exceed 50 characters")
    private String billNumber;

    @Size(max = 50, message = "Prescription number cannot exceed 50 characters")
    private String prescriptionNumber;

    // Payment details
    private BenefitClaim.PaymentMode paymentMode;

    @Size(max = 30, message = "Bank account number cannot exceed 30 characters")
    private String bankAccountNumber;

    @Size(max = 20, message = "IFSC code cannot exceed 20 characters")
    private String ifscCode;

    @Size(max = 50, message = "UPI ID cannot exceed 50 characters")
    private String upiId;
}
