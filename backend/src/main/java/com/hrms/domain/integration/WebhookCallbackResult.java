package com.hrms.domain.integration;

import java.util.Map;

/**
 * Immutable record representing the result of webhook callback processing.
 *
 * <p>Returned by {@link IntegrationConnector#handleWebhookCallback(String, Map, String)}
 * to indicate whether the webhook was successfully processed.</p>
 */
public record WebhookCallbackResult(
    /**
     * Whether the webhook callback was successfully processed.
     */
    boolean success,

    /**
     * Human-readable message describing the processing result.
     */
    String message,

    /**
     * Optional response data to return to the webhook sender.
     * May include acknowledgment tokens, next steps, or error details.
     */
    Map<String, Object> data
) {

    /**
     * Validates that required fields are non-null.
     */
    public WebhookCallbackResult {
        if (message == null) {
            throw new IllegalArgumentException("message cannot be null");
        }
        if (data == null) {
            throw new IllegalArgumentException("data cannot be null");
        }
    }

    /**
     * Factory method for a successful webhook callback result.
     */
    public static WebhookCallbackResult success(String message, Map<String, Object> data) {
        return new WebhookCallbackResult(true, message, data);
    }

    /**
     * Factory method for a failed webhook callback result.
     */
    public static WebhookCallbackResult failure(String message, Map<String, Object> data) {
        return new WebhookCallbackResult(false, message, data);
    }
}
