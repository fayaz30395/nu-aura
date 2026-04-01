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
public class AuditSearchRequest {
    private String entityType;
    private UUID entityId;
    private AuditLog.AuditAction action;
    private UUID actorId;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
}
