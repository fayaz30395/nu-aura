package com.hrms.api.customfield.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Request DTO for setting a custom field value.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomFieldValueRequest {

    @NotNull(message = "Field definition ID is required")
    private UUID fieldDefinitionId;

    /**
     * The value - will be converted based on field type
     * For TEXT, EMAIL, PHONE, URL, DROPDOWN: string
     * For NUMBER, CURRENCY, PERCENTAGE: number as string
     * For DATE: ISO date string (yyyy-MM-dd)
     * For DATETIME: ISO datetime string
     * For CHECKBOX: "true" or "false"
     * For MULTI_SELECT: comma-separated values or JSON array
     */
    private String value;

    /**
     * For FILE fields: file reference/path
     */
    private String fileValue;

    /**
     * For FILE fields: original filename
     */
    private String fileName;

    /**
     * For FILE fields: file size in bytes
     */
    private Long fileSize;

    /**
     * For FILE fields: MIME type
     */
    private String fileMimeType;

    /**
     * For CURRENCY fields: currency code
     */
    private String currencyCode;
}
