package com.hrms.api.letter.dto;

import com.hrms.domain.letter.LetterTemplate;
import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class LetterTemplateResponse {

    private UUID id;
    private String name;
    private String code;
    private String description;

    private LetterCategory category;
    private String categoryDisplayName;

    private String templateContent;
    private String headerHtml;
    private String footerHtml;
    private String cssStyles;

    private Boolean includeCompanyLogo;
    private Boolean includeSignature;
    private String signatureTitle;
    private String signatoryName;
    private String signatoryDesignation;

    private Boolean requiresApproval;
    private Boolean isActive;
    private Boolean isSystemTemplate;

    private Integer version;
    private String availablePlaceholders;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static LetterTemplateResponse fromEntity(LetterTemplate entity) {
        return LetterTemplateResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .code(entity.getCode())
                .description(entity.getDescription())
                .category(entity.getCategory())
                .categoryDisplayName(formatCategory(entity.getCategory()))
                .templateContent(entity.getTemplateContent())
                .headerHtml(entity.getHeaderHtml())
                .footerHtml(entity.getFooterHtml())
                .cssStyles(entity.getCssStyles())
                .includeCompanyLogo(entity.getIncludeCompanyLogo())
                .includeSignature(entity.getIncludeSignature())
                .signatureTitle(entity.getSignatureTitle())
                .signatoryName(entity.getSignatoryName())
                .signatoryDesignation(entity.getSignatoryDesignation())
                .requiresApproval(entity.getRequiresApproval())
                .isActive(entity.getIsActive())
                .isSystemTemplate(entity.getIsSystemTemplate())
                .version(entity.getTemplateVersion())
                .availablePlaceholders(entity.getAvailablePlaceholders())
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
}
