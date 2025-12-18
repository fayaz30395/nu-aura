package com.hrms.domain.notification;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "user_notification_preferences", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"userId", "category"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserNotificationPreference extends TenantAware {


    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String category; // LEAVE, ATTENDANCE, PAYROLL, PERFORMANCE, etc.

    // Channel preferences
    private Boolean emailEnabled;

    private Boolean smsEnabled;

    private Boolean pushEnabled;

    private Boolean inAppEnabled;

    private Boolean slackEnabled;

    private Boolean teamsEnabled;

    private Boolean whatsappEnabled;

    // Quiet hours
    private Boolean quietHoursEnabled;

    private LocalTime quietHoursStart;

    private LocalTime quietHoursEnd;

    @ElementCollection
    @CollectionTable(name = "user_notification_quiet_days", joinColumns = @JoinColumn(name = "preference_id"))
    @Column(name = "day_of_week")
    @Builder.Default
    private Set<String> quietDays = new HashSet<>(); // MONDAY, TUESDAY, etc.

    // Frequency
    private String digestFrequency; // IMMEDIATE, HOURLY, DAILY, WEEKLY

    private LocalTime digestTime; // Time for digest delivery

    private String digestDay; // Day of week for weekly digest

    // Minimum priority
    @Enumerated(EnumType.STRING)
    private NotificationPriority minimumPriority; // Only send notifications >= this priority

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (emailEnabled == null) emailEnabled = true;
        if (smsEnabled == null) smsEnabled = false;
        if (pushEnabled == null) pushEnabled = true;
        if (inAppEnabled == null) inAppEnabled = true;
        if (slackEnabled == null) slackEnabled = false;
        if (teamsEnabled == null) teamsEnabled = false;
        if (whatsappEnabled == null) whatsappEnabled = false;
        if (quietHoursEnabled == null) quietHoursEnabled = false;
        if (digestFrequency == null) digestFrequency = "IMMEDIATE";
        if (minimumPriority == null) minimumPriority = NotificationPriority.LOW;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isChannelEnabled(NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> emailEnabled != null && emailEnabled;
            case SMS -> smsEnabled != null && smsEnabled;
            case PUSH -> pushEnabled != null && pushEnabled;
            case IN_APP -> inAppEnabled != null && inAppEnabled;
            case SLACK -> slackEnabled != null && slackEnabled;
            case TEAMS -> teamsEnabled != null && teamsEnabled;
            case WHATSAPP -> whatsappEnabled != null && whatsappEnabled;
            case WEBHOOK -> true; // Webhooks are system-level
        };
    }

    // Explicit getters for service layer access
    public UUID getId() {
        return super.getId();
    }

    public UUID getUserId() {
        return userId;
    }

    public String getCategory() {
        return category;
    }

    public Boolean getEmailEnabled() {
        return emailEnabled;
    }

    public Boolean getSmsEnabled() {
        return smsEnabled;
    }

    public Boolean getPushEnabled() {
        return pushEnabled;
    }

    public Boolean getInAppEnabled() {
        return inAppEnabled;
    }

    public Boolean getSlackEnabled() {
        return slackEnabled;
    }

    public Boolean getTeamsEnabled() {
        return teamsEnabled;
    }

    public Boolean getWhatsappEnabled() {
        return whatsappEnabled;
    }

    public Boolean getQuietHoursEnabled() {
        return quietHoursEnabled;
    }

    public LocalTime getQuietHoursStart() {
        return quietHoursStart;
    }

    public LocalTime getQuietHoursEnd() {
        return quietHoursEnd;
    }

    public Set<String> getQuietDays() {
        return quietDays;
    }

    public String getDigestFrequency() {
        return digestFrequency;
    }

    public LocalTime getDigestTime() {
        return digestTime;
    }

    public String getDigestDay() {
        return digestDay;
    }

    public NotificationPriority getMinimumPriority() {
        return minimumPriority;
    }
}
