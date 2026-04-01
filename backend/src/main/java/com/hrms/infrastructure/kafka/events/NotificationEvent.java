package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.Map;
import java.util.UUID;

/**
 * Event published to send notifications via multiple channels: EMAIL, PUSH, IN_APP.
 *
 * <p>Decouples notification requests from the notification delivery service,
 * allowing async, scalable processing with retry logic and template support.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class NotificationEvent extends BaseKafkaEvent {

    /**
     * Recipient user ID who will receive this notification.
     */
    @JsonProperty("recipient_id")
    private UUID recipientId;

    /**
     * Notification channel: EMAIL, PUSH, IN_APP, or SMS
     */
    @JsonProperty("channel")
    private String channel; // EMAIL, PUSH, IN_APP, SMS

    /**
     * Email subject or notification title.
     */
    @JsonProperty("subject")
    private String subject;

    /**
     * Notification body/content (for in-app) or email body.
     */
    @JsonProperty("body")
    private String body;

    /**
     * Email template name (e.g., "leave-approved", "expense-rejected", "onboarding-started")
     * Used to look up template and render with templateData.
     */
    @JsonProperty("template_name")
    private String templateName;

    /**
     * Data to render into the template (variables, values).
     * Example: {approverName: "John", leaveType: "Sick Leave", days: 3}
     */
    @JsonProperty("template_data")
    private Map<String, Object> templateData;

    /**
     * Priority level: HIGH, NORMAL, LOW (useful for SMS/push to rate-limit)
     */
    @JsonProperty("priority")
    private String priority; // HIGH, NORMAL, LOW

    /**
     * Related entity ID (e.g., leaveRequestId, expenseClaimId)
     * Used for tracking and linking notifications to business objects.
     */
    @JsonProperty("related_entity_id")
    private UUID relatedEntityId;

    /**
     * Type of entity: LEAVE_REQUEST, EXPENSE_CLAIM, ASSET_ASSIGNMENT, etc.
     */
    @JsonProperty("related_entity_type")
    private String relatedEntityType;

    /**
     * URL to include in the notification (e.g., deep link to approval workflow).
     */
    @JsonProperty("action_url")
    private String actionUrl;

    /**
     * Number of retry attempts already made (incremented by consumer).
     */
    @JsonProperty("retry_count")
    private Integer retryCount;

    /**
     * Maximum retry attempts before moving to DLT.
     */
    @JsonProperty("max_retries")
    private Integer maxRetries;
}
