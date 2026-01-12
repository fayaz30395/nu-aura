package com.hrms.api.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Response DTO for SMS notification operations.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsNotificationResponse {

    /**
     * Whether the SMS was sent successfully
     */
    private boolean success;

    /**
     * Twilio message SID (or mock SID in mock mode)
     */
    private String messageSid;

    /**
     * Message status (QUEUED, SENT, DELIVERED, FAILED, etc.)
     */
    private String status;

    /**
     * Recipient phone number
     */
    private String toPhoneNumber;

    /**
     * Sender phone number
     */
    private String fromPhoneNumber;

    /**
     * Timestamp when the message was sent
     */
    private LocalDateTime sentAt;

    /**
     * Error message if failed
     */
    private String errorMessage;

    /**
     * Whether this was sent in mock mode
     */
    private boolean mockMode;

    public static SmsNotificationResponse success(String messageSid, String status, String toPhone, String fromPhone, boolean mockMode) {
        return SmsNotificationResponse.builder()
                .success(true)
                .messageSid(messageSid)
                .status(status)
                .toPhoneNumber(toPhone)
                .fromPhoneNumber(fromPhone)
                .sentAt(LocalDateTime.now())
                .mockMode(mockMode)
                .build();
    }

    public static SmsNotificationResponse failure(String errorMessage, String toPhone) {
        return SmsNotificationResponse.builder()
                .success(false)
                .status("FAILED")
                .toPhoneNumber(toPhone)
                .errorMessage(errorMessage)
                .sentAt(LocalDateTime.now())
                .build();
    }
}
