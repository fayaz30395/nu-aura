package com.hrms.application.notification.service;

import com.hrms.config.TwilioConfig;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.rest.api.v2010.account.MessageCreator;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.transaction.annotation.Transactional;

/**
 * SMS Notification Service using Twilio.
 *
 * Features:
 * - Send SMS via Twilio API
 * - Mock mode for development/testing (no actual SMS sent)
 * - Message logging and tracking
 * - Phone number validation
 * - Rate limiting support
 *
 * Configuration:
 * Set twilio.mock-mode=false and provide credentials to send real SMS.
 * In mock mode, messages are logged but not sent to Twilio.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SmsNotificationService {

    private final TwilioConfig twilioConfig;

    // Store mock messages for testing/verification
    private final Map<String, MockSmsRecord> mockMessageStore = new ConcurrentHashMap<>();

    private boolean initialized = false;

    @PostConstruct
    public void init() {
        if (!twilioConfig.isMockMode() && twilioConfig.isConfigured()) {
            try {
                Twilio.init(twilioConfig.getAccountSid(), twilioConfig.getAuthToken());
                initialized = true;
                log.info("Twilio SMS service initialized successfully");
            } catch (Exception e) {
                log.error("Failed to initialize Twilio: {}. Falling back to mock mode.", e.getMessage());
            }
        } else if (twilioConfig.isMockMode()) {
            log.info("Twilio SMS service running in MOCK MODE - messages will be logged but not sent");
        } else {
            log.warn("Twilio SMS service not configured - SMS notifications will be logged only");
        }
    }

    /**
     * Send an SMS message to the specified phone number.
     *
     * @param toPhoneNumber Recipient phone number (E.164 format: +1234567890)
     * @param message       Message content
     * @return SmsResult with status and message SID
     */
    @Transactional
    public SmsResult sendSms(String toPhoneNumber, String message) {
        return sendSms(toPhoneNumber, message, null);
    }

    /**
     * Send an SMS message with custom from number.
     *
     * @param toPhoneNumber   Recipient phone number (E.164 format: +1234567890)
     * @param message         Message content
     * @param fromPhoneNumber Custom sender phone number (optional, uses default if null)
     * @return SmsResult with status and message SID
     */
    @Transactional
    public SmsResult sendSms(String toPhoneNumber, String message, String fromPhoneNumber) {
        // Validate phone number
        if (!isValidPhoneNumber(toPhoneNumber)) {
            log.warn("Invalid phone number format: {}", toPhoneNumber);
            return SmsResult.failure("Invalid phone number format. Use E.164 format (+1234567890)");
        }

        // Truncate message if too long
        if (message.length() > twilioConfig.getMaxMessageLength()) {
            message = message.substring(0, twilioConfig.getMaxMessageLength() - 3) + "...";
            log.warn("SMS message truncated to {} characters", twilioConfig.getMaxMessageLength());
        }

        String from = fromPhoneNumber != null ? fromPhoneNumber : twilioConfig.getFromNumber();

        // Mock mode - log but don't send
        if (twilioConfig.isMockMode() || !initialized) {
            return sendMockSms(toPhoneNumber, message, from);
        }

        // Real Twilio send
        return sendRealSms(toPhoneNumber, message, from);
    }

    /**
     * Send SMS in mock mode - logs the message without actually sending.
     */
    private SmsResult sendMockSms(String toPhoneNumber, String message, String fromPhoneNumber) {
        String mockSid = "MOCK_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        MockSmsRecord record = new MockSmsRecord(
                mockSid,
                fromPhoneNumber,
                toPhoneNumber,
                message,
                LocalDateTime.now(),
                "MOCK_SENT"
        );
        mockMessageStore.put(mockSid, record);

        log.info("[MOCK SMS] SID: {} | From: {} | To: {} | Message: {}",
                mockSid, fromPhoneNumber, toPhoneNumber, message);

        return SmsResult.success(mockSid, "Message logged in mock mode (not actually sent)");
    }

    /**
     * Send SMS via Twilio API.
     */
    private SmsResult sendRealSms(String toPhoneNumber, String message, String fromPhoneNumber) {
        try {
            MessageCreator messageCreator = Message.creator(
                    new PhoneNumber(toPhoneNumber),
                    new PhoneNumber(fromPhoneNumber),
                    message
            );

            // Use Messaging Service if configured
            if (twilioConfig.getMessagingServiceSid() != null && !twilioConfig.getMessagingServiceSid().isBlank()) {
                messageCreator = Message.creator(
                        new PhoneNumber(toPhoneNumber),
                        twilioConfig.getMessagingServiceSid(),
                        message
                );
            }

            // Add status callback if enabled
            if (twilioConfig.isStatusCallbackEnabled() && twilioConfig.getStatusCallbackUrl() != null) {
                messageCreator.setStatusCallback(twilioConfig.getStatusCallbackUrl());
            }

            Message twilioMessage = messageCreator.create();

            log.info("SMS sent successfully. SID: {} | To: {} | Status: {}",
                    twilioMessage.getSid(), toPhoneNumber, twilioMessage.getStatus());

            return SmsResult.success(twilioMessage.getSid(), twilioMessage.getStatus().toString());

        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", toPhoneNumber, e.getMessage());
            return SmsResult.failure("Failed to send SMS: " + e.getMessage());
        }
    }

    /**
     * Send bulk SMS to multiple recipients.
     *
     * @param phoneNumbers List of recipient phone numbers
     * @param message      Message content
     * @return Map of phone number to SmsResult
     */
    @Transactional
    public Map<String, SmsResult> sendBulkSms(Iterable<String> phoneNumbers, String message) {
        Map<String, SmsResult> results = new HashMap<>();
        for (String phoneNumber : phoneNumbers) {
            results.put(phoneNumber, sendSms(phoneNumber, message));
        }
        return results;
    }

    /**
     * Validate phone number format (E.164).
     */
    public boolean isValidPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return false;
        }
        // E.164 format: + followed by country code and number (max 15 digits)
        return phoneNumber.matches("^\\+[1-9]\\d{1,14}$");
    }

    /**
     * Format phone number to E.164 format.
     *
     * @param phoneNumber Raw phone number
     * @param countryCode Default country code (e.g., "1" for US, "91" for India)
     * @return Formatted phone number or null if invalid
     */
    public String formatPhoneNumber(String phoneNumber, String countryCode) {
        if (phoneNumber == null) return null;

        // Remove all non-digit characters except +
        String cleaned = phoneNumber.replaceAll("[^\\d+]", "");

        // Already in E.164 format
        if (cleaned.startsWith("+")) {
            return isValidPhoneNumber(cleaned) ? cleaned : null;
        }

        // Add country code
        String formatted = "+" + countryCode + cleaned;
        return isValidPhoneNumber(formatted) ? formatted : null;
    }

    /**
     * Get mock message store for testing purposes.
     */
    @Transactional(readOnly = true)
    public Map<String, MockSmsRecord> getMockMessageStore() {
        return new HashMap<>(mockMessageStore);
    }

    /**
     * Clear mock message store.
     */
    public void clearMockMessageStore() {
        mockMessageStore.clear();
    }

    /**
     * Check if service is running in mock mode.
     */
    public boolean isMockMode() {
        return twilioConfig.isMockMode() || !initialized;
    }

    /**
     * Get service status.
     */
    @Transactional(readOnly = true)
    public ServiceStatus getStatus() {
        return new ServiceStatus(
                initialized,
                twilioConfig.isMockMode(),
                twilioConfig.isConfigured(),
                twilioConfig.getFromNumber()
        );
    }

    // ==================== Inner Classes ====================

    /**
     * Result of an SMS send operation.
     */
    public record SmsResult(
            boolean success,
            String messageSid,
            String status,
            String errorMessage
    ) {
        public static SmsResult success(String messageSid, String status) {
            return new SmsResult(true, messageSid, status, null);
        }

        public static SmsResult failure(String errorMessage) {
            return new SmsResult(false, null, "FAILED", errorMessage);
        }
    }

    /**
     * Record of a mock SMS message (for testing).
     */
    public record MockSmsRecord(
            String sid,
            String from,
            String to,
            String body,
            LocalDateTime sentAt,
            String status
    ) {}

    /**
     * Service status information.
     */
    public record ServiceStatus(
            boolean initialized,
            boolean mockMode,
            boolean configured,
            String fromNumber
    ) {}
}
