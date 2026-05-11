package com.hrms.api.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response payload for SuperAdmin-initiated user password reset.
 *
 * <p><strong>Security:</strong> The temporary password is NOT included in this
 * response — it is delivered out-of-band via email to the target user only.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminPasswordResetResponse {
    /** Whether the reset was applied successfully. */
    private boolean success;
    /** Target user whose password was rotated. */
    private UUID userId;
    /** Timestamp at which the reset was applied. */
    private LocalDateTime resetAt;
    /** Indicates the user must change the temp password on their next login. */
    private boolean mustChange;
}
