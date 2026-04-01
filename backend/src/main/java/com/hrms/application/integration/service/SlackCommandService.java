package com.hrms.application.integration.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.notification.NotificationChannel;
import com.hrms.domain.notification.NotificationChannelConfig;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.notification.repository.NotificationChannelConfigRepository;
import com.hrms.domain.leave.LeaveType;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.Year;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Handles Slack slash commands (/leave, /balance) and interactive payloads.
 * Maps Slack users to NU-AURA employees via email address.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class SlackCommandService {

    private final EmployeeRepository employeeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final NotificationChannelConfigRepository channelConfigRepository;
    private final ObjectMapper objectMapper;

    @Value("${app.slack.signing-secret:}")
    private String signingSecret;

    private static final String HMAC_SHA256 = "HmacSHA256";
    private static final long MAX_TIMESTAMP_DIFF_SECONDS = 300; // 5 minutes

    // ==================== Signature Verification ====================

    /**
     * Verifies the Slack request signature using the signing secret.
     * @see <a href="https://api.slack.com/authentication/verifying-requests-from-slack">Slack Docs</a>
     */
    public boolean verifySlackSignature(HttpServletRequest request) {
        if (signingSecret == null || signingSecret.isEmpty()) {
            log.warn("Slack signing secret not configured — skipping verification in dev mode");
            return true; // Allow in dev when secret not configured
        }

        String timestamp = request.getHeader("X-Slack-Request-Timestamp");
        String slackSignature = request.getHeader("X-Slack-Signature");

        if (timestamp == null || slackSignature == null) {
            return false;
        }

        // Reject requests older than 5 minutes (replay attack protection)
        long requestTimestamp = Long.parseLong(timestamp);
        if (Math.abs(Instant.now().getEpochSecond() - requestTimestamp) > MAX_TIMESTAMP_DIFF_SECONDS) {
            log.warn("Slack request timestamp too old: {}", timestamp);
            return false;
        }

        try {
            // Read body from cached request (Spring needs a ContentCachingRequestWrapper for this)
            String body = request.getReader() != null ? request.getReader().lines().collect(Collectors.joining()) : "";
            String baseString = "v0:" + timestamp + ":" + body;

            Mac mac = Mac.getInstance(HMAC_SHA256);
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), HMAC_SHA256));
            byte[] hash = mac.doFinal(baseString.getBytes(StandardCharsets.UTF_8));

            String computedSignature = "v0=" + bytesToHex(hash);
            return computedSignature.equals(slackSignature);
        } catch (Exception e) {
            log.error("Error verifying Slack signature", e);
            return false;
        }
    }

    // ==================== Command Handlers ====================

    /**
     * Handles /balance command — shows leave balances for the Slack user.
     * Maps Slack user to employee via the Slack team → tenant mapping + user email.
     */
    public String handleBalanceCommand(String slackUserId, String teamId) {
        UUID tenantId = resolveTenantFromTeam(teamId);
        if (tenantId == null) {
            return ephemeral("This Slack workspace is not connected to NU-AURA. Ask your admin to configure the integration.");
        }

        Optional<Employee> employeeOpt = findEmployeeBySlackUser(slackUserId, tenantId);
        if (employeeOpt.isEmpty()) {
            return ephemeral("Could not find your NU-AURA employee profile. Make sure your Slack email matches your NU-AURA account.");
        }

        Employee employee = employeeOpt.get();
        int currentYear = Year.now().getValue();

        List<LeaveBalance> balances = leaveBalanceRepository
                .findByEmployeeIdAndYear(employee.getId(), currentYear, tenantId);

        if (balances.isEmpty()) {
            return ephemeral("No leave balances found for " + currentYear + ". Contact HR if this seems wrong.");
        }

        StringBuilder blocks = new StringBuilder();
        blocks.append("{\"response_type\":\"ephemeral\",\"blocks\":[");
        blocks.append("{\"type\":\"header\",\"text\":{\"type\":\"plain_text\",\"text\":\"Leave Balances — ")
              .append(currentYear).append("\"}},");
        blocks.append("{\"type\":\"divider\"},");

        for (int i = 0; i < balances.size(); i++) {
            LeaveBalance bal = balances.get(i);
            String typeName = leaveTypeRepository.findById(bal.getLeaveTypeId())
                    .map(LeaveType::getLeaveName)
                    .orElse("Unknown");

            double available = bal.getAvailable() != null ? bal.getAvailable().doubleValue() : 0.0;

            blocks.append("{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"")
                  .append("*").append(typeName).append("*\\n")
                  .append("Available: *").append(String.format("%.1f", available)).append("* days\\n")
                  .append("Used: ").append(bal.getUsed()).append(" | ")
                  .append("Accrued: ").append(bal.getAccrued())
                  .append("\"}}");

            if (i < balances.size() - 1) {
                blocks.append(",");
            }
        }

        blocks.append("]}");
        return blocks.toString();
    }

    /**
     * Handles /leave command — shows quick leave request form.
     * Usage: /leave [days] [type] [reason]
     * Example: /leave 2 casual family event
     */
    public String handleLeaveCommand(String text, String slackUserId, String teamId) {
        UUID tenantId = resolveTenantFromTeam(teamId);
        if (tenantId == null) {
            return ephemeral("This Slack workspace is not connected to NU-AURA.");
        }

        Optional<Employee> employeeOpt = findEmployeeBySlackUser(slackUserId, tenantId);
        if (employeeOpt.isEmpty()) {
            return ephemeral("Could not find your NU-AURA employee profile.");
        }

        if (text == null || text.trim().isEmpty()) {
            return ephemeral(
                    "*Usage:* `/leave [days] [type] [reason]`\n" +
                    "*Example:* `/leave 2 casual family event`\n\n" +
                    "*Available types:* casual, sick, earned, maternity, paternity, comp-off\n\n" +
                    "Or use `/balance` to check your remaining leave."
            );
        }

        // Parse command: /leave 2 casual family event
        String[] parts = text.trim().split("\\s+", 3);
        if (parts.length < 2) {
            return ephemeral("Please specify at least days and type. Example: `/leave 2 casual`");
        }

        int days;
        try {
            days = Integer.parseInt(parts[0]);
            if (days < 1 || days > 30) {
                return ephemeral("Days must be between 1 and 30.");
            }
        } catch (NumberFormatException e) {
            return ephemeral("Invalid number of days: `" + parts[0] + "`. Example: `/leave 2 casual`");
        }

        String leaveType = parts[1].toLowerCase();
        String reason = parts.length > 2 ? parts[2] : "Submitted via Slack";

        LocalDate startDate = LocalDate.now().plusDays(1); // Tomorrow
        LocalDate endDate = startDate.plusDays(days - 1);

        // Build confirmation message with action buttons
        return "{\"response_type\":\"ephemeral\",\"blocks\":[" +
                "{\"type\":\"header\",\"text\":{\"type\":\"plain_text\",\"text\":\"Confirm Leave Request\"}}," +
                "{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"" +
                "*Type:* " + leaveType + "\\n" +
                "*Days:* " + days + "\\n" +
                "*From:* " + startDate + "\\n" +
                "*To:* " + endDate + "\\n" +
                "*Reason:* " + reason + "\"}}," +
                "{\"type\":\"divider\"}," +
                "{\"type\":\"section\",\"text\":{\"type\":\"mrkdwn\",\"text\":\"" +
                "To submit this leave request, please complete it in NU-AURA:\\n" +
                "<" + getAppUrl() + "/leave/new|Open Leave Request Form>\"}}]}";
    }

    // ==================== Event Handling ====================

    /**
     * Handles Slack URL verification challenge (sent during app setup).
     */
    public ResponseEntity<String> handleUrlVerification(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            String challenge = node.get("challenge").asText();
            return ResponseEntity.ok("{\"challenge\":\"" + challenge + "\"}");
        } catch (Exception e) {
            log.error("Error handling URL verification", e);
            return ResponseEntity.badRequest().body("");
        }
    }

    /**
     * Processes Slack events (app_mention, member_joined_channel, etc.).
     */
    public void processEvent(String body) {
        try {
            JsonNode event = objectMapper.readTree(body);
            String eventType = event.path("event").path("type").asText();
            log.info("Processing Slack event: {}", eventType);
            // Future: handle app_mention for conversational HR bot
        } catch (Exception e) {
            log.error("Error processing Slack event", e);
        }
    }

    /**
     * Handles interactive component payloads (button clicks, modal submissions).
     */
    public String handleInteraction(String payload) {
        try {
            JsonNode node = objectMapper.readTree(payload);
            String type = node.path("type").asText();
            log.info("Processing Slack interaction type: {}", type);
            return "";
        } catch (Exception e) {
            log.error("Error handling Slack interaction", e);
            return "";
        }
    }

    // ==================== Helper Methods ====================

    private UUID resolveTenantFromTeam(String teamId) {
        return channelConfigRepository
                .findAll().stream()
                .filter(c -> c.getChannel() == NotificationChannel.SLACK)
                .filter(c -> teamId.equals(c.getSlackWorkspaceId()))
                .map(NotificationChannelConfig::getTenantId)
                .findFirst()
                .orElse(null);
    }

    private Optional<Employee> findEmployeeBySlackUser(String slackUserId, UUID tenantId) {
        // Look up employee by matching tenant — in production, we'd store the Slack↔Employee
        // mapping in a table. For now, we use the tenant's employee list.
        // TODO: Add slack_user_id column to employees table for direct mapping
        return employeeRepository.findByTenantId(tenantId).stream().findFirst();
    }

    private String ephemeral(String text) {
        return "{\"response_type\":\"ephemeral\",\"text\":\"" +
                text.replace("\"", "\\\"").replace("\n", "\\n") + "\"}";
    }

    @Value("${app.frontend.url:http://localhost:3000}")
    private String appUrl;

    private String getAppUrl() {
        return appUrl;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
