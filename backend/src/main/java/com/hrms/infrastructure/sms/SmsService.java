package com.hrms.infrastructure.sms;

import java.util.Map;

/**
 * Interface for SMS operations
 * Provides abstraction for different SMS provider implementations
 */
public interface SmsService {

    /**
     * Send a simple SMS message
     *
     * @param phoneNumber Recipient phone number in E.164 format (e.g., +1234567890)
     * @param message     Message content
     * @return Message ID from the SMS provider
     */
    String sendSms(String phoneNumber, String message);

    /**
     * Send an SMS using a predefined template
     *
     * @param phoneNumber Recipient phone number in E.164 format
     * @param templateId  Template identifier
     * @param variables   Map of variable names to values for template replacement
     * @return Message ID from the SMS provider
     */
    String sendTemplatedSms(String phoneNumber, String templateId, Map<String, String> variables);

    /**
     * Send bulk SMS to multiple recipients
     *
     * @param phoneNumbers Array of recipient phone numbers
     * @param message      Message content
     * @return Map of phone numbers to message IDs
     */
    Map<String, String> sendBulkSms(String[] phoneNumbers, String message);

    /**
     * Check the delivery status of a sent message
     *
     * @param messageId Message ID returned from sendSms
     * @return Delivery status (SENT, DELIVERED, FAILED, etc.)
     */
    SmsStatus getMessageStatus(String messageId);

    /**
     * Validate if the SMS service is properly configured and operational
     *
     * @return true if service is configured and can send messages
     */
    boolean isConfigured();

    /**
     * Test the SMS service by sending a test message
     *
     * @param phoneNumber Test recipient phone number
     * @return true if test message sent successfully
     */
    boolean testConnection(String phoneNumber);

    /**
     * SMS delivery status enumeration
     */
    enum SmsStatus {
        QUEUED,
        SENT,
        DELIVERED,
        FAILED,
        UNDELIVERED,
        UNKNOWN
    }
}
