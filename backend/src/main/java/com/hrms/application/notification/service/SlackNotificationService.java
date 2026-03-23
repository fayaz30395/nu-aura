package com.hrms.application.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.resilience.CircuitBreaker;
import com.hrms.common.resilience.CircuitBreakerRegistry;
import com.hrms.common.security.TenantContext;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for sending notifications to Slack channels and users.
 * Supports incoming webhooks and Slack Web API.
 *
 * <p><strong>RESILIENCE:</strong> Uses circuit breaker pattern to prevent
 * cascading failures when Slack API is unavailable.</p>
 */
@Service
@Slf4j
public class SlackNotificationService {

    private final CircuitBreaker circuitBreaker;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${app.slack.webhook-url:}")
    private String defaultWebhookUrl;

    @Value("${app.slack.bot-token:}")
    private String botToken;

    @Value("${app.slack.enabled:false}")
    private boolean slackEnabled;

    @Value("${app.slack.default-channel:#hrms-notifications}")
    private String defaultChannel;

    private static final String SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

    public SlackNotificationService(CircuitBreakerRegistry circuitBreakerRegistry, ObjectMapper objectMapper) {
        this.circuitBreaker = circuitBreakerRegistry.forSlack();
        this.objectMapper = objectMapper;
    }

    /**
     * Send a simple text message to the default channel via webhook.
     */
    @Async
    @Transactional
    public void sendMessage(String message) {
        sendToWebhook(defaultWebhookUrl, message, null, null);
    }

    /**
     * Send a message with optional attachments to the default channel via webhook.
     */
    @Async
    @Transactional
    public void sendMessage(String message, List<SlackAttachment> attachments) {
        sendToWebhook(defaultWebhookUrl, message, attachments, null);
    }

    /**
     * Send a message to a specific webhook URL.
     * Uses circuit breaker to prevent cascading failures.
     */
    @Async
    @Transactional
    public void sendToWebhook(String webhookUrl, String message,
                               List<SlackAttachment> attachments, List<SlackBlock> blocks) {
        if (!slackEnabled || webhookUrl == null || webhookUrl.isEmpty()) {
            log.debug("Slack notifications disabled or webhook not configured");
            return;
        }

        // Use circuit breaker to protect against Slack API failures
        circuitBreaker.execute(() -> {
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("text", message);

                if (attachments != null && !attachments.isEmpty()) {
                    payload.put("attachments", attachments);
                }

                if (blocks != null && !blocks.isEmpty()) {
                    payload.put("blocks", blocks);
                }

                String jsonPayload = objectMapper.writeValueAsString(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(webhookUrl))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200 || !"ok".equals(response.body())) {
                    log.error("Slack API error: status={} body={}", response.statusCode(), response.body());
                    throw new BusinessException("Failed to send Slack notification");
                }

                log.debug("Slack message sent successfully");
            } catch (IOException | InterruptedException e) {
                log.error("Error sending Slack message", e);
                throw new BusinessException("Failed to send Slack notification");
            }
        });
    }

    /**
     * Send a message to a specific channel using Slack Web API.
     */
    @Async
    @Transactional
    public void sendToChannel(String channel, String message, List<SlackBlock> blocks) {
        if (!slackEnabled || botToken == null || botToken.isEmpty()) {
            log.debug("Slack bot not configured");
            return;
        }

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("channel", channel != null ? channel : defaultChannel);
            payload.put("text", message);

            if (blocks != null && !blocks.isEmpty()) {
                payload.put("blocks", blocks);
            }

            String jsonPayload = objectMapper.writeValueAsString(payload);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(SLACK_POST_MESSAGE_URL))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("Authorization", "Bearer " + botToken)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<?, ?> responseBody = objectMapper.readValue(response.body(), Map.class);
                if (Boolean.TRUE.equals(responseBody.get("ok"))) {
                    log.debug("Slack message sent to channel: {}", channel);
                } else {
                    log.error("Slack API error: {}", responseBody.get("error"));
                }
            } else {
                log.error("Failed to send Slack message: {}", response.statusCode());
            }
        } catch (IOException | InterruptedException e) {
            log.error("Error sending Slack message to channel", e);
        }
    }

    /**
     * Send a direct message to a Slack user by their email.
     */
    @Async
    @Transactional
    public void sendDirectMessage(String userEmail, String message, List<SlackBlock> blocks) {
        if (!slackEnabled || botToken == null || botToken.isEmpty()) {
            log.debug("Slack bot not configured");
            return;
        }

        try {
            // First, look up user by email
            String userId = lookupUserByEmail(userEmail);
            if (userId == null) {
                log.warn("Could not find Slack user with email: {}", userEmail);
                return;
            }

            // Send message to user
            sendToChannel(userId, message, blocks);
        } catch (RuntimeException e) {
            log.error("Error sending Slack DM to {}", userEmail, e);
        }
    }

    /**
     * Look up a Slack user ID by their email address.
     */
    private String lookupUserByEmail(String email) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://slack.com/api/users.lookupByEmail?email=" + email))
                    .header("Authorization", "Bearer " + botToken)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<?, ?> responseBody = objectMapper.readValue(response.body(), Map.class);
                if (Boolean.TRUE.equals(responseBody.get("ok"))) {
                    Map<?, ?> user = (Map<?, ?>) responseBody.get("user");
                    return (String) user.get("id");
                }
            }
        } catch (IOException | InterruptedException e) {
            log.error("Error looking up Slack user", e);
        }
        return null;
    }

    // ==================== HRMS-Specific Notifications ====================

    /**
     * Notify about a new leave request submitted.
     */
    public void notifyLeaveRequestSubmitted(String employeeName, String leaveType,
                                             LocalDate startDate, LocalDate endDate, int days) {
        String message = String.format(":palm_tree: *Leave Request Submitted*\n" +
                "*Employee:* %s\n*Type:* %s\n*Period:* %s to %s (%d days)",
                employeeName, leaveType,
                startDate.format(DateTimeFormatter.ISO_DATE),
                endDate.format(DateTimeFormatter.ISO_DATE), days);

        List<SlackBlock> blocks = buildLeaveRequestBlocks(employeeName, leaveType,
                startDate, endDate, days, "Pending Approval", ":hourglass:");

        sendToChannel(defaultChannel, message, blocks);
    }

    /**
     * Notify a manager about a pending leave request for approval.
     */
    public void notifyManagerPendingLeave(String managerEmail, String employeeName,
                                           String leaveType, LocalDate startDate,
                                           LocalDate endDate, int days, String requestId) {
        String message = String.format(":inbox_tray: *Leave Request Pending Your Approval*\n" +
                "%s has requested %s leave from %s to %s (%d days)",
                employeeName, leaveType,
                startDate.format(DateTimeFormatter.ISO_DATE),
                endDate.format(DateTimeFormatter.ISO_DATE), days);

        List<SlackBlock> blocks = new ArrayList<>();
        blocks.add(SlackBlock.section("*Leave Request Pending Your Approval*"));
        blocks.add(SlackBlock.section(String.format(
                "*Employee:* %s\n*Leave Type:* %s\n*From:* %s\n*To:* %s\n*Days:* %d",
                employeeName, leaveType,
                startDate.format(DateTimeFormatter.ISO_DATE),
                endDate.format(DateTimeFormatter.ISO_DATE), days)));
        blocks.add(SlackBlock.divider());

        sendDirectMessage(managerEmail, message, blocks);
    }

    /**
     * Notify about leave request approval/rejection.
     */
    public void notifyLeaveRequestStatus(String employeeEmail, String leaveType,
                                          LocalDate startDate, LocalDate endDate,
                                          String status, String approverName, String comments) {
        String emoji = "APPROVED".equalsIgnoreCase(status) ? ":white_check_mark:" : ":x:";
        String message = String.format("%s *Leave Request %s*\n" +
                "*Type:* %s\n*Period:* %s to %s\n*By:* %s",
                emoji, status, leaveType,
                startDate.format(DateTimeFormatter.ISO_DATE),
                endDate.format(DateTimeFormatter.ISO_DATE), approverName);

        if (comments != null && !comments.isEmpty()) {
            message += String.format("\n*Comments:* %s", comments);
        }

        sendDirectMessage(employeeEmail, message, null);
    }

    /**
     * Notify about attendance check-in/check-out.
     */
    public void notifyAttendanceMarked(String employeeEmail, String type, String time, String location) {
        String emoji = "check-in".equalsIgnoreCase(type) ? ":clock9:" : ":clock5:";
        String message = String.format("%s *Attendance %s Recorded*\n*Time:* %s",
                emoji, type, time);
        if (location != null && !location.isEmpty()) {
            message += String.format("\n*Location:* %s", location);
        }

        sendDirectMessage(employeeEmail, message, null);
    }

    /**
     * Notify about payslip generation.
     */
    public void notifyPayslipGenerated(String employeeEmail, String month, String year, String downloadUrl) {
        String message = String.format(":moneybag: *Payslip Available*\n" +
                "Your payslip for %s %s is now available.\n" +
                "<%s|Click here to download>", month, year, downloadUrl);

        sendDirectMessage(employeeEmail, message, null);
    }

    /**
     * Notify about upcoming birthdays.
     */
    public void notifyUpcomingBirthday(String employeeName, LocalDate birthday) {
        String message = String.format(":birthday: *Birthday Celebration*\n" +
                "Please join us in wishing *%s* a very Happy Birthday today! :tada:",
                employeeName);

        sendToChannel(defaultChannel, message, null);
    }

    /**
     * Notify about work anniversary.
     */
    public void notifyWorkAnniversary(String employeeName, int years) {
        String message = String.format(":star2: *Work Anniversary*\n" +
                "Congratulations to *%s* on completing *%d year%s* with us! :clap:",
                employeeName, years, years > 1 ? "s" : "");

        sendToChannel(defaultChannel, message, null);
    }

    /**
     * Notify about a new employee joining.
     */
    public void notifyNewJoining(String employeeName, String department, String designation, LocalDate joiningDate) {
        String message = String.format(":wave: *Welcome New Team Member*\n" +
                "Please welcome *%s* who is joining us as *%s* in the *%s* department on %s!",
                employeeName, designation, department,
                joiningDate.format(DateTimeFormatter.ofPattern("MMMM dd, yyyy")));

        List<SlackBlock> blocks = new ArrayList<>();
        blocks.add(SlackBlock.section(":wave: *Welcome New Team Member*"));
        blocks.add(SlackBlock.section(String.format(
                "*Name:* %s\n*Department:* %s\n*Designation:* %s\n*Joining Date:* %s",
                employeeName, department, designation,
                joiningDate.format(DateTimeFormatter.ofPattern("MMMM dd, yyyy")))));

        sendToChannel(defaultChannel, message, blocks);
    }

    /**
     * Send a company-wide announcement.
     */
    @Transactional
    public void sendAnnouncement(String title, String content, String priority) {
        String emoji = "HIGH".equalsIgnoreCase(priority) ? ":rotating_light:" : ":loudspeaker:";
        String message = String.format("%s *%s*\n%s", emoji, title, content);

        List<SlackBlock> blocks = new ArrayList<>();
        blocks.add(SlackBlock.header(emoji + " " + title));
        blocks.add(SlackBlock.section(content));
        blocks.add(SlackBlock.context("Posted by HRMS • " +
                LocalDate.now().format(DateTimeFormatter.ofPattern("MMM dd, yyyy"))));

        sendToChannel(defaultChannel, message, blocks);
    }

    /**
     * Notify about daily attendance summary.
     */
    public void notifyDailyAttendanceSummary(int totalEmployees, int present, int absent,
                                              int onLeave, int late) {
        String message = String.format(":chart_with_upwards_trend: *Daily Attendance Summary*\n" +
                "*Date:* %s\n*Total:* %d | *Present:* %d | *Absent:* %d | *On Leave:* %d | *Late:* %d",
                LocalDate.now().format(DateTimeFormatter.ISO_DATE),
                totalEmployees, present, absent, onLeave, late);

        double attendanceRate = totalEmployees > 0 ? (present * 100.0 / totalEmployees) : 0;
        String rateEmoji = attendanceRate >= 90 ? ":green_circle:" :
                          (attendanceRate >= 75 ? ":large_yellow_circle:" : ":red_circle:");

        List<SlackBlock> blocks = new ArrayList<>();
        blocks.add(SlackBlock.header(":chart_with_upwards_trend: Daily Attendance Summary"));
        blocks.add(SlackBlock.section(String.format(
                "*Date:* %s\n%s *Attendance Rate:* %.1f%%",
                LocalDate.now().format(DateTimeFormatter.ofPattern("MMMM dd, yyyy")),
                rateEmoji, attendanceRate)));
        blocks.add(SlackBlock.divider());
        blocks.add(SlackBlock.section(String.format(
                ":busts_in_silhouette: *Total:* %d\n" +
                ":white_check_mark: *Present:* %d\n" +
                ":x: *Absent:* %d\n" +
                ":palm_tree: *On Leave:* %d\n" +
                ":clock1: *Late:* %d",
                totalEmployees, present, absent, onLeave, late)));

        sendToChannel(defaultChannel, message, blocks);
    }

    // ==================== Helper Methods ====================

    private List<SlackBlock> buildLeaveRequestBlocks(String employeeName, String leaveType,
                                                      LocalDate startDate, LocalDate endDate,
                                                      int days, String status, String statusEmoji) {
        List<SlackBlock> blocks = new ArrayList<>();
        blocks.add(SlackBlock.header(":palm_tree: Leave Request"));
        blocks.add(SlackBlock.section(String.format(
                "*Employee:* %s\n*Leave Type:* %s\n*From:* %s\n*To:* %s\n*Days:* %d\n%s *Status:* %s",
                employeeName, leaveType,
                startDate.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")),
                endDate.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")),
                days, statusEmoji, status)));
        return blocks;
    }

    // ==================== Data Classes ====================

    @Data
    @Builder
    public static class SlackAttachment {
        private String color;
        private String pretext;
        private String title;
        private String titleLink;
        private String text;
        private String fallback;
        private List<SlackField> fields;
        private String footer;
        private String footerIcon;
        private Long ts;

        public static SlackAttachment simple(String text, String color) {
            return SlackAttachment.builder()
                    .text(text)
                    .color(color)
                    .fallback(text)
                    .build();
        }

        public static SlackAttachment success(String text) {
            return simple(text, "#36a64f");
        }

        public static SlackAttachment warning(String text) {
            return simple(text, "#ffcc00");
        }

        public static SlackAttachment danger(String text) {
            return simple(text, "#dc3545");
        }
    }

    @Data
    @Builder
    public static class SlackField {
        private String title;
        private String value;
        @Builder.Default
        private boolean shortField = true;
    }

    @Data
    @Builder
    public static class SlackBlock {
        private String type;
        private Object text;
        private List<Object> elements;
        private Object accessory;

        public static SlackBlock header(String text) {
            return SlackBlock.builder()
                    .type("header")
                    .text(Map.of("type", "plain_text", "text", text, "emoji", true))
                    .build();
        }

        public static SlackBlock section(String text) {
            return SlackBlock.builder()
                    .type("section")
                    .text(Map.of("type", "mrkdwn", "text", text))
                    .build();
        }

        public static SlackBlock divider() {
            return SlackBlock.builder()
                    .type("divider")
                    .build();
        }

        public static SlackBlock context(String text) {
            return SlackBlock.builder()
                    .type("context")
                    .elements(List.of(Map.of("type", "mrkdwn", "text", text)))
                    .build();
        }

        public static SlackBlock actions(List<Object> elements) {
            return SlackBlock.builder()
                    .type("actions")
                    .elements(elements)
                    .build();
        }
    }
}
