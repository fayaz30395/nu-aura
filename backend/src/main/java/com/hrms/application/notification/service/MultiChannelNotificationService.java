package com.hrms.application.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.notification.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.notification.*;
import com.hrms.infrastructure.notification.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MultiChannelNotificationService {

    private final NotificationTemplateRepository templateRepository;
    private final MultiChannelNotificationRepository notificationRepository;
    private final UserNotificationPreferenceRepository preferenceRepository;
    private final NotificationChannelConfigRepository channelConfigRepository;
    private final ObjectMapper objectMapper;
    private final SmsNotificationService smsNotificationService;
    private final EmailNotificationService emailNotificationService;

    // ==================== TEMPLATE MANAGEMENT ====================

    @Transactional
    public NotificationTemplateDto createTemplate(NotificationTemplateDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (templateRepository.existsByCodeAndTenantId(request.getCode(), tenantId)) {
            throw new IllegalArgumentException("Template with code " + request.getCode() + " already exists");
        }

        NotificationTemplate template = NotificationTemplate.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .category(request.getCategory())
                .eventType(request.getEventType())
                .emailSubject(request.getEmailSubject())
                .emailBody(request.getEmailBody())
                .emailHtml(request.getEmailHtml())
                .smsBody(request.getSmsBody())
                .pushTitle(request.getPushTitle())
                .pushBody(request.getPushBody())
                .pushIcon(request.getPushIcon())
                .pushAction(request.getPushAction())
                .inAppTitle(request.getInAppTitle())
                .inAppBody(request.getInAppBody())
                .inAppIcon(request.getInAppIcon())
                .inAppActionUrl(request.getInAppActionUrl())
                .slackMessage(request.getSlackMessage())
                .teamsMessage(request.getTeamsMessage())
                .whatsappTemplateId(request.getWhatsappTemplateId())
                .whatsappBody(request.getWhatsappBody())
                .webhookPayload(request.getWebhookPayload())
                .defaultPriority(request.getDefaultPriority() != null ? request.getDefaultPriority() : NotificationPriority.NORMAL)
                .enabledChannels(request.getEnabledChannels() != null ? request.getEnabledChannels() : new HashSet<>())
                .isActive(true)
                .isSystemTemplate(false)
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        template.setTenantId(tenantId);
        return NotificationTemplateDto.fromEntity(templateRepository.save(template));
    }

    @Transactional
    public NotificationTemplateDto updateTemplate(UUID templateId, NotificationTemplateDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        NotificationTemplate template = templateRepository.findById(templateId)
                .filter(t -> t.getTenantId().equals(tenantId))
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));

        if (template.getIsSystemTemplate()) {
            throw new IllegalArgumentException("Cannot modify system templates");
        }

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setCategory(request.getCategory());
        template.setEventType(request.getEventType());
        template.setEmailSubject(request.getEmailSubject());
        template.setEmailBody(request.getEmailBody());
        template.setEmailHtml(request.getEmailHtml());
        template.setSmsBody(request.getSmsBody());
        template.setPushTitle(request.getPushTitle());
        template.setPushBody(request.getPushBody());
        template.setPushIcon(request.getPushIcon());
        template.setPushAction(request.getPushAction());
        template.setInAppTitle(request.getInAppTitle());
        template.setInAppBody(request.getInAppBody());
        template.setInAppIcon(request.getInAppIcon());
        template.setInAppActionUrl(request.getInAppActionUrl());
        template.setSlackMessage(request.getSlackMessage());
        template.setTeamsMessage(request.getTeamsMessage());
        template.setWhatsappTemplateId(request.getWhatsappTemplateId());
        template.setWhatsappBody(request.getWhatsappBody());
        template.setWebhookPayload(request.getWebhookPayload());
        template.setDefaultPriority(request.getDefaultPriority());
        template.setEnabledChannels(request.getEnabledChannels());
        // updatedBy is handled by JPA auditing via @LastModifiedBy in BaseEntity

        return NotificationTemplateDto.fromEntity(templateRepository.save(template));
    }

    @Transactional(readOnly = true)
    public Page<NotificationTemplateDto> searchTemplates(String category, String search, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.searchTemplates(tenantId, category, search, pageable)
                .map(NotificationTemplateDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public NotificationTemplateDto getTemplateByCode(String code) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findByCodeAndTenantId(code, tenantId)
                .map(NotificationTemplateDto::fromEntity)
                .orElseThrow(() -> new IllegalArgumentException("Template not found"));
    }

    @Transactional(readOnly = true)
    public List<NotificationTemplateDto> getTemplatesByCategory(String category) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findByCategoryAndIsActiveAndTenantId(category, true, tenantId).stream()
                .map(NotificationTemplateDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== SEND NOTIFICATIONS ====================

    @Transactional
    public List<MultiChannelNotificationDto> sendNotification(SendNotificationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<MultiChannelNotification> notifications = new ArrayList<>();

        NotificationTemplate template = null;
        if (request.getTemplateCode() != null) {
            template = templateRepository.findByCodeAndTenantId(request.getTemplateCode(), tenantId)
                    .orElseThrow(() -> new IllegalArgumentException("Template not found: " + request.getTemplateCode()));
        }

        Set<NotificationChannel> channels = request.getChannels();
        if (channels == null || channels.isEmpty()) {
            channels = template != null ? template.getEnabledChannels() : Set.of(NotificationChannel.IN_APP);
        }

        String contextJson = serializeContext(request.getContextData());

        for (SendNotificationRequest.RecipientInfo recipient : request.getRecipients()) {
            for (NotificationChannel channel : channels) {
                // Check if channel is enabled and user preferences allow it
                if (!isChannelEnabledForUser(recipient.getUserId(), channel,
                        template != null ? template.getCategory() : "GENERAL")) {
                    continue;
                }

                MultiChannelNotification notification = createNotification(
                        template, request, recipient, channel, contextJson, tenantId);
                notifications.add(notification);
            }
        }

        List<MultiChannelNotification> saved = notificationRepository.saveAll(notifications);

        // Process immediate notifications
        for (MultiChannelNotification notification : saved) {
            if (notification.getScheduledAt() == null ||
                notification.getScheduledAt().isBefore(LocalDateTime.now())) {
                processNotification(notification);
            }
        }

        return saved.stream()
                .map(MultiChannelNotificationDto::fromEntity)
                .collect(Collectors.toList());
    }

    private MultiChannelNotification createNotification(
            NotificationTemplate template,
            SendNotificationRequest request,
            SendNotificationRequest.RecipientInfo recipient,
            NotificationChannel channel,
            String contextJson,
            UUID tenantId) {

        String subject = request.getSubject();
        String body = request.getBody();
        String title = request.getTitle();
        String actionUrl = request.getActionUrl();
        String icon = request.getIcon();

        // Use template content if available
        if (template != null) {
            switch (channel) {
                case EMAIL:
                    subject = renderTemplate(template.getEmailSubject(), request.getContextData());
                    body = renderTemplate(template.getEmailBody(), request.getContextData());
                    break;
                case SMS:
                    body = renderTemplate(template.getSmsBody(), request.getContextData());
                    break;
                case PUSH:
                    title = renderTemplate(template.getPushTitle(), request.getContextData());
                    body = renderTemplate(template.getPushBody(), request.getContextData());
                    icon = template.getPushIcon();
                    actionUrl = template.getPushAction();
                    break;
                case IN_APP:
                    title = renderTemplate(template.getInAppTitle(), request.getContextData());
                    body = renderTemplate(template.getInAppBody(), request.getContextData());
                    icon = template.getInAppIcon();
                    actionUrl = template.getInAppActionUrl();
                    break;
                case SLACK:
                    body = renderTemplate(template.getSlackMessage(), request.getContextData());
                    break;
                case TEAMS:
                    body = renderTemplate(template.getTeamsMessage(), request.getContextData());
                    break;
                case WHATSAPP:
                    body = renderTemplate(template.getWhatsappBody(), request.getContextData());
                    break;
                case WEBHOOK:
                    body = renderTemplate(template.getWebhookPayload(), request.getContextData());
                    break;
            }
        }

        MultiChannelNotification notification = MultiChannelNotification.builder()
                .template(template)
                .templateCode(template != null ? template.getCode() : null)
                .recipientId(recipient.getUserId())
                .recipientEmail(recipient.getEmail())
                .recipientPhone(recipient.getPhone())
                .recipientName(recipient.getName())
                .channel(channel)
                .priority(request.getPriority() != null ? request.getPriority() :
                        (template != null ? template.getDefaultPriority() : NotificationPriority.NORMAL))
                .status(NotificationStatus.PENDING)
                .subject(subject)
                .body(body)
                .title(title)
                .actionUrl(actionUrl)
                .icon(icon)
                .contextData(contextJson)
                .referenceType(request.getReferenceType())
                .referenceId(request.getReferenceId())
                .scheduledAt(request.getScheduledAt())
                .groupKey(request.getGroupKey())
                .createdBy(SecurityContext.getCurrentUserId())
                .build();

        notification.setTenantId(tenantId);
        return notification;
    }

    private void processNotification(MultiChannelNotification notification) {
        try {
            notification.setStatus(NotificationStatus.QUEUED);
            notificationRepository.save(notification);

            // In a real implementation, this would call the appropriate channel provider
            // For now, we'll simulate successful delivery
            switch (notification.getChannel()) {
                case EMAIL:
                    sendEmailNotification(notification);
                    break;
                case SMS:
                    sendSmsNotification(notification);
                    break;
                case PUSH:
                    sendPushNotification(notification);
                    break;
                case IN_APP:
                    // In-app notifications are immediately delivered
                    notification.setStatus(NotificationStatus.DELIVERED);
                    notification.setSentAt(LocalDateTime.now());
                    notification.setDeliveredAt(LocalDateTime.now());
                    break;
                case SLACK:
                    sendSlackNotification(notification);
                    break;
                case TEAMS:
                    sendTeamsNotification(notification);
                    break;
                case WHATSAPP:
                    sendWhatsAppNotification(notification);
                    break;
                case WEBHOOK:
                    sendWebhookNotification(notification);
                    break;
            }

            notificationRepository.save(notification);
        } catch (RuntimeException e) {
            // Intentional broad catch — dispatching across multiple external channels; each may throw different types
            log.error("Failed to process notification {}: {}", notification.getId(), e.getMessage());
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(e.getMessage());
            notification.setRetryCount(notification.getRetryCount() + 1);
            notification.setLastRetryAt(LocalDateTime.now());
            notificationRepository.save(notification);
        }
    }

    // Channel-specific send methods
    private void sendEmailNotification(MultiChannelNotification notification) {
        if (notification.getRecipientEmail() == null || notification.getRecipientEmail().isBlank()) {
            log.warn("Cannot send email: recipient email missing for notification {}", notification.getId());
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage("Recipient email address is missing");
            return;
        }
        log.info("Sending email to {}: {}", notification.getRecipientEmail(), notification.getSubject());
        emailNotificationService.sendSimpleEmail(
                notification.getRecipientEmail(),
                notification.getSubject() != null ? notification.getSubject() : "(No Subject)",
                notification.getBody() != null ? notification.getBody() : ""
        );
        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now());
    }

    private void sendSmsNotification(MultiChannelNotification notification) {
        if (notification.getRecipientPhone() == null || notification.getRecipientPhone().isBlank()) {
            log.warn("Cannot send SMS: recipient phone is missing for notification {}", notification.getId());
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage("Recipient phone number is missing");
            return;
        }

        log.info("Sending SMS to {}: {}", notification.getRecipientPhone(), notification.getBody());

        SmsNotificationService.SmsResult result = smsNotificationService.sendSms(
                notification.getRecipientPhone(),
                notification.getBody()
        );

        if (result.success()) {
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            log.info("SMS sent successfully. SID: {}", result.messageSid());
        } else {
            notification.setStatus(NotificationStatus.FAILED);
            notification.setErrorMessage(result.errorMessage());
            log.error("SMS failed: {}", result.errorMessage());
        }
    }

    private void sendPushNotification(MultiChannelNotification notification) {
        log.info("Sending push to {}: {}", notification.getRecipientId(), notification.getTitle());
        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now());
    }

    private void sendSlackNotification(MultiChannelNotification notification) {
        log.info("Sending Slack message: {}", notification.getBody());
        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now());
    }

    private void sendTeamsNotification(MultiChannelNotification notification) {
        log.info("Sending Teams message: {}", notification.getBody());
        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now());
    }

    private void sendWhatsAppNotification(MultiChannelNotification notification) {
        log.info("Sending WhatsApp to {}: {}", notification.getRecipientPhone(), notification.getBody());
        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now());
    }

    private void sendWebhookNotification(MultiChannelNotification notification) {
        log.info("Sending webhook: {}", notification.getBody());
        notification.setStatus(NotificationStatus.SENT);
        notification.setSentAt(LocalDateTime.now());
    }

    // ==================== USER NOTIFICATIONS ====================

    @Transactional(readOnly = true)
    public Page<MultiChannelNotificationDto> getUserNotifications(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return notificationRepository.findInAppNotificationsForUser(tenantId, userId, pageable)
                .map(MultiChannelNotificationDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Long getUnreadCount() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return notificationRepository.countUnreadInAppNotifications(userId, tenantId);
    }

    @Transactional
    public void markAsRead(UUID notificationId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        MultiChannelNotification notification = notificationRepository.findById(notificationId)
                .filter(n -> n.getTenantId().equals(tenantId) && n.getRecipientId().equals(userId))
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));

        notification.setStatus(NotificationStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        notificationRepository.markAllAsRead(userId, tenantId, LocalDateTime.now());
    }

    // ==================== USER PREFERENCES ====================

    @Transactional(readOnly = true)
    public List<UserNotificationPreferenceDto> getUserPreferences() {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        return preferenceRepository.findByUserIdAndTenantId(userId, tenantId).stream()
                .map(UserNotificationPreferenceDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserNotificationPreferenceDto updatePreference(UserNotificationPreferenceDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        UserNotificationPreference preference = preferenceRepository
                .findByUserIdAndCategoryAndTenantId(userId, request.getCategory(), tenantId)
                .orElse(UserNotificationPreference.builder()
                        .userId(userId)
                        .category(request.getCategory())
                        .build());

        preference.setEmailEnabled(request.getEmailEnabled());
        preference.setSmsEnabled(request.getSmsEnabled());
        preference.setPushEnabled(request.getPushEnabled());
        preference.setInAppEnabled(request.getInAppEnabled());
        preference.setSlackEnabled(request.getSlackEnabled());
        preference.setTeamsEnabled(request.getTeamsEnabled());
        preference.setWhatsappEnabled(request.getWhatsappEnabled());
        preference.setQuietHoursEnabled(request.getQuietHoursEnabled());
        preference.setQuietHoursStart(request.getQuietHoursStart());
        preference.setQuietHoursEnd(request.getQuietHoursEnd());
        preference.setQuietDays(request.getQuietDays());
        preference.setDigestFrequency(request.getDigestFrequency());
        preference.setDigestTime(request.getDigestTime());
        preference.setDigestDay(request.getDigestDay());
        preference.setMinimumPriority(request.getMinimumPriority());
        preference.setTenantId(tenantId);

        return UserNotificationPreferenceDto.fromEntity(preferenceRepository.save(preference));
    }

    // ==================== CHANNEL CONFIGURATION ====================

    public NotificationChannelConfigDto configureChannel(NotificationChannelConfigDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        NotificationChannelConfig config = channelConfigRepository
                .findByChannelAndTenantId(request.getChannel(), tenantId)
                .orElse(NotificationChannelConfig.builder()
                        .channel(request.getChannel())
                        .build());

        config.setIsEnabled(request.getIsEnabled());
        config.setProvider(request.getProvider());
        config.setEmailFromAddress(request.getEmailFromAddress());
        config.setEmailFromName(request.getEmailFromName());
        config.setEmailReplyTo(request.getEmailReplyTo());
        config.setSmsFromNumber(request.getSmsFromNumber());
        config.setPushServerKey(request.getPushServerKey());
        config.setPushSenderId(request.getPushSenderId());
        config.setSlackWorkspaceId(request.getSlackWorkspaceId());
        config.setSlackDefaultChannel(request.getSlackDefaultChannel());
        config.setTeamsWebhookUrl(request.getTeamsWebhookUrl());
        config.setTeamsTenantId(request.getTeamsTenantId());
        config.setWhatsappBusinessId(request.getWhatsappBusinessId());
        config.setWhatsappPhoneNumberId(request.getWhatsappPhoneNumberId());
        config.setWebhookUrl(request.getWebhookUrl());
        config.setWebhookHeaders(request.getWebhookHeaders());
        config.setRateLimitPerMinute(request.getRateLimitPerMinute());
        config.setRateLimitPerHour(request.getRateLimitPerHour());
        config.setRateLimitPerDay(request.getRateLimitPerDay());
        config.setMaxRetries(request.getMaxRetries());
        config.setRetryDelaySeconds(request.getRetryDelaySeconds());
        config.setExponentialBackoff(request.getExponentialBackoff());
        config.setTenantId(tenantId);
        config.setCreatedBy(SecurityContext.getCurrentUserId());

        return NotificationChannelConfigDto.fromEntity(channelConfigRepository.save(config));
    }

    @Transactional(readOnly = true)
    public List<NotificationChannelConfigDto> getChannelConfigs() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return channelConfigRepository.findByTenantId(tenantId).stream()
                .map(NotificationChannelConfigDto::fromEntity)
                .collect(Collectors.toList());
    }

    // ==================== DASHBOARD ====================

    @Transactional(readOnly = true)
    public NotificationDashboard getDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);

        List<Object[]> channelCounts = notificationRepository.countByChannelSince(tenantId, startDate);
        List<Object[]> statusCounts = notificationRepository.countByStatusSince(tenantId, startDate);

        Map<NotificationChannel, NotificationDashboard.ChannelStats> channelStats = new HashMap<>();
        for (Object[] row : channelCounts) {
            NotificationChannel channel = (NotificationChannel) row[0];
            Long count = (Long) row[1];
            channelStats.put(channel, NotificationDashboard.ChannelStats.builder()
                    .channel(channel)
                    .totalSent(count)
                    .build());
        }

        Map<NotificationStatus, Long> statusMap = new HashMap<>();
        long totalSent = 0;
        long totalDelivered = 0;
        long totalFailed = 0;

        for (Object[] row : statusCounts) {
            NotificationStatus status = (NotificationStatus) row[0];
            Long count = (Long) row[1];
            statusMap.put(status, count);

            if (status == NotificationStatus.SENT || status == NotificationStatus.DELIVERED || status == NotificationStatus.READ) {
                totalSent += count;
            }
            if (status == NotificationStatus.DELIVERED || status == NotificationStatus.READ) {
                totalDelivered += count;
            }
            if (status == NotificationStatus.FAILED) {
                totalFailed += count;
            }
        }

        double deliveryRate = totalSent > 0 ? (double) totalDelivered / totalSent * 100 : 0;

        List<NotificationChannelConfig> configs = channelConfigRepository.findByTenantId(tenantId);
        List<NotificationDashboard.ChannelHealth> channelHealth = configs.stream()
                .map(config -> NotificationDashboard.ChannelHealth.builder()
                        .channel(config.getChannel())
                        .provider(config.getProvider())
                        .isEnabled(config.getIsEnabled())
                        .isHealthy(true) // Would check actual health
                        .build())
                .collect(Collectors.toList());

        return NotificationDashboard.builder()
                .totalNotificationsSent(totalSent)
                .totalNotificationsDelivered(totalDelivered)
                .totalNotificationsFailed(totalFailed)
                .deliveryRate(deliveryRate)
                .channelStats(channelStats)
                .statusCounts(statusMap)
                .channelHealth(channelHealth)
                .pendingNotifications(statusMap.getOrDefault(NotificationStatus.PENDING, 0L))
                .scheduledNotifications(statusMap.getOrDefault(NotificationStatus.QUEUED, 0L))
                .build();
    }

    // ==================== HELPER METHODS ====================

    private boolean isChannelEnabledForUser(UUID userId, NotificationChannel channel, String category) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if channel is globally enabled
        Optional<NotificationChannelConfig> config = channelConfigRepository.findByChannelAndTenantId(channel, tenantId);
        if (config.isPresent() && !config.get().getIsEnabled()) {
            return false;
        }

        // Check user preferences
        Optional<UserNotificationPreference> preference = preferenceRepository
                .findByUserIdAndCategoryAndTenantId(userId, category, tenantId);

        if (preference.isEmpty()) {
            // Default: allow in-app and email
            return channel == NotificationChannel.IN_APP || channel == NotificationChannel.EMAIL;
        }

        return preference.get().isChannelEnabled(channel);
    }

    private String renderTemplate(String template, Map<String, Object> context) {
        if (template == null || context == null) {
            return template;
        }

        String result = template;
        for (Map.Entry<String, Object> entry : context.entrySet()) {
            String placeholder = "{{" + entry.getKey() + "}}";
            result = result.replace(placeholder, String.valueOf(entry.getValue()));
        }
        return result;
    }

    private String serializeContext(Map<String, Object> context) {
        if (context == null) return null;
        try {
            return objectMapper.writeValueAsString(context);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize context: {}", e.getMessage());
            return null;
        }
    }
}
