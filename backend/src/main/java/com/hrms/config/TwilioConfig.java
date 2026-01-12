package com.hrms.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for Twilio SMS integration.
 *
 * When mock mode is enabled, SMS messages are logged instead of being sent via Twilio.
 * This is useful for development and testing without incurring Twilio charges.
 */
@Configuration
@ConfigurationProperties(prefix = "twilio")
@Getter
@Setter
public class TwilioConfig {

    /**
     * Twilio Account SID - found in Twilio Console
     */
    private String accountSid;

    /**
     * Twilio Auth Token - found in Twilio Console
     */
    private String authToken;

    /**
     * Default "from" phone number (must be a Twilio-verified number)
     * Format: +1234567890
     */
    private String fromNumber;

    /**
     * Enable mock mode for development/testing.
     * When true, SMS messages are logged instead of sent.
     */
    private boolean mockMode = true;

    /**
     * Messaging Service SID (optional, for Twilio Messaging Services)
     */
    private String messagingServiceSid;

    /**
     * Maximum message length before splitting into multiple segments
     */
    private int maxMessageLength = 1600;

    /**
     * Enable delivery status callbacks
     */
    private boolean statusCallbackEnabled = false;

    /**
     * URL for delivery status callbacks
     */
    private String statusCallbackUrl;

    /**
     * Check if Twilio is properly configured
     */
    public boolean isConfigured() {
        return accountSid != null && !accountSid.isBlank()
                && authToken != null && !authToken.isBlank()
                && fromNumber != null && !fromNumber.isBlank();
    }
}
