package com.hrms.api.preboarding.dto;

import com.hrms.domain.preboarding.PreboardingCandidate;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class PreboardingCandidateResponse {
    private UUID id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String email;
    private String phoneNumber;
    private LocalDate expectedJoiningDate;
    private String designation;
    private UUID departmentId;
    private UUID reportingManagerId;
    private String status;
    private Integer completionPercentage;

    // Personal info
    private LocalDate dateOfBirth;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String emergencyContactNumber;
    private String emergencyContactName;

    // Bank details
    private String bankAccountNumber;
    private String bankName;
    private String bankIfscCode;
    private String taxId;

    // Document status
    private Boolean photoUploaded;
    private Boolean idProofUploaded;
    private Boolean addressProofUploaded;
    private Boolean educationDocsUploaded;
    private Boolean offerLetterSigned;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PreboardingCandidateResponse from(PreboardingCandidate c) {
        return PreboardingCandidateResponse.builder()
                .id(c.getId())
                .firstName(c.getFirstName())
                .lastName(c.getLastName())
                .fullName(c.getFullName())
                .email(c.getEmail())
                .phoneNumber(c.getPhoneNumber())
                .expectedJoiningDate(c.getExpectedJoiningDate())
                .designation(c.getDesignation())
                .departmentId(c.getDepartmentId())
                .reportingManagerId(c.getReportingManagerId())
                .status(c.getStatus().name())
                .completionPercentage(c.getCompletionPercentage())
                .dateOfBirth(c.getDateOfBirth())
                .address(c.getAddress())
                .city(c.getCity())
                .state(c.getState())
                .postalCode(c.getPostalCode())
                .country(c.getCountry())
                .emergencyContactNumber(c.getEmergencyContactNumber())
                .emergencyContactName(c.getEmergencyContactName())
                .bankAccountNumber(maskBankAccount(c.getBankAccountNumber()))
                .bankName(c.getBankName())
                .bankIfscCode(c.getBankIfscCode())
                .taxId(maskTaxId(c.getTaxId()))
                .photoUploaded(c.getPhotoUploaded())
                .idProofUploaded(c.getIdProofUploaded())
                .addressProofUploaded(c.getAddressProofUploaded())
                .educationDocsUploaded(c.getEducationDocsUploaded())
                .offerLetterSigned(c.getOfferLetterSigned())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }

    private static String maskBankAccount(String account) {
        if (account == null || account.length() < 4) return account;
        return "****" + account.substring(account.length() - 4);
    }

    private static String maskTaxId(String taxId) {
        if (taxId == null || taxId.length() < 4) return taxId;
        return "****" + taxId.substring(taxId.length() - 4);
    }
}
