package com.hrms.common.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration properties for workflow escalation scheduler.
 *
 * <p>Configure via application.yml:</p>
 * <pre>
 * app:
 *   workflow:
 *     escalation:
 *       enabled: true
 *       cron: "0 15 * * * *"
 *       reminder-hours-before-deadline: 4
 *       max-reminders: 3
 *       min-hours-between-reminders: 4
 * </pre>
 *
 * <p>P0 Stabilization: Ensures approval workflows don't get stuck.</p>
 */
@Configuration
@ConfigurationProperties(prefix = "app.workflow.escalation")
@Data
public class WorkflowEscalationConfig {

    /**
     * Enable/disable the escalation scheduler.
     */
    private boolean enabled = true;

    /**
     * Cron expression for the escalation job.
     * Default: Every hour at minute 15.
     */
    private String cron = "0 15 * * * *";

    /**
     * Hours before deadline to send first reminder.
     */
    private int reminderHoursBeforeDeadline = 4;

    /**
     * Maximum number of reminders to send per approval step.
     */
    private int maxReminders = 3;

    /**
     * Minimum hours between reminder notifications.
     */
    private int minHoursBetweenReminders = 4;
}
