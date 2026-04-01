package com.hrms.api.integration.controller;

import com.hrms.application.integration.service.SlackCommandService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Webhook receiver for Slack slash commands.
 * Slack sends POST requests here when users type /leave or /balance.
 *
 * <p>This endpoint is NOT behind @RequiresPermission because Slack calls it
 * directly — authentication is via Slack signing secret verification.</p>
 *
 * <p>Configure in Slack App → Slash Commands:
 * <ul>
 *   <li>/leave → POST https://your-domain/api/v1/integrations/slack/commands</li>
 *   <li>/balance → POST https://your-domain/api/v1/integrations/slack/commands</li>
 * </ul></p>
 */
@RestController
@RequestMapping("/api/v1/integrations/slack")
@RequiredArgsConstructor
@Slf4j
public class SlackCommandController {

    private final SlackCommandService slackCommandService;

    /**
     * Receives Slack slash command payloads.
     * Slack sends form-urlencoded data with: command, text, user_id, user_name,
     * team_id, channel_id, response_url, trigger_id.
     */
    @PostMapping(value = "/commands", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> handleSlashCommand(
            @RequestParam("command") String command,
            @RequestParam(value = "text", defaultValue = "") String text,
            @RequestParam("user_id") String slackUserId,
            @RequestParam("user_name") String slackUserName,
            @RequestParam("team_id") String teamId,
            @RequestParam(value = "channel_id", defaultValue = "") String channelId,
            @RequestParam(value = "response_url", defaultValue = "") String responseUrl,
            HttpServletRequest request) {

        log.info("Slack command received: command={}, user={}, team={}", command, slackUserName, teamId);

        // Verify Slack signing secret (security)
        if (!slackCommandService.verifySlackSignature(request)) {
            log.warn("Invalid Slack signature for command: {}", command);
            return ResponseEntity.status(401)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"response_type\":\"ephemeral\",\"text\":\"Authentication failed.\"}");
        }

        // Route command
        String response = switch (command) {
            case "/leave" -> slackCommandService.handleLeaveCommand(text, slackUserId, teamId);
            case "/balance" -> slackCommandService.handleBalanceCommand(slackUserId, teamId);
            default -> "{\"response_type\":\"ephemeral\",\"text\":\"Unknown command: " + command + "\"}";
        };

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    /**
     * Receives Slack interactive component payloads (button clicks, modal submissions).
     */
    @PostMapping(value = "/interactions", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> handleInteraction(
            @RequestParam("payload") String payload,
            HttpServletRequest request) {

        log.info("Slack interaction received");

        if (!slackCommandService.verifySlackSignature(request)) {
            return ResponseEntity.status(401).body("");
        }

        String response = slackCommandService.handleInteraction(payload);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .body(response);
    }

    /**
     * Receives Slack event subscriptions (URL verification + events).
     */
    @PostMapping(value = "/events", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> handleEvent(@RequestBody String body, HttpServletRequest request) {
        log.info("Slack event received");

        // Handle URL verification challenge (Slack sends this during setup)
        if (body.contains("\"type\":\"url_verification\"")) {
            return slackCommandService.handleUrlVerification(body);
        }

        if (!slackCommandService.verifySlackSignature(request)) {
            return ResponseEntity.status(401).body("");
        }

        slackCommandService.processEvent(body);
        return ResponseEntity.ok("");
    }
}
