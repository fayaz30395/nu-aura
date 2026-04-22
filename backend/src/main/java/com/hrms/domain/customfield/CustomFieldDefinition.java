package com.hrms.domain.customfield;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Defines the schema for a custom field.
 * Custom fields allow organizations to extend entity data with their own attributes.
 */
@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "custom_field_definitions", indexes = {
        @Index(name = "idx_cfd_tenant", columnList = "tenantId"),
        @Index(name = "idx_cfd_entity_type", columnList = "entityType"),
        @Index(name = "idx_cfd_code_tenant", columnList = "fieldCode,tenantId", unique = true),
        @Index(name = "idx_cfd_group", columnList = "fieldGroup"),
        @Index(name = "idx_cfd_active", columnList = "isActive")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CustomFieldDefinition extends TenantAware {

    /**
     * Unique code for the field within the tenant (e.g., "blood_group", "emergency_contact_relation")
     */
    @Column(nullable = false, length = 100)
    private String fieldCode;

    /**
     * Display name shown to users
     */
    @Column(nullable = false, length = 200)
    private String fieldName;

    /**
     * Optional description/help text
     */
    @Column(length = 500)
    private String description;

    /**
     * Which entity this field applies to
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private EntityType entityType;

    /**
     * Data type of the field
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private FieldType fieldType;

    /**
     * Group/section for organizing fields (e.g., "Personal", "Emergency Contact", "Custom")
     */
    @Column(length = 100)
    private String fieldGroup;

    /**
     * Order within the group for display purposes
     */
    @Column(nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    /**
     * Whether the field is required
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isRequired = false;

    /**
     * Whether the field is active (soft delete)
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    /**
     * Whether the field is searchable in queries
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean isSearchable = false;

    /**
     * Whether to show in list/table views
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean showInList = false;

    /**
     * Default value for the field (stored as string, converted based on fieldType)
     */
    @Column(length = 1000)
    private String defaultValue;

    /**
     * Placeholder text for input fields
     */
    @Column(length = 200)
    private String placeholder;

    /**
     * For DROPDOWN/MULTI_SELECT: comma-separated options or JSON array
     * Example: "Option1,Option2,Option3" or ["Option1","Option2","Option3"]
     */
    @Column(columnDefinition = "TEXT")
    private String options;

    /**
     * Validation rules as JSON
     * Example: {"minLength": 5, "maxLength": 100, "pattern": "^[A-Z]+$"}
     */
    @Column(columnDefinition = "TEXT")
    private String validationRules;

    /**
     * For NUMBER fields: minimum value
     */
    private Double minValue;

    /**
     * For NUMBER fields: maximum value
     */
    private Double maxValue;

    /**
     * For TEXT fields: minimum length
     */
    private Integer minLength;

    /**
     * For TEXT fields: maximum length
     */
    private Integer maxLength;

    /**
     * For FILE fields: allowed file extensions (comma-separated)
     * Example: "pdf,doc,docx"
     */
    @Column(length = 200)
    private String allowedFileTypes;

    /**
     * For FILE fields: maximum file size in bytes
     */
    private Long maxFileSize;

    /**
     * Who can view this field
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private FieldVisibility viewVisibility = FieldVisibility.ALL;

    /**
     * Who can edit this field
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    @Builder.Default
    private FieldVisibility editVisibility = FieldVisibility.ADMIN_HR;

    /**
     * Get options as a list (parses comma-separated or JSON array)
     */
    public List<String> getOptionsList() {
        if (options == null || options.isBlank()) {
            return new ArrayList<>();
        }
        // Simple comma-separated parsing
        String[] parts = options.split(",");
        List<String> result = new ArrayList<>();
        for (String part : parts) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    /**
     * Entity types that can have custom fields
     */
    public enum EntityType {
        EMPLOYEE,
        DEPARTMENT,
        PROJECT,
        LEAVE_REQUEST,
        EXPENSE,
        ASSET,
        JOB_OPENING,
        CANDIDATE
    }

    /**
     * Supported field types
     */
    public enum FieldType {
        TEXT,           // Single line text
        TEXTAREA,       // Multi-line text
        NUMBER,         // Numeric value (integer or decimal)
        DATE,           // Date picker
        DATETIME,       // Date and time picker
        DROPDOWN,       // Single select from options
        MULTI_SELECT,   // Multiple select from options
        CHECKBOX,       // Boolean yes/no
        EMAIL,          // Email with validation
        PHONE,          // Phone number
        URL,            // URL with validation
        FILE,           // File attachment
        CURRENCY,       // Money value with currency
        PERCENTAGE      // Percentage value
    }

    /**
     * Field visibility levels
     */
    public enum FieldVisibility {
        ALL,            // Everyone can see/edit
        SELF,           // Only the employee themselves
        MANAGER,        // Manager and above
        HR,             // HR team only
        ADMIN_HR,       // Admin and HR only
        ADMIN_ONLY      // Only system admins
    }
}
