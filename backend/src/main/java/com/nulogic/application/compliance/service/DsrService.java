package com.nulogic.application.compliance.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.audit.AuditLog;
import com.nulogic.domain.compliance.DsrRequest;
import com.nulogic.infrastructure.compliance.DsrRequestRepository;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * GDPR Data Subject Rights (DSR) intake service.
 *
 * <p>Persists a DSR request, writes an immutable audit row, and notifies the
 * ops queue at {@code support@nulogic.io}. The actual data export (Articles
 * 15/20) and erasure cascading (Article 17) is *not* in this service — that is
 * the deep work tracked separately. This service is the legal record + queue
 * that satisfies the 30-day statutory response window.</p>
 *
 * <p>All write methods are explicitly transactional, but the audit write is
 * delegated to {@link AuditLogService#logAction} which is {@code @Async} on a
 * {@code REQUIRES_NEW} transaction — an audit failure cannot poison the
 * business transaction. The ops email is best-effort and never fails the
 * request: GDPR compliance hinges on the *persisted* row, not the email.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DsrService {

    private final DsrRequestRepository dsrRequestRepository;
    private final AuditLogService auditLogService;
    private final JavaMailSender mailSender;
    private final DsrExportService dsrExportService;
    private final DsrErasureService dsrErasureService;
    private final com.nulogic.common.util.TenantTimeService tenantTimeService;
    /**
     * Inbox monitored by ops to fulfil DSR requests. Externalised so non-prod
     * environments can redirect to a staging mailbox without code changes.
     */
    @Value("${app.compliance.dsr.support-email:support@nulogic.io}")
    private String supportEmail;
    @Value("${spring.mail.from:noreply@hrms.com}")
    private String fromEmail;

    // ==================== Create endpoints (Articles 15 / 17 / 20 / 16) ====================

    /**
     * GDPR Article 15 — right of access.
     */
    @Transactional
    public DsrRequest createAccessRequest(UUID userId, String reason) {
        return createRequest(userId, DsrRequest.RequestType.ACCESS, reason);
    }

    /**
     * GDPR Article 17 — right to erasure ("right to be forgotten").
     */
    @Transactional
    public DsrRequest createErasureRequest(UUID userId, String reason) {
        return createRequest(userId, DsrRequest.RequestType.ERASURE, reason);
    }

    /**
     * GDPR Article 20 — right to data portability.
     */
    @Transactional
    public DsrRequest createPortabilityRequest(UUID userId, String reason) {
        return createRequest(userId, DsrRequest.RequestType.PORTABILITY, reason);
    }

    /**
     * GDPR Article 16 — right to rectification of inaccurate personal data.
     */
    @Transactional
    public DsrRequest createRectificationRequest(UUID userId, String reason) {
        return createRequest(userId, DsrRequest.RequestType.RECTIFICATION, reason);
    }

    private DsrRequest createRequest(UUID userId, DsrRequest.RequestType type, String reason) {
        if (userId == null) {
            throw new IllegalArgumentException("requester userId is required");
        }
        UUID tenantId = TenantContext.requireCurrentTenant();

        DsrRequest request = DsrRequest.builder()
                .requesterUserId(userId)
                .requestType(type)
                .status(DsrRequest.Status.PENDING)
                .reason(reason)
                .build();
        request.setTenantId(tenantId);

        DsrRequest saved = dsrRequestRepository.save(request);

        // Audit chain — entityType "DsrRequest" + CREATE action makes this discoverable
        // alongside other compliance events. DSR-specific context is in description.
        // NOTE: we use the global AuditAction.CREATE rather than a DSR_REQUEST value
        // because the AuditAction enum is shared and out of scope for this scaffold.
        auditLogService.logAction(
                "DsrRequest",
                saved.getId(),
                AuditLog.AuditAction.CREATE,
                null,
                Map.of(
                        "type", type.name(),
                        "requesterUserId", userId.toString(),
                        "status", saved.getStatus().name()
                ),
                "GDPR DSR request filed: " + type.name()
        );

        notifyOps(saved);
        return saved;
    }

    // ==================== Self-service reads ====================

    @Transactional(readOnly = true)
    public List<DsrRequest> getMyRequests(UUID userId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId is required");
        }
        return dsrRequestRepository.findByRequesterUserIdAndIsDeletedFalse(userId);
    }

    /**
     * Tenant-safe fetch for the self-service detail view. The caller (a
     * non-admin user) may only see their own rows; admins use
     * {@link #getRequestForAdmin(UUID)} which skips the requester check.
     */
    @Transactional(readOnly = true)
    public DsrRequest getMyRequest(UUID requestId, UUID userId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        DsrRequest request = dsrRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("DSR request not found"));
        if (!request.getRequesterUserId().equals(userId)) {
            // Don't leak existence — same exception either way.
            throw new AccessDeniedException("DSR request not found");
        }
        return request;
    }

    // ==================== Admin operations (SYSTEM_ADMIN gated at controller) ====================

    /**
     * Admin status transition. Caller must be a {@code SYSTEM_ADMIN}
     * (gated at the controller via {@link com.nulogic.common.security.RequiresPermission}).
     *
     * <p>Terminal transitions ({@link DsrRequest.Status#COMPLETED} /
     * {@link DsrRequest.Status#REJECTED}) record the handler and timestamp on
     * the row. The audit log captures the before/after status pair so the
     * forensic chain shows who advanced the request and when.</p>
     */
    @Transactional
    public DsrRequest updateStatus(UUID requestId, DsrRequest.Status newStatus, String adminNotes) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID handlerId = SecurityContext.getCurrentUserId();

        DsrRequest request = dsrRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("DSR request not found"));

        DsrRequest.Status oldStatus = request.getStatus();
        if (oldStatus == newStatus) {
            return request; // no-op, but don't error — idempotent admin clicks are fine
        }

        switch (newStatus) {
            case IN_PROGRESS -> {
                request.setStatus(DsrRequest.Status.IN_PROGRESS);
                request.setHandlerUserId(handlerId);
                if (adminNotes != null) {
                    request.setAdminNotes(adminNotes);
                }
            }
            case COMPLETED -> request.complete(handlerId, adminNotes, tenantTimeService.now(request.getTenantId()));
            case REJECTED -> request.reject(handlerId, adminNotes, tenantTimeService.now(request.getTenantId()));
            case PENDING -> throw new IllegalArgumentException(
                    "Cannot move a DSR request back to PENDING — use IN_PROGRESS to re-open.");
        }

        DsrRequest saved = dsrRequestRepository.save(request);

        auditLogService.logAction(
                "DsrRequest",
                saved.getId(),
                AuditLog.AuditAction.STATUS_CHANGE,
                Map.of("status", oldStatus.name()),
                Map.of(
                        "status", newStatus.name(),
                        "handlerUserId", String.valueOf(handlerId),
                        "type", saved.getRequestType().name()
                ),
                "GDPR DSR request transitioned: " + oldStatus + " -> " + newStatus
        );

        return saved;
    }

    @Transactional(readOnly = true)
    public Page<DsrRequest> listForAdmin(DsrRequest.Status status, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        if (status == null) {
            return dsrRequestRepository.findByTenantId(tenantId, pageable);
        }
        return dsrRequestRepository.findByTenantIdAndStatus(tenantId, status, pageable);
    }

    @Transactional(readOnly = true)
    public DsrRequest getRequestForAdmin(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return dsrRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("DSR request not found"));
    }

    // ==================== Article 15 / 20 fulfilment (S9-A export pipeline) ====================

    /**
     * Drive an ACCESS / PORTABILITY request through the export pipeline:
     * transition PENDING → IN_PROGRESS, delegate to
     * {@link DsrExportService#buildExport} to aggregate the requester's
     * tenant-scoped data and render a JSON artefact, stamp SHA-256 + size
     * onto the row, transition to COMPLETED, and emit an EXPORT audit row
     * carrying digest + size in the {@code newValue} JSON.
     *
     * <p>Deliberately separate from the erasure / rectification fulfilment
     * branches — those right-types have very different cascading semantics
     * and shouldn't share state-machine code with the export pipeline.</p>
     *
     * <p>Caller-side controllers MUST gate entry on {@code SYSTEM_ADMIN}.
     * We re-load the request inside this transaction (not trusting the
     * caller) so tenant scope is enforced at the persistence boundary and
     * any concurrent status flip is caught by the JPA optimistic-lock
     * {@code @Version}.</p>
     *
     * @param requestId DSR row to fulfil; tenant-scoped, type ACCESS or PORTABILITY
     * @return rendered artefact for inline delivery
     * @throws IllegalArgumentException if request missing or wrong type
     * @throws IllegalStateException    if request is already in a terminal state
     */
    @Transactional
    public DsrExportArtifact processAccessOrPortability(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID handlerId = SecurityContext.getCurrentUserId();

        DsrRequest request = dsrRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("DSR request not found"));

        return processAccessOrPortability(request, handlerId);
    }

    /**
     * Lower-level overload for callers that already loaded a tenant-safe
     * {@link DsrRequest}. Same status-transition + export + audit cycle as
     * {@link #processAccessOrPortability(UUID)}.
     */
    @Transactional
    public DsrExportArtifact processAccessOrPortability(DsrRequest request, UUID handlerId) {
        if (request == null) {
            throw new IllegalArgumentException("DSR request is required");
        }
        DsrRequest.RequestType type = request.getRequestType();
        if (type != DsrRequest.RequestType.ACCESS && type != DsrRequest.RequestType.PORTABILITY) {
            throw new IllegalArgumentException(
                    "Only ACCESS / PORTABILITY may be processed here (got " + type + ")");
        }
        DsrRequest.Status start = request.getStatus();
        if (start == DsrRequest.Status.COMPLETED || start == DsrRequest.Status.REJECTED) {
            // Fail loud — silently re-exporting PII to a different handler
            // would be worse than rejecting. Re-opening a terminal row is an
            // explicit ops action via updateStatus().
            throw new IllegalStateException(
                    "DSR request already in terminal state " + start + " — cannot re-export");
        }

        // 1) Advance to IN_PROGRESS (idempotent if already in-flight).
        if (start != DsrRequest.Status.IN_PROGRESS) {
            request.setStatus(DsrRequest.Status.IN_PROGRESS);
            request.setHandlerUserId(handlerId);
            dsrRequestRepository.save(request);
        }

        // 2) Build the artefact. A serialisation / aggregation failure
        //    propagates and rolls back the IN_PROGRESS transition — a
        //    half-built export must not appear to have started.
        DsrExportArtifact artefact = dsrExportService.buildExport(request);

        // 3) Stamp integrity metadata onto the row.
        String sha256 = dsrExportService.sha256Hex(artefact.bytes());
        long size = artefact.size();
        request.setArtifactSha256(sha256);
        request.setArtifactSize(size);

        // 4) Transition to COMPLETED via the entity helper so handler +
        //    completedAt stay consistent with manual admin transitions.
        request.complete(handlerId, request.getAdminNotes(), tenantTimeService.now(request.getTenantId()));
        DsrRequest saved = dsrRequestRepository.save(request);

        // 5) Audit — EXPORT with digest + size in the newValue JSON.
        //    Async/REQUIRES_NEW: audit failure cannot poison this txn.
        auditLogService.logAction(
                "DsrRequest",
                saved.getId(),
                AuditLog.AuditAction.EXPORT,
                Map.of("status", start.name()),
                Map.of(
                        "action", "DSR_FULFILLMENT_EXPORT",
                        "type", type.name(),
                        "status", saved.getStatus().name(),
                        "handlerUserId", String.valueOf(handlerId),
                        "artifactSha256", sha256,
                        "artifactSize", size
                ),
                "GDPR DSR " + type + " fulfilled — artefact " + size + " bytes, sha256=" + sha256
        );

        log.info("DSR fulfilment export complete: requestId={}, type={}, size={}, sha256={}, handler={}",
                saved.getId(), type, size, sha256, handlerId);

        return artefact;
    }

    // ==================== Article 17 fulfilment (S9-B) ====================

    /**
     * GDPR Article 17 — fulfil an erasure request.
     *
     * <p>This is the orchestrating entry point that the controller / scheduled
     * fulfilment worker calls to actually erase the data subject's personal
     * data. The heavy lifting (legal-hold determination, User-row
     * anonymisation, audit emission) is delegated to {@link DsrErasureService};
     * this method is the public surface that ties the DSR row to the cascade
     * and is the canonical place where a {@link DsrRequest} of type
     * {@link DsrRequest.RequestType#ERASURE} moves
     * {@code PENDING -> IN_PROGRESS -> COMPLETED}.</p>
     *
     * <p>Returns the same {@link DsrRequest} after status transitions and
     * cascade application. The DSR row's {@code adminNotes} field carries
     * the human-readable per-data-class result summary for inclusion in the
     * 30-day statutory response to the data subject.</p>
     *
     * <p><strong>Authorization:</strong> enforced inside
     * {@link DsrErasureService#processErasure} rather than via
     * {@code @RequiresPermission} because the "you may erase yourself" path is
     * identity-based, not permission-based. The data subject themselves OR a
     * {@code SYSTEM_ADMIN} / {@code SUPER_ADMIN} may invoke this.</p>
     *
     * @param requestId the DSR row to fulfil; must be of type
     *                  {@link DsrRequest.RequestType#ERASURE} and not yet
     *                  in a terminal state.
     * @return the same DSR row, now {@code COMPLETED}.
     */
    @Transactional
    public DsrRequest processErasure(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        DsrRequest request = dsrRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("DSR request not found"));
        if (request.getRequestType() != DsrRequest.RequestType.ERASURE) {
            throw new IllegalArgumentException(
                    "DSR request " + requestId + " is not an erasure request (type="
                            + request.getRequestType() + ")");
        }
        return dsrErasureService.processErasure(request);
    }

    // ==================== Ops notification ====================

    /**
     * Best-effort email to the ops queue. Failures are logged but never thrown:
     * the *persisted* DSR row is the GDPR record of receipt. If the SMTP
     * gateway is down, ops will see the row on the admin dashboard via the
     * tenant-status index.
     */
    private void notifyOps(DsrRequest request) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail);
            helper.setTo(supportEmail);
            helper.setSubject("[GDPR DSR] New " + request.getRequestType().name()
                    + " request — tenant " + request.getTenantId());
            helper.setText(buildOpsEmailBody(request));
            mailSender.send(message);
            log.info("DSR ops notification sent: requestId={}, type={}, tenant={}",
                    request.getId(), request.getRequestType(), request.getTenantId());
        } catch (MessagingException | RuntimeException e) {
            // Email is non-blocking — the persisted DSR row is what makes the request legally received.
            log.error("Failed to email DSR ops queue for requestId={} (request remains persisted)",
                    request.getId(), e);
        }
    }

    private String buildOpsEmailBody(DsrRequest request) {
        return "A new GDPR Data Subject Rights request has been filed.\n\n"
                + "Request ID:   " + request.getId() + "\n"
                + "Tenant ID:    " + request.getTenantId() + "\n"
                + "Requester ID: " + request.getRequesterUserId() + "\n"
                + "Type:         " + request.getRequestType() + "\n"
                + "Status:       " + request.getStatus() + "\n"
                + "Filed at:     " + request.getRequestedAt() + "\n"
                + "Reason:       " + (request.getReason() == null ? "(none provided)" : request.getReason()) + "\n\n"
                + "GDPR statutory response window is 30 days. Please triage and update status via "
                + "PUT /api/v1/me/dsr/admin/" + request.getId() + "/status.\n";
    }
}
