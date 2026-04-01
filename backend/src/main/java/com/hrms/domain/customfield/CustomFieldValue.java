package com.hrms.domain.customfield;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Stores the actual value of a custom field for a specific entity instance.
 */
@Where(clause = "is_deleted = false")
@Entity
@Table(name = "custom_field_values", indexes = {
    @Index(name = "idx_cfv_tenant", columnList = "tenantId"),
    @Index(name = "idx_cfv_definition", columnList = "fieldDefinitionId"),
    @Index(name = "idx_cfv_entity", columnList = "entityType,entityId"),
    @Index(name = "idx_cfv_definition_entity", columnList = "fieldDefinitionId,entityId", unique = true)
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class CustomFieldValue extends TenantAware {

    /**
     * Reference to the field definition
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fieldDefinitionId", nullable = false)
    private CustomFieldDefinition fieldDefinition;

    /**
     * The type of entity this value belongs to (denormalized for queries)
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private CustomFieldDefinition.EntityType entityType;

    /**
     * The ID of the entity this value belongs to (e.g., employee ID)
     */
    @Column(nullable = false)
    private UUID entityId;

    /**
     * String value - used for TEXT, TEXTAREA, EMAIL, PHONE, URL, DROPDOWN
     */
    @Column(columnDefinition = "TEXT")
    private String textValue;

    /**
     * Numeric value - used for NUMBER, CURRENCY, PERCENTAGE
     */
    @Column(precision = 19, scale = 4)
    private BigDecimal numberValue;

    /**
     * Date value - used for DATE
     */
    private LocalDate dateValue;

    /**
     * DateTime value - used for DATETIME
     */
    private LocalDateTime dateTimeValue;

    /**
     * Boolean value - used for CHECKBOX
     */
    private Boolean booleanValue;

    /**
     * For MULTI_SELECT: stores selected values as comma-separated or JSON array
     */
    @Column(columnDefinition = "TEXT")
    private String multiSelectValue;

    /**
     * For FILE: stores the file reference/path/URL
     */
    @Column(length = 500)
    private String fileValue;

    /**
     * For FILE: original filename
     */
    @Column(length = 255)
    private String fileName;

    /**
     * For FILE: file size in bytes
     */
    private Long fileSize;

    /**
     * For FILE: MIME type
     */
    @Column(length = 100)
    private String fileMimeType;

    /**
     * For CURRENCY: currency code (e.g., USD, INR)
     */
    @Column(length = 3)
    private String currencyCode;

    /**
     * Get the value based on field type
     */
    public Object getValue() {
        if (fieldDefinition == null) {
            return textValue; // Default to text
        }

        return switch (fieldDefinition.getFieldType()) {
            case TEXT, TEXTAREA, EMAIL, PHONE, URL, DROPDOWN -> textValue;
            case NUMBER, CURRENCY, PERCENTAGE -> numberValue;
            case DATE -> dateValue;
            case DATETIME -> dateTimeValue;
            case CHECKBOX -> booleanValue;
            case MULTI_SELECT -> multiSelectValue;
            case FILE -> fileValue;
        };
    }

    /**
     * Set the value based on field type
     */
    public void setValue(Object value) {
        if (value == null) {
            clearAllValues();
            return;
        }

        if (fieldDefinition == null) {
            this.textValue = value.toString();
            return;
        }

        switch (fieldDefinition.getFieldType()) {
            case TEXT, TEXTAREA, EMAIL, PHONE, URL, DROPDOWN -> this.textValue = value.toString();
            case NUMBER, CURRENCY, PERCENTAGE -> {
                if (value instanceof BigDecimal bd) {
                    this.numberValue = bd;
                } else if (value instanceof Number num) {
                    this.numberValue = BigDecimal.valueOf(num.doubleValue());
                } else {
                    this.numberValue = new BigDecimal(value.toString());
                }
            }
            case DATE -> {
                if (value instanceof LocalDate ld) {
                    this.dateValue = ld;
                } else {
                    this.dateValue = LocalDate.parse(value.toString());
                }
            }
            case DATETIME -> {
                if (value instanceof LocalDateTime ldt) {
                    this.dateTimeValue = ldt;
                } else {
                    this.dateTimeValue = LocalDateTime.parse(value.toString());
                }
            }
            case CHECKBOX -> {
                if (value instanceof Boolean b) {
                    this.booleanValue = b;
                } else {
                    this.booleanValue = Boolean.parseBoolean(value.toString());
                }
            }
            case MULTI_SELECT -> this.multiSelectValue = value.toString();
            case FILE -> this.fileValue = value.toString();
        }
    }

    /**
     * Clear all value fields
     */
    private void clearAllValues() {
        this.textValue = null;
        this.numberValue = null;
        this.dateValue = null;
        this.dateTimeValue = null;
        this.booleanValue = null;
        this.multiSelectValue = null;
        this.fileValue = null;
        this.fileName = null;
        this.fileSize = null;
        this.fileMimeType = null;
    }

    /**
     * Check if this field has a value
     */
    public boolean hasValue() {
        return textValue != null || numberValue != null || dateValue != null ||
               dateTimeValue != null || booleanValue != null || multiSelectValue != null ||
               fileValue != null;
    }

    /**
     * Get value as string for display purposes
     */
    public String getDisplayValue() {
        Object value = getValue();
        if (value == null) {
            return "";
        }
        if (value instanceof Boolean b) {
            return b ? "Yes" : "No";
        }
        return value.toString();
    }
}
