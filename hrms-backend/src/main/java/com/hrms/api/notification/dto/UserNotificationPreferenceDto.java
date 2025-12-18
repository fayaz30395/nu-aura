package com.hrms.api.notification.dto;

import com.hrms.domain.notification.NotificationPriority;
import com.hrms.domain.notification.UserNotificationPreference;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.Set;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserNotificationPreferenceDto {

    private UUID id;
    private UUID userId;

    @NotBlank(message = "Category is required")
    private String category;

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
    private Set<String> quietDays;

    // Frequency
    private String digestFrequency;
    private LocalTime digestTime;
    private String digestDay;

    private NotificationPriority minimumPriority;

    public static UserNotificationPreferenceDto fromEntity(UserNotificationPreference pref) {
        return UserNotificationPreferenceDto.builder()
                .id(pref.getId())
                .userId(pref.getUserId())
                .category(pref.getCategory())
                .emailEnabled(pref.getEmailEnabled())
                .smsEnabled(pref.getSmsEnabled())
                .pushEnabled(pref.getPushEnabled())
                .inAppEnabled(pref.getInAppEnabled())
                .slackEnabled(pref.getSlackEnabled())
                .teamsEnabled(pref.getTeamsEnabled())
                .whatsappEnabled(pref.getWhatsappEnabled())
                .quietHoursEnabled(pref.getQuietHoursEnabled())
                .quietHoursStart(pref.getQuietHoursStart())
                .quietHoursEnd(pref.getQuietHoursEnd())
                .quietDays(pref.getQuietDays())
                .digestFrequency(pref.getDigestFrequency())
                .digestTime(pref.getDigestTime())
                .digestDay(pref.getDigestDay())
                .minimumPriority(pref.getMinimumPriority())
                .build();
    }
}
