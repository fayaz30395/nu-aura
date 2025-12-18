package com.hrms.api.benefits.dto;

import com.hrms.domain.benefits.BenefitClaim;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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

    private String description;

    @NotNull(message = "Service date is required")
    private LocalDate serviceDate;

    // For medical claims
    private String diagnosisCode;
    private String procedureCode;
    private String providerName;
    private String providerType;
    private String hospitalName;
    private boolean isHospitalization;
    private LocalDate admissionDate;
    private LocalDate dischargeDate;
    private Integer numberOfDays;

    // For dependent claims
    private UUID dependentId;

    @NotNull(message = "Claimed amount is required")
    @Positive(message = "Claimed amount must be positive")
    private BigDecimal claimedAmount;

    // Pre-authorization
    private boolean preAuthorizationRequired;
    private String preAuthorizationNumber;

    // Documents
    private List<String> documentUrls;
    private String billNumber;
    private String prescriptionNumber;

    // Payment details
    private BenefitClaim.PaymentMode paymentMode;
    private String bankAccountNumber;
    private String ifscCode;
    private String upiId;
}
