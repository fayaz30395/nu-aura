package com.hrms.api.notification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Request DTO for sending SMS notifications.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsNotificationRequest {

    /**
     * Recipient phone number in E.164 format (+1234567890)
     */
    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^\\+[1-9]\\d{1,14}$", message = "Phone number must be in E.164 format (+1234567890)")
    private String phoneNumber;

    /**
     * SMS message content
     */
    @NotBlank(message = "Message is required")
    private String message;

    /**
     * Optional template code (if using templates)
     */
    private String templateCode;

    /**
     * Template variables for message personalization
     */
    private Map<String, Object> templateVariables;

    /**
     * Optional custom sender number (overrides default)
     */
    private String fromNumber;

    /**
     * Reference type (e.g., LEAVE_REQUEST, ATTENDANCE, etc.)
     */
    private String referenceType;

    /**
     * Reference ID (e.g., leave request ID, employee ID)
     */
    private String referenceId;
}
