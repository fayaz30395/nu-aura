package com.hrms.api.recognition.dto;

import com.hrms.domain.recognition.Recognition;
import com.hrms.domain.recognition.Recognition.RecognitionCategory;
import com.hrms.domain.recognition.Recognition.RecognitionType;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecognitionResponse {

    private UUID id;
    private UUID giverId;
    private String giverName;
    private String giverAvatarUrl;
    private UUID receiverId;
    private String receiverName;
    private String receiverAvatarUrl;
    private RecognitionType type;
    private String typeLabel;
    private RecognitionCategory category;
    private String categoryLabel;
    private String title;
    private String message;
    private Integer pointsAwarded;
    private Boolean isPublic;
    private Boolean isAnonymous;
    private UUID badgeId;
    private String badgeName;
    private String badgeIconUrl;
    private Integer likesCount;
    private Integer commentsCount;
    private Boolean isApproved;
    private LocalDateTime recognizedAt;
    private LocalDateTime createdAt;

    public static RecognitionResponse fromEntity(Recognition entity) {
        return RecognitionResponse.builder()
                .id(entity.getId())
                .giverId(entity.getGiverId())
                .receiverId(entity.getReceiverId())
                .type(entity.getType())
                .typeLabel(formatType(entity.getType()))
                .category(entity.getCategory())
                .categoryLabel(entity.getCategory() != null ? formatCategory(entity.getCategory()) : null)
                .title(entity.getTitle())
                .message(entity.getMessage())
                .pointsAwarded(entity.getPointsAwarded())
                .isPublic(entity.getIsPublic())
                .isAnonymous(entity.getIsAnonymous())
                .badgeId(entity.getBadgeId())
                .likesCount(entity.getLikesCount())
                .commentsCount(entity.getCommentsCount())
                .isApproved(entity.getIsApproved())
                .recognizedAt(entity.getRecognizedAt())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private static String formatType(RecognitionType type) {
        return switch (type) {
            case KUDOS -> "Kudos";
            case APPRECIATION -> "Appreciation";
            case ACHIEVEMENT -> "Achievement";
            case MILESTONE -> "Milestone";
            case SPOT_AWARD -> "Spot Award";
            case PEER_NOMINATION -> "Peer Nomination";
            case MANAGER_RECOGNITION -> "Manager Recognition";
            case TEAM_RECOGNITION -> "Team Recognition";
        };
    }

    private static String formatCategory(RecognitionCategory category) {
        return switch (category) {
            case TEAMWORK -> "Teamwork";
            case INNOVATION -> "Innovation";
            case CUSTOMER_FOCUS -> "Customer Focus";
            case LEADERSHIP -> "Leadership";
            case PROBLEM_SOLVING -> "Problem Solving";
            case GOING_EXTRA_MILE -> "Going Extra Mile";
            case MENTORSHIP -> "Mentorship";
            case QUALITY -> "Quality";
            case INITIATIVE -> "Initiative";
            case COLLABORATION -> "Collaboration";
            case COMMUNICATION -> "Communication";
            case OTHER -> "Other";
        };
    }
}
