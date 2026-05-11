package com.hrms.api.compliance.controller;

import com.hrms.application.compliance.service.DsrService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.compliance.DsrRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

/**
 * GDPR Data Subject Rights (DSR) endpoints — Articles 15 (Access),
 * 17 (Erasure), 20 (Portability), 16 (Rectification).
 *
 * <p>User-facing routes are mounted under {@code /api/v1/me/dsr} so they
 * follow the existing convention for self-service endpoints. Admin sub-routes
 * are nested under {@code /admin} and gated by {@link Permission#SYSTEM_ADMIN}.</p>
 *
 * <p><strong>Scaffold:</strong> these endpoints create rows in the
 * {@code dsr_requests} queue and email ops at {@code support@nulogic.io}. The
 * automated data export / erasure cascading is the deep work tracked
 * separately — see {@link DsrService} for the boundary.</p>
 */
@RestController
@RequestMapping("/api/v1/me/dsr")
@RequiredArgsConstructor
@Tag(name = "GDPR DSR", description = "Data Subject Rights — Articles 15 / 16 / 17 / 20")
public class DsrController {

    private final DsrService dsrService;

    // ==================== Self-service intake (any authenticated user) ====================

    @PostMapping("/access")
    @Operation(
            summary = "File a GDPR Article 15 access request",
            description = "Article 15 — right of access. Persists a PENDING DSR row and emails ops. "
                    + "The data export itself is fulfilled manually by ops within the 30-day "
                    + "statutory window while the automated cascading export is built."
    )
    public ResponseEntity<DsrRequestResponse> createAccessRequest(@Valid @RequestBody DsrRequestBody body) {
        UUID userId = currentUserId();
        DsrRequest saved = dsrService.createAccessRequest(userId, body.getReason());
        return ResponseEntity.ok(DsrRequestResponse.from(saved));
    }

    @PostMapping("/erasure")
    @Operation(
            summary = "File a GDPR Article 17 erasure request",
            description = "Article 17 — right to erasure ('right to be forgotten'). Persists a "
                    + "PENDING DSR row and emails ops. Automated cascading erasure across "
                    + "employee/payroll/attendance/audit is the deep work tracked separately."
    )
    public ResponseEntity<DsrRequestResponse> createErasureRequest(@Valid @RequestBody DsrRequestBody body) {
        UUID userId = currentUserId();
        DsrRequest saved = dsrService.createErasureRequest(userId, body.getReason());
        return ResponseEntity.ok(DsrRequestResponse.from(saved));
    }

    @PostMapping("/portability")
    @Operation(
            summary = "File a GDPR Article 20 portability request",
            description = "Article 20 — right to data portability. Persists a PENDING DSR row "
                    + "and emails ops. Ops delivers the portable machine-readable copy manually "
                    + "until the automated JSON/CSV export pipeline ships."
    )
    public ResponseEntity<DsrRequestResponse> createPortabilityRequest(@Valid @RequestBody DsrRequestBody body) {
        UUID userId = currentUserId();
        DsrRequest saved = dsrService.createPortabilityRequest(userId, body.getReason());
        return ResponseEntity.ok(DsrRequestResponse.from(saved));
    }

    // ==================== Self-service reads ====================

    @GetMapping("/status")
    @Operation(summary = "List my DSR requests",
            description = "Returns every DSR request filed by the caller, across all statuses.")
    public ResponseEntity<List<DsrRequestResponse>> getMyRequests() {
        UUID userId = currentUserId();
        List<DsrRequestResponse> out = dsrService.getMyRequests(userId).stream()
                .map(DsrRequestResponse::from)
                .toList();
        return ResponseEntity.ok(out);
    }

    @GetMapping("/{requestId}")
    @Operation(summary = "Fetch one of my DSR requests by id")
    public ResponseEntity<DsrRequestResponse> getMyRequest(@PathVariable UUID requestId) {
        UUID userId = currentUserId();
        return ResponseEntity.ok(DsrRequestResponse.from(dsrService.getMyRequest(requestId, userId)));
    }

    // ==================== Admin sub-routes (SYSTEM_ADMIN only) ====================

    @PutMapping("/admin/{requestId}/status")
    @RequiresPermission(value = Permission.SYSTEM_ADMIN, revalidate = true)
    @Operation(
            summary = "Update DSR request status (admin)",
            description = "SYSTEM_ADMIN-only. Transitions a DSR request through "
                    + "PENDING -> IN_PROGRESS -> COMPLETED/REJECTED. Records handler + timestamp "
                    + "for the audit chain. The actual data export/erasure work happens outside "
                    + "this endpoint; the status flip closes the queue entry."
    )
    public ResponseEntity<DsrRequestResponse> updateStatus(
            @PathVariable UUID requestId,
            @Valid @RequestBody DsrStatusUpdateBody body
    ) {
        DsrRequest saved = dsrService.updateStatus(requestId, body.getStatus(), body.getAdminNotes());
        return ResponseEntity.ok(DsrRequestResponse.from(saved));
    }

    @GetMapping("/admin")
    @RequiresPermission(Permission.SYSTEM_ADMIN)
    @Operation(
            summary = "List DSR requests for the tenant (admin)",
            description = "SYSTEM_ADMIN-only. Tenant-scoped queue, optionally filtered by status. "
                    + "Pagination follows the standard Spring Data Pageable contract."
    )
    public ResponseEntity<Page<DsrRequestResponse>> listForAdmin(
            @RequestParam(required = false) DsrRequest.Status status,
            Pageable pageable
    ) {
        return ResponseEntity.ok(dsrService.listForAdmin(status, pageable).map(DsrRequestResponse::from));
    }

    // ==================== Helpers ====================

    private UUID currentUserId() {
        UUID id = SecurityContext.getCurrentUserId();
        if (id == null) {
            // Shouldn't happen — SecurityFilter would have rejected — but fail closed.
            throw new ResponseStatusException(UNAUTHORIZED, "Authenticated user context required");
        }
        return id;
    }

    // ==================== Request / response DTOs (inline for scaffold scope) ====================

    /** Common payload for all four create endpoints — reason is optional. */
    @Data
    public static class DsrRequestBody {
        /** Free-text justification or context. Optional; ops uses it to triage. */
        private String reason;
    }

    /** Admin status update body. */
    @Data
    public static class DsrStatusUpdateBody {
        @NotNull
        private DsrRequest.Status status;
        private String adminNotes;
    }

    /** Wire-format projection of {@link DsrRequest}. */
    @Data
    public static class DsrRequestResponse {
        private UUID id;
        private UUID tenantId;
        private UUID requesterUserId;
        private DsrRequest.RequestType requestType;
        private DsrRequest.Status status;
        private String reason;
        private String adminNotes;
        private java.time.LocalDateTime requestedAt;
        private java.time.LocalDateTime completedAt;
        private UUID handlerUserId;

        public static DsrRequestResponse from(DsrRequest r) {
            DsrRequestResponse out = new DsrRequestResponse();
            out.setId(r.getId());
            out.setTenantId(r.getTenantId());
            out.setRequesterUserId(r.getRequesterUserId());
            out.setRequestType(r.getRequestType());
            out.setStatus(r.getStatus());
            out.setReason(r.getReason());
            out.setAdminNotes(r.getAdminNotes());
            out.setRequestedAt(r.getRequestedAt());
            out.setCompletedAt(r.getCompletedAt());
            out.setHandlerUserId(r.getHandlerUserId());
            return out;
        }
    }
}
