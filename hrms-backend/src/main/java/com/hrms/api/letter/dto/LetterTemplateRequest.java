package com.hrms.api.letter.dto;

import com.hrms.domain.letter.LetterTemplate.LetterCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LetterTemplateRequest {

    @NotBlank(message = "Template name is required")
    private String name;

    @NotBlank(message = "Template code is required")
    private String code;

    private String description;

    @NotNull(message = "Category is required")
    private LetterCategory category;

    @NotBlank(message = "Template content is required")
    private String templateContent;

    private String headerHtml;
    private String footerHtml;
    private String cssStyles;

    @Builder.Default
    private Boolean includeCompanyLogo = true;

    @Builder.Default
    private Boolean includeSignature = true;

    private String signatureTitle;
    private String signatoryName;
    private String signatoryDesignation;

    @Builder.Default
    private Boolean requiresApproval = true;

    @Builder.Default
    private Boolean isActive = true;

    private String availablePlaceholders;
}
