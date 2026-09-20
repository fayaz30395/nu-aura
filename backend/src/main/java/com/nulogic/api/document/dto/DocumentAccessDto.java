package com.nulogic.api.document.dto;

import com.nulogic.domain.document.DocumentAccess;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO for document access response
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentAccessDto {

    private UUID id;
    private UUID documentId;
    private UUID userId;
    private UUID roleId;
    private UUID departmentId;
    private DocumentAccess.AccessLevel accessLevel;
    private UUID grantedBy;
    private LocalDateTime grantedAt;
    private LocalDateTime expiresAt;
    private Boolean isActive;
}
