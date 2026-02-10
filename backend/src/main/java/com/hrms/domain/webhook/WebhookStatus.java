package com.hrms.domain.webhook;

/**
 * Status of a webhook subscription.
 */
public enum WebhookStatus {
    /**
     * Webhook is active and receiving events.
     */
    ACTIVE,

    /**
     * Webhook is paused by the user.
     */
    PAUSED,

    /**
     * Webhook was disabled due to too many consecutive failures.
     */
    DISABLED_FAILURES,

    /**
     * Webhook has been deleted (soft delete).
     */
    DELETED
}
