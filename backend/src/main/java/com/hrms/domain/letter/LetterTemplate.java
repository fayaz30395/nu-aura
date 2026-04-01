package com.hrms.domain.letter;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "letter_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class LetterTemplate extends TenantAware {


    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LetterCategory category;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String templateContent;

    @Column(columnDefinition = "TEXT")
    private String headerHtml;

    @Column(columnDefinition = "TEXT")
    private String footerHtml;

    @Column(columnDefinition = "TEXT")
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

    @Builder.Default
    private Boolean isSystemTemplate = false;

    private Integer templateVersion;

    @Column(columnDefinition = "TEXT")
    private String availablePlaceholders;

    public enum LetterCategory {
        OFFER,
        APPOINTMENT,
        CONFIRMATION,
        PROMOTION,
        TRANSFER,
        SALARY_REVISION,
        WARNING,
        TERMINATION,
        RESIGNATION_ACCEPTANCE,
        EXPERIENCE,
        RELIEVING,
        SALARY_CERTIFICATE,
        EMPLOYMENT_CERTIFICATE,
        BONAFIDE,
        VISA_SUPPORT,
        BANK_LETTER,
        ADDRESS_PROOF,
        INTERNSHIP,
        TRAINING_COMPLETION,
        APPRECIATION,
        CUSTOM
    }

    // Common placeholders that can be used in templates
    public static final String PLACEHOLDER_EMPLOYEE_NAME = "{{employee.name}}";
    public static final String PLACEHOLDER_EMPLOYEE_ID = "{{employee.id}}";
    public static final String PLACEHOLDER_DESIGNATION = "{{employee.designation}}";
    public static final String PLACEHOLDER_DEPARTMENT = "{{employee.department}}";
    public static final String PLACEHOLDER_DATE_OF_JOINING = "{{employee.dateOfJoining}}";
    public static final String PLACEHOLDER_CURRENT_DATE = "{{currentDate}}";
    public static final String PLACEHOLDER_COMPANY_NAME = "{{company.name}}";
    public static final String PLACEHOLDER_SALARY = "{{employee.salary}}";
    public static final String PLACEHOLDER_LAST_WORKING_DAY = "{{employee.lastWorkingDay}}";
    public static final String PLACEHOLDER_REFERENCE_NUMBER = "{{letter.referenceNumber}}";
}
