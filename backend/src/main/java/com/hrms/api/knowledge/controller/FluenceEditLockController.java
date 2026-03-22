package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.FluenceEditLockService;
import com.hrms.application.knowledge.service.FluenceEditLockService.EditLockInfo;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.featureflag.FeatureFlag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for managing edit locks on NU-Fluence content.
 * Prevents concurrent editing conflicts via Redis-backed locks.
 */
@RestController
@RequestMapping("/api/v1/fluence/edit-lock")
@RequiredArgsConstructor
@RequiresFeature(FeatureFlag.ENABLE_FLUENCE)
public class FluenceEditLockController {

    private final FluenceEditLockService editLockService;

    /**
     * Acquire an edit lock on content.
     */
    @PostMapping("/{contentType}/{contentId}")
    public ResponseEntity<EditLockResponse> acquireLock(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();
        // Use userId as display name fallback; in production this would resolve from employee data
        String userName = userId.toString();

        EditLockInfo info = editLockService.acquireLock(tenantId, contentType, contentId, userId, userName);
        boolean isOwnLock = info.userId().equals(userId.toString());

        return ResponseEntity.ok(new EditLockResponse(
                true,
                info.userId(),
                info.userName(),
                info.lockedAt(),
                isOwnLock
        ));
    }

    /**
     * Release an edit lock on content.
     */
    @DeleteMapping("/{contentType}/{contentId}")
    public ResponseEntity<EditLockResponse> releaseLock(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        boolean released = editLockService.releaseLock(tenantId, contentType, contentId, userId);

        if (released) {
            return ResponseEntity.ok(new EditLockResponse(false, null, null, null, false));
        } else {
            // Lock owned by someone else
            EditLockInfo info = editLockService.getLockInfo(tenantId, contentType, contentId);
            if (info != null) {
                return ResponseEntity.ok(new EditLockResponse(
                        true, info.userId(), info.userName(), info.lockedAt(), false));
            }
            return ResponseEntity.ok(new EditLockResponse(false, null, null, null, false));
        }
    }

    /**
     * Check current lock status for content.
     */
    @GetMapping("/{contentType}/{contentId}")
    public ResponseEntity<EditLockResponse> checkLock(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        EditLockInfo info = editLockService.getLockInfo(tenantId, contentType, contentId);

        if (info == null) {
            return ResponseEntity.ok(new EditLockResponse(false, null, null, null, false));
        }

        boolean isOwnLock = info.userId().equals(userId.toString());
        return ResponseEntity.ok(new EditLockResponse(
                true, info.userId(), info.userName(), info.lockedAt(), isOwnLock));
    }

    /**
     * Refresh (heartbeat) an existing edit lock to extend its TTL.
     */
    @PutMapping("/{contentType}/{contentId}/heartbeat")
    public ResponseEntity<EditLockResponse> refreshLock(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        boolean refreshed = editLockService.refreshLock(tenantId, contentType, contentId, userId);

        if (refreshed) {
            EditLockInfo info = editLockService.getLockInfo(tenantId, contentType, contentId);
            return ResponseEntity.ok(new EditLockResponse(
                    true,
                    info != null ? info.userId() : userId.toString(),
                    info != null ? info.userName() : "",
                    info != null ? info.lockedAt() : "",
                    true
            ));
        }

        return ResponseEntity.ok(new EditLockResponse(false, null, null, null, false));
    }

    /**
     * Response DTO for edit lock operations.
     */
    public record EditLockResponse(
            boolean locked,
            String lockedByUserId,
            String lockedByUserName,
            String lockedAt,
            boolean isOwnLock
    ) {
    }
}
