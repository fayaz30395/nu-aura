package com.hrms.api.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Request DTO for sending bulk SMS notifications.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkSmsRequest {

    /**
     * List of recipient phone numbers in E.164 format
     */
    @NotEmpty(message = "At least one phone number is required")
    private List<String> phoneNumbers;

    /**
     * SMS message content
     */
    @NotBlank(message = "Message is required")
    private String message;

    /**
     * Optional template code
     */
    private String templateCode;

    /**
     * Template variables (applied to all messages)
     */
    private Map<String, Object> templateVariables;

    /**
     * Reference type for tracking
     */
    private String referenceType;

    /**
     * Reference ID for tracking
     */
    private String referenceId;
}
