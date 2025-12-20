package com.hrms.infrastructure.sms;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Mock implementation of SMS service for development/testing
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MockSmsService implements SmsService {

    private final SmsTemplate smsTemplate;

    @Value("${hrms.sms.enabled:false}")
    private boolean enabled;

    @Override
    public String sendSms(String phoneNumber, String message) {
        String messageId = "SMS_" + UUID.randomUUID().toString().substring(0, 8);
        log.info("[MOCK SMS] Sending to {}: {} (ID: {})", phoneNumber, message, messageId);
        return messageId;
    }

    @Override
    public String sendTemplatedSms(String phoneNumber, String templateId, Map<String, String> variables) {
        String message = smsTemplate.renderTemplate(templateId, variables);
        return sendSms(phoneNumber, message);
    }

    @Override
    public Map<String, String> sendBulkSms(String[] phoneNumbers, String message) {
        Map<String, String> results = new HashMap<>();
        for (String phoneNumber : phoneNumbers) {
            String messageId = sendSms(phoneNumber, message);
            results.put(phoneNumber, messageId);
        }
        return results;
    }

    @Override
    public SmsStatus getMessageStatus(String messageId) {
        log.info("[MOCK SMS] Getting status for message: {}", messageId);
        return SmsStatus.DELIVERED;
    }

    @Override
    public boolean isConfigured() {
        return enabled;
    }

    @Override
    public boolean testConnection(String phoneNumber) {
        log.info("[MOCK SMS] Testing connection with phone: {}", phoneNumber);
        sendSms(phoneNumber, "Test message from HRMS system");
        return true;
    }
}
