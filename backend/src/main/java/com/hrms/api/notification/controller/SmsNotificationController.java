package com.hrms.api.notification.controller;

import com.hrms.api.notification.dto.BulkSmsRequest;
import com.hrms.api.notification.dto.SmsNotificationRequest;
import com.hrms.api.notification.dto.SmsNotificationResponse;
import com.hrms.application.notification.service.SmsNotificationService;
import com.hrms.application.notification.service.SmsNotificationService.SmsResult;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.config.TwilioConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * REST controller for SMS notifications via Twilio.
 *
 * Supports:
 * - Single SMS sending
 * - Bulk SMS sending
 * - Service status check
 * - Phone number validation
 */
@RestController
@RequestMapping("/api/v1/notifications/sms")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "SMS Notifications", description = "Twilio SMS notification endpoints")
public class SmsNotificationController {

    private final SmsNotificationService smsNotificationService;
    private final TwilioConfig twilioConfig;

    @PostMapping("/send")
    @RequiresPermission(Permission.NOTIFICATION_CREATE)
    @Operation(summary = "Send SMS", description = "Send a single SMS notification")
    public ResponseEntity<SmsNotificationResponse> sendSms(
            @Valid @RequestBody SmsNotificationRequest request
    ) {
        log.info("Sending SMS to {}", request.getPhoneNumber());

        String message = request.getMessage();

        // Apply template variables if provided
        if (request.getTemplateVariables() != null) {
            for (Map.Entry<String, Object> entry : request.getTemplateVariables().entrySet()) {
                message = message.replace("{{" + entry.getKey() + "}}", String.valueOf(entry.getValue()));
            }
        }

        SmsResult result = smsNotificationService.sendSms(
                request.getPhoneNumber(),
                message,
                request.getFromNumber()
        );

        if (result.success()) {
            return ResponseEntity.ok(SmsNotificationResponse.success(
                    result.messageSid(),
                    result.status(),
                    request.getPhoneNumber(),
                    request.getFromNumber() != null ? request.getFromNumber() : twilioConfig.getFromNumber(),
                    smsNotificationService.isMockMode()
            ));
        } else {
            return ResponseEntity.badRequest().body(
                    SmsNotificationResponse.failure(result.errorMessage(), request.getPhoneNumber())
            );
        }
    }

    @PostMapping("/send-bulk")
    @RequiresPermission(Permission.NOTIFICATION_CREATE)
    @Operation(summary = "Send Bulk SMS", description = "Send SMS to multiple recipients")
    public ResponseEntity<List<SmsNotificationResponse>> sendBulkSms(
            @Valid @RequestBody BulkSmsRequest request
    ) {
        log.info("Sending bulk SMS to {} recipients", request.getPhoneNumbers().size());

        String message = request.getMessage();

        // Apply template variables if provided
        if (request.getTemplateVariables() != null) {
            for (Map.Entry<String, Object> entry : request.getTemplateVariables().entrySet()) {
                message = message.replace("{{" + entry.getKey() + "}}", String.valueOf(entry.getValue()));
            }
        }

        Map<String, SmsResult> results = smsNotificationService.sendBulkSms(request.getPhoneNumbers(), message);

        List<SmsNotificationResponse> responses = new ArrayList<>();
        for (Map.Entry<String, SmsResult> entry : results.entrySet()) {
            SmsResult result = entry.getValue();
            if (result.success()) {
                responses.add(SmsNotificationResponse.success(
                        result.messageSid(),
                        result.status(),
                        entry.getKey(),
                        twilioConfig.getFromNumber(),
                        smsNotificationService.isMockMode()
                ));
            } else {
                responses.add(SmsNotificationResponse.failure(result.errorMessage(), entry.getKey()));
            }
        }

        return ResponseEntity.ok(responses);
    }

    @GetMapping("/status")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Get SMS Service Status", description = "Check Twilio SMS service configuration and status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        SmsNotificationService.ServiceStatus status = smsNotificationService.getStatus();

        return ResponseEntity.ok(Map.of(
                "initialized", status.initialized(),
                "mockMode", status.mockMode(),
                "configured", status.configured(),
                "fromNumber", status.fromNumber() != null ? maskPhoneNumber(status.fromNumber()) : "Not configured",
                "provider", "Twilio",
                "message", status.mockMode()
                        ? "Running in mock mode - SMS messages will be logged but not sent"
                        : (status.initialized() ? "Twilio SMS service is active" : "Twilio not configured - using mock mode")
        ));
    }

    @PostMapping("/validate-number")
    @RequiresPermission(Permission.NOTIFICATION_MANAGE)
    @Operation(summary = "Validate Phone Number", description = "Validate phone number format")
    public ResponseEntity<Map<String, Object>> validatePhoneNumber(
            @RequestParam String phoneNumber,
            @RequestParam(required = false, defaultValue = "1") String countryCode
    ) {
        boolean isValid = smsNotificationService.isValidPhoneNumber(phoneNumber);
        String formatted;

        if (!isValid) {
            formatted = smsNotificationService.formatPhoneNumber(phoneNumber, countryCode);
            isValid = formatted != null;
        } else {
            formatted = phoneNumber;
        }

        return ResponseEntity.ok(Map.of(
                "original", phoneNumber,
                "formatted", formatted != null ? formatted : "Invalid",
                "valid", isValid,
                "format", "E.164 (+1234567890)"
        ));
    }

    /**
     * Mask phone number for display (show only last 4 digits)
     */
    private String maskPhoneNumber(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.length() < 4) {
            return "****";
        }
        return "*".repeat(phoneNumber.length() - 4) + phoneNumber.substring(phoneNumber.length() - 4);
    }
}
