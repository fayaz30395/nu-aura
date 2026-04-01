package com.hrms.api.selfservice.dto;

import com.hrms.domain.selfservice.ProfileUpdateRequest;
import com.hrms.domain.selfservice.ProfileUpdateRequest.RequestStatus;
import com.hrms.domain.selfservice.ProfileUpdateRequest.UpdateCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProfileUpdateResponse {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeEmail;

    private UpdateCategory category;
    private String categoryDisplayName;
    private String fieldName;
    private String currentValue;
    private String requestedValue;
    private String reason;
    private String supportingDocumentUrl;

    private RequestStatus status;
    private String statusDisplayName;

    private UUID reviewedBy;
    private String reviewerName;
    private LocalDateTime reviewedAt;
    private String reviewComments;
    private String rejectionReason;

    private Boolean autoApproved;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ProfileUpdateResponse fromEntity(ProfileUpdateRequest entity) {
        return ProfileUpdateResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .category(entity.getCategory())
                .categoryDisplayName(formatCategory(entity.getCategory()))
                .fieldName(entity.getFieldName())
                .currentValue(entity.getCurrentValue())
                .requestedValue(entity.getRequestedValue())
                .reason(entity.getReason())
                .supportingDocumentUrl(entity.getSupportingDocumentUrl())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .reviewedBy(entity.getReviewedBy())
                .reviewedAt(entity.getReviewedAt())
                .reviewComments(entity.getReviewComments())
                .rejectionReason(entity.getRejectionReason())
                .autoApproved(entity.getAutoApproved())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatCategory(UpdateCategory category) {
        if (category == null) return null;
        return switch (category) {
            case PERSONAL_INFO -> "Personal Information";
            case CONTACT_INFO -> "Contact Information";
            case EMERGENCY_CONTACT -> "Emergency Contact";
            case BANK_DETAILS -> "Bank Details";
            case ADDRESS -> "Address";
            case EDUCATION -> "Education";
            case CERTIFICATION -> "Certification";
            case SKILL -> "Skill";
            case DOCUMENT -> "Document";
        };
    }

    private static String formatStatus(RequestStatus status) {
        if (status == null) return null;
        return switch (status) {
            case PENDING -> "Pending";
            case UNDER_REVIEW -> "Under Review";
            case APPROVED -> "Approved";
            case REJECTED -> "Rejected";
            case AUTO_APPROVED -> "Auto-Approved";
            case CANCELLED -> "Cancelled";
        };
    }
}
