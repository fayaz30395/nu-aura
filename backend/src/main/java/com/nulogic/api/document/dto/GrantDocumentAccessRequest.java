package com.nulogic.api.document.dto;

import com.nulogic.domain.document.DocumentAccess;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

/**
 * Request to grant document access to a user, role, or department.
 * At least one of userId, roleId, departmentId must be provided.
 */
@Data
public class GrantDocumentAccessRequest {

    private UUID userId;
    private UUID roleId;
    private UUID departmentId;

    @NotNull(message = "Access level is required")
    private DocumentAccess.AccessLevel accessLevel;
}
