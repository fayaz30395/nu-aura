package com.hrms.api.selfservice.dto;

import com.hrms.domain.selfservice.DocumentRequest;
import com.hrms.domain.selfservice.DocumentRequest.DeliveryMode;
import com.hrms.domain.selfservice.DocumentRequest.DocumentType;
import com.hrms.domain.selfservice.DocumentRequest.RequestStatus;
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
@Builder
public class DocumentRequestResponse {

    private UUID id;
    private UUID employeeId;
    private String employeeName;
    private String employeeEmail;

    private DocumentType documentType;
    private String documentTypeDisplayName;
    private String purpose;
    private String addressedTo;
    private LocalDate requiredByDate;

    private RequestStatus status;
    private String statusDisplayName;

    private DeliveryMode deliveryMode;
    private String deliveryAddress;

    private UUID processedBy;
    private String processedByName;
    private LocalDateTime processedAt;
    private String processingNotes;

    private String generatedDocumentUrl;
    private LocalDateTime documentGeneratedAt;

    private String rejectionReason;
    private Integer priority;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DocumentRequestResponse fromEntity(DocumentRequest entity) {
        return DocumentRequestResponse.builder()
                .id(entity.getId())
                .employeeId(entity.getEmployeeId())
                .documentType(entity.getDocumentType())
                .documentTypeDisplayName(formatDocumentType(entity.getDocumentType()))
                .purpose(entity.getPurpose())
                .addressedTo(entity.getAddressedTo())
                .requiredByDate(entity.getRequiredByDate())
                .status(entity.getStatus())
                .statusDisplayName(formatStatus(entity.getStatus()))
                .deliveryMode(entity.getDeliveryMode())
                .deliveryAddress(entity.getDeliveryAddress())
                .processedBy(entity.getProcessedBy())
                .processedAt(entity.getProcessedAt())
                .processingNotes(entity.getProcessingNotes())
                .generatedDocumentUrl(entity.getGeneratedDocumentUrl())
                .documentGeneratedAt(entity.getDocumentGeneratedAt())
                .rejectionReason(entity.getRejectionReason())
                .priority(entity.getPriority())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private static String formatDocumentType(DocumentType type) {
        if (type == null) return null;
        return switch (type) {
            case EMPLOYMENT_CERTIFICATE -> "Employment Certificate";
            case SALARY_CERTIFICATE -> "Salary Certificate";
            case EXPERIENCE_LETTER -> "Experience Letter";
            case RELIEVING_LETTER -> "Relieving Letter";
            case BONAFIDE_CERTIFICATE -> "Bonafide Certificate";
            case ADDRESS_PROOF_LETTER -> "Address Proof Letter";
            case VISA_LETTER -> "Visa Support Letter";
            case BANK_LETTER -> "Bank Letter";
            case SALARY_SLIP -> "Salary Slip";
            case FORM_16 -> "Form 16";
            case APPOINTMENT_LETTER_COPY -> "Appointment Letter Copy";
            case CUSTOM -> "Custom Document";
        };
    }

    private static String formatStatus(RequestStatus status) {
        if (status == null) return null;
        return switch (status) {
            case PENDING -> "Pending";
            case IN_PROGRESS -> "In Progress";
            case GENERATED -> "Generated";
            case DELIVERED -> "Delivered";
            case REJECTED -> "Rejected";
            case CANCELLED -> "Cancelled";
        };
    }
}
