package com.hrms.api.audit.dto;

import com.hrms.domain.audit.AuditLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLogResponse {
    private UUID id;
    private String entityType;
    private UUID entityId;
    private AuditLog.AuditAction action;
    private String actionDisplayName;
    private UUID actorId;
    private String actorEmail;
    private String actorName;
    private String oldValue;
    private String newValue;
    private String changes;
    private String ipAddress;
    private String userAgent;
    private LocalDateTime createdAt;

    public static AuditLogResponse fromEntity(AuditLog entity) {
        return AuditLogResponse.builder()
                .id(entity.getId())
                .entityType(entity.getEntityType())
                .entityId(entity.getEntityId())
                .action(entity.getAction())
                .actionDisplayName(formatAction(entity.getAction()))
                .actorId(entity.getActorId())
                .actorEmail(entity.getActorEmail())
                .oldValue(entity.getOldValue())
                .newValue(entity.getNewValue())
                .changes(entity.getChanges())
                .ipAddress(entity.getIpAddress())
                .userAgent(entity.getUserAgent())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private static String formatAction(AuditLog.AuditAction action) {
        if (action == null) return null;
        return action.name().replace("_", " ");
    }
}
