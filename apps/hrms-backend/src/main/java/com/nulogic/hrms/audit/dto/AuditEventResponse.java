package com.nulogic.hrms.audit.dto;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AuditEventResponse {
    UUID id;
    String module;
    String action;
    String result;
    String targetType;
    UUID targetId;
    UUID actorId;
    String actorEmail;
    String actorName;
    String ipAddress;
    String userAgent;
    String meta;
    OffsetDateTime createdAt;
}
