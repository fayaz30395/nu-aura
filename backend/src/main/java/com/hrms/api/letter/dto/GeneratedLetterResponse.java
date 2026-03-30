package com.hrms.api.letter.dto;

import com.hrms.domain.letter.GeneratedLetter;
import com.hrms.domain.letter.GeneratedLetter.LetterStatus;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class GeneratedLetterResponse {

    private UUID id;
    private String referenceNumber;

    private UUID templateId;
    private String templateName;

    private UUID employeeId;
    private String employeeName;
    private String employeeEmail;

    // For offer letters to candidates
    private UUID candidateId;
    private String candidateName;
    private String candidateEmail;

    private LetterCategory category;
    private String categoryDisplayName;
    private String letterTitle;

    private String generatedContent;
    private String pdfUrl;

    private LocalDate letterDate;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;

    private LetterStatus status;
    private String statusDisplayName;

    private UUID generatedBy;
    private String generatedByName;
    private LocalDateTime generatedAt;

    private UUID approvedBy;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String approvalComments;

    private UUID issuedBy;
    private String issuedByName;
    private LocalDateTime issuedAt;

    private Boolean sentToEmployee;
    private LocalDateTime sentAt;

    private Boolean downloadedByEmployee;
    private LocalDateTime downloadedAt;

    private String additionalNotes;
    private Integer version;

    private Boolean isActive;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static GeneratedLetterResponse fromEntity(GeneratedLetter entity) {
        return GeneratedLetterResponse.builder()
                .id(entity.getId())
                .referenceNumber(entity.getReferenceNumber())
                .templateId(entity.getTemplateId())
                .employeeId(entity.getEmployeeId())
                .candidateId(entity.getCandidateId())
                .category(entity.getCategory())
                .categoryDisplayName(formatCategory(entity.getCategory()))
                .letterTitle(entity.getLetterTitle())
                .generatedContent(entity.getGeneratedContent())
                .pdfUrl(entity.getPdfUrl())
                .letterDate(entity.getLetterDate())
                .effectiveDate(entity.getEffectiveDate())
                .expiryDate(entity.getExpiryDate())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .generatedBy(entity.getGeneratedBy())
                .generatedAt(entity.getGeneratedAt())
                .approvedBy(entity.getApprovedBy())
                .approvedAt(entity.getApprovedAt())
                .approvalComments(entity.getApprovalComments())
                .issuedBy(entity.getIssuedBy())
                .issuedAt(entity.getIssuedAt())
                .sentToEmployee(entity.getSentToEmployee())
                .sentAt(entity.getSentAt())
                .downloadedByEmployee(entity.getDownloadedByEmployee())
                .downloadedAt(entity.getDownloadedAt())
                .additionalNotes(entity.getAdditionalNotes())
                .version(entity.getLetterVersion())
                .isActive(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatCategory(LetterCategory category) {
        if (category == null) return null;
        return switch (category) {
            case OFFER -> "Offer Letter";
            case APPOINTMENT -> "Appointment Letter";
            case CONFIRMATION -> "Confirmation Letter";
            case PROMOTION -> "Promotion Letter";
            case TRANSFER -> "Transfer Letter";
            case SALARY_REVISION -> "Salary Revision Letter";
            case WARNING -> "Warning Letter";
            case TERMINATION -> "Termination Letter";
            case RESIGNATION_ACCEPTANCE -> "Resignation Acceptance";
            case EXPERIENCE -> "Experience Letter";
            case RELIEVING -> "Relieving Letter";
            case SALARY_CERTIFICATE -> "Salary Certificate";
            case EMPLOYMENT_CERTIFICATE -> "Employment Certificate";
            case BONAFIDE -> "Bonafide Certificate";
            case VISA_SUPPORT -> "Visa Support Letter";
            case BANK_LETTER -> "Bank Letter";
            case ADDRESS_PROOF -> "Address Proof Letter";
            case INTERNSHIP -> "Internship Letter";
            case TRAINING_COMPLETION -> "Training Completion";
            case APPRECIATION -> "Appreciation Letter";
            case CUSTOM -> "Custom Letter";
        };
    }

    private static String formatStatus(LetterStatus status) {
        if (status == null) return null;
        return switch (status) {
            case DRAFT -> "Draft";
            case PENDING_APPROVAL -> "Pending Approval";
            case APPROVED -> "Approved";
            case ISSUED -> "Issued";
            case REVOKED -> "Revoked";
            case EXPIRED -> "Expired";
        };
    }
}
