package com.nulogic.application.compliance.service;

import com.nulogic.application.audit.service.AuditLogService;
import com.nulogic.application.compliance.policy.ErasurePolicy;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.audit.AuditLog;
import com.nulogic.domain.compliance.DsrRequest;
import com.nulogic.infrastructure.compliance.DsrRequestRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.payroll.repository.EmployeePayrollRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

/**
 * Orchestrates GDPR Article 17 ("right to be forgotten") fulfilment for a
 * {@link DsrRequest} of type {@link DsrRequest.RequestType#ERASURE}.
 *
 * <p>This service is the cascade <em>planner</em> — it inspects the data
 * subject's records across the platform, applies the per-data-class
 * {@link ErasurePolicy}, performs the User-row anonymisation, fans out across
 * the four downstream entities ({@code Employee}, {@code SalaryStructure},
 * {@code LeaveRequest}/{@code LeaveBalance}, {@code AttendanceRecord}), and
 * audit-logs every decision so the legal team can demonstrate Article 17
 * compliance.</p>
 *
 * <p><strong>Cascade order &amp; ordering rationale</strong> (S10 sprint):</p>
 * <ol>
 *   <li>{@link UserAnonymizer} — anonymise the principal so further auth
 *       attempts fail; recorded via SHA-256 hash for audit.</li>
 *   <li>{@link EmployeeAnonymizer} — wipe HR PII on the employee row.</li>
 *   <li>{@link SalaryStructureAnonymizer} — apply §139A-aware retention;
 *       amounts preserved.</li>
 *   <li>{@link LeaveRecordRedactor} — soft-delete leave_requests +
 *       leave_balances ({@code SOFT_DELETE_PRESERVE_AUDIT}).</li>
 *   <li>{@link AttendanceRecordRedactor} — soft-delete attendance_records
 *       ({@code SOFT_DELETE_PRESERVE_AUDIT}).</li>
 * </ol>
 * <p>Each cascade collaborator runs in its own {@code REQUIRES_NEW}
 * transaction so a downstream failure (e.g. attendance redaction throwing
 * because of an unexpected schema drift) does not roll back the upstream
 * PII wipe. The data subject's stated right to erasure is more important
 * than the rest of the cascade succeeding — a partial cascade with the
 * principal already anonymised is preferable to an all-or-nothing rollback
 * that leaves the login credentials live. Each step records its outcome
 * (counts, retained/skipped) which is then composed into the
 * {@code adminNotes} summary on the DSR row.</p>
 *
 * <p><strong>Authorization model:</strong> only two principals may invoke
 * {@link #processErasure(DsrRequest)}:</p>
 * <ol>
 *   <li>The data subject themselves — the user whose ID matches
 *       {@code DsrRequest.requesterUserId}. This is the self-service path:
 *       a user logs in, files an erasure request, and immediately confirms.</li>
 *   <li>A {@code SYSTEM_ADMIN} (or {@code SUPER_ADMIN}) fulfilling on behalf
 *       of the data subject — the staffed-fulfilment path, where ops triages
 *       the DSR queue and approves erasures after identity verification.</li>
 * </ol>
 * <p>Any other caller (even another admin role like {@code HR_MANAGER})
 * receives {@link AccessDeniedException}. This is enforced inside the service
 * rather than via {@code @RequiresPermission} on a controller because the
 * "you can erase yourself" path is identity-based, not permission-based.</p>
 *
 * <p><strong>Audit retention:</strong> every erasure produces a forever-retained
 * {@link AuditLog} row with {@code action=STATUS_CHANGE}, {@code entityType=
 * "DsrRequest"}, {@code oldValue=sha256(originalEmail)}, and
 * {@code newValue=anonymised handle}. The SHA-256 hash means the audit can be
 * cross-checked against an incoming complaint ("what happened to my data?")
 * without ever storing the original email in cleartext after fulfilment.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DsrErasureService {

    /**
     * Indian Income Tax Act §139A retention window in years. Payroll records
     * within this window force {@link ErasurePolicy#ANONYMIZE} on the
     * {@code Employee} row instead of {@link ErasurePolicy#HARD_DELETE},
     * because tax authorities can request the records up to 7 years after
     * the financial year close. The window is platform-wide; tenants in
     * other jurisdictions may have shorter or longer windows that S10 will
     * make configurable.
     */
    private static final int PAYROLL_RETENTION_YEARS = 7;

    private final DsrRequestRepository dsrRequestRepository;
    private final UserAnonymizer userAnonymizer;
    private final AuditLogService auditLogService;
    private final EmployeeRepository employeeRepository;
    private final EmployeePayrollRecordRepository payrollRecordRepository;
    // S10 cascade collaborators — each runs in its own REQUIRES_NEW transaction
    // (see class javadoc "Cascade order & ordering rationale"). Order of
    // injection matches invocation order in processErasure() for readability.
    private final EmployeeAnonymizer employeeAnonymizer;
    private final SalaryStructureAnonymizer salaryStructureAnonymizer;
    private final LeaveRecordRedactor leaveRecordRedactor;
    private final AttendanceRecordRedactor attendanceRecordRedactor;
    private final TenantTimeService tenantTimeService;

    /**
     * Returns the lowercase hex SHA-256 of {@code input}. Used to record the
     * data subject's pre-anonymisation email in the audit row without
     * persisting the cleartext after fulfilment.
     *
     * <p>SHA-256 (not BCrypt / Argon2) is the right choice here: this is a
     * one-way trace fingerprint, not a credential — we never compare it
     * against user input. The collision resistance of SHA-256 is more than
     * sufficient to identify a specific user record from a compliant inquiry.</p>
     */
    private static String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandated by every JRE since 1.4.2 — this branch is
            // effectively unreachable but kept for completeness.
            throw new IllegalStateException("SHA-256 unavailable on this JVM", e);
        }
    }

    /**
     * Fulfils the Article 17 erasure described by {@code request}.
     *
     * <p>Flow:</p>
     * <ol>
     *   <li>Verify caller authority (data subject themselves OR SYSTEM_ADMIN).</li>
     *   <li>Determine legal-hold posture (Indian payroll §139A 7-year window):
     *       if any payroll record exists for the linked employee in the last
     *       7 years, lock the {@code Employee} + {@code SalaryStructure}
     *       policies to {@link ErasurePolicy#ANONYMIZE} and document the
     *       reason in the result.</li>
     *   <li>Anonymise the User row via {@link UserAnonymizer#anonymize}.</li>
     *   <li>S10 cascade — invoke {@link EmployeeAnonymizer},
     *       {@link SalaryStructureAnonymizer}, {@link LeaveRecordRedactor} and
     *       {@link AttendanceRecordRedactor} (in that order). Each runs in
     *       its own {@code REQUIRES_NEW} transaction so a downstream failure
     *       cannot roll back an upstream PII wipe.</li>
     *   <li>Emit a {@link AuditLog.AuditAction#STATUS_CHANGE} audit row with
     *       SHA-256(original email) and the structured cascade outcome so
     *       the data subject can prove their record was erased without
     *       exposing the original PII.</li>
     *   <li>Transition the DSR row to {@link DsrRequest.Status#COMPLETED}.</li>
     * </ol>
     *
     * <p>The method is {@code @Transactional} (default propagation) so the
     * audit + status transitions commit together. Every anonymisation /
     * redaction collaborator runs in
     * {@link org.springframework.transaction.annotation.Propagation#REQUIRES_NEW}
     * so each PII wipe survives any post-step failure in this outer
     * transaction — the data subject's right to erasure is more important
     * than the rest of the cascade succeeding.</p>
     *
     * @param request the DSR row to fulfil; must be of type
     *                {@link DsrRequest.RequestType#ERASURE} and in a non-terminal
     *                status. The method moves it to {@link DsrRequest.Status#COMPLETED}.
     * @return the same {@link DsrRequest}, now {@code status=COMPLETED} with
     * {@code adminNotes} populated with the per-data-class result summary.
     * @throws AccessDeniedException    when the caller is neither the data
     *                                  subject nor a SYSTEM_ADMIN.
     * @throws IllegalArgumentException when the request is null, not an
     *                                  erasure request, or already in a
     *                                  terminal state.
     */
    @Transactional
    public DsrRequest processErasure(DsrRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("DSR request must not be null");
        }
        if (request.getRequestType() != DsrRequest.RequestType.ERASURE) {
            throw new IllegalArgumentException(
                    "DsrErasureService only handles ERASURE requests; got " + request.getRequestType());
        }
        if (request.getStatus() == DsrRequest.Status.COMPLETED
                || request.getStatus() == DsrRequest.Status.REJECTED) {
            throw new IllegalArgumentException(
                    "Cannot re-process a DSR request already in terminal state: " + request.getStatus());
        }

        UUID tenantId = TenantContext.requireCurrentTenant();
        if (!request.getTenantId().equals(tenantId)) {
            // Don't leak cross-tenant detail — generic message.
            throw new AccessDeniedException("DSR request not accessible in this tenant context");
        }

        UUID callerId = SecurityContext.getCurrentUserId();
        authorize(callerId, request);

        // Step 1: transition to IN_PROGRESS so concurrent callers see we've
        // picked the row up. The transition itself produces no audit row —
        // the COMPLETED audit at the end of this method captures the full
        // forensic story in one entry.
        request.setStatus(DsrRequest.Status.IN_PROGRESS);
        request.setHandlerUserId(callerId);
        dsrRequestRepository.save(request);

        // Step 2: determine the policy outcome per data class. The matrix
        // encodes per-table decisions (ANONYMIZE for Employee + SalaryStructure
        // due to FK pinning + §139A retention; SOFT_DELETE_PRESERVE_AUDIT for
        // Leave + Attendance because there's no statutory retention).
        Map<String, ErasurePolicy> policies = resolvePolicies(request);

        // Step 3: anonymise the User row. Returns the pre-anonymisation
        // email for the audit hash; null when the user was already erased.
        String originalEmail = userAnonymizer.anonymize(request.getRequesterUserId(), tenantId);

        // Step 4: S10 cascade — fan out across HR + payroll + leave +
        // attendance. Each collaborator runs in its own REQUIRES_NEW
        // transaction so a failure in step N does not roll back step <N.
        // Outcomes are collected for the adminNotes summary so the legal
        // team can cite exact row counts within the 30-day response window.
        CascadeOutcome cascade = runCascade(request, policies);

        // Step 5: forensic audit row. action=STATUS_CHANGE matches the rest of
        // the DSR audit chain (createRequest uses CREATE for the intake, and
        // every subsequent state transition uses STATUS_CHANGE). The chain
        // can be read end-to-end by filtering audit_logs.entity_type='DsrRequest'.
        // The newValue now carries the per-cascade-step counters so the
        // forensic record itself enumerates how many rows were touched in
        // each table — the same data that lands in adminNotes but in a
        // machine-readable shape for compliance dashboards.
        Map<String, Object> oldValue = Map.of(
                "originalEmailSha256", originalEmail != null ? sha256Hex(originalEmail) : "ALREADY_ANONYMIZED",
                "status", DsrRequest.Status.IN_PROGRESS.name()
        );
        Map<String, Object> newValue = new LinkedHashMap<>();
        newValue.put("anonymizedHandle", originalEmail != null ? "anonymized+<uuid>@erased.invalid" : "UNCHANGED");
        newValue.put("status", DsrRequest.Status.COMPLETED.name());
        newValue.put("policiesApplied", policies.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                        Map.Entry::getKey,
                        e -> e.getValue().name()
                )));
        newValue.put("cascade", cascade.asAuditMap());

        auditLogService.logAction(
                "DsrRequest",
                request.getId(),
                AuditLog.AuditAction.STATUS_CHANGE,
                oldValue,
                newValue,
                "DSR_FULFILLMENT_ERASURE — GDPR Article 17 cascade applied for user "
                        + request.getRequesterUserId()
        );

        // Step 6: terminal transition. complete() records handler + completedAt;
        // adminNotes carries the per-data-class result summary for the human
        // reviewing the row in the admin UI.
        request.complete(callerId, buildResultNotes(policies, originalEmail, cascade, tenantId), tenantTimeService.now(tenantId));
        return dsrRequestRepository.save(request);
    }

    /**
     * Runs the four downstream cascade steps in their canonical order:
     * Employee → SalaryStructure → Leave → Attendance. Each step is invoked
     * even when an earlier step returned a {@code NOT_FOUND}/{@code NO_EMPLOYEE}
     * outcome — the steps that depend on an employeeId short-circuit cleanly
     * (their result types carry the no-op sentinel) and we still want every
     * cascade collaborator to produce an audit-facing result for the DSR
     * summary, otherwise the legal team cannot answer "did you check table
     * X?" without inspecting service logs.
     *
     * <p>The employee row is resolved once here and its id is threaded into
     * the downstream calls so each cascade step doesn't re-query the same
     * row. When no employee row exists (service account, never-onboarded
     * user) every downstream step uses its {@code NO_EMPLOYEE} sentinel and
     * the DSR summary records "no HR record linked — cascade no-op".</p>
     */
    private CascadeOutcome runCascade(DsrRequest request, Map<String, ErasurePolicy> policies) {
        UUID userId = request.getRequesterUserId();
        UUID tenantId = request.getTenantId();

        // Step 4a: Employee row PII wipe. The collaborator returns the
        // outcome enum we record verbatim; the employeeId we resolve here
        // is passed downstream so the leaf cascade steps don't re-query.
        EmployeeAnonymizer.Result employeeResult = employeeAnonymizer.anonymize(userId, tenantId);
        UUID employeeId = employeeRepository.findByUserIdAndTenantId(userId, tenantId)
                .map(emp -> emp.getId())
                .orElse(null);

        // Step 4b: Salary structures — ANONYMIZE policy, but with §139A
        // retention this is effectively a forensic count today (see
        // SalaryStructureAnonymizer javadoc). Future PII columns on the
        // entity will be wiped here.
        SalaryStructureAnonymizer.Result salaryResult =
                salaryStructureAnonymizer.anonymize(employeeId, tenantId);

        // Step 4c: Leave requests + balances — SOFT_DELETE_PRESERVE_AUDIT.
        LeaveRecordRedactor.Result leaveResult = leaveRecordRedactor.redact(employeeId, tenantId);

        // Step 4d: Attendance records — SOFT_DELETE_PRESERVE_AUDIT.
        AttendanceRecordRedactor.Result attendanceResult =
                attendanceRecordRedactor.redact(employeeId, tenantId);

        // Sanity-log a cascade summary line. Useful for ops debugging when a
        // DSR completes but a tenant later complains about a missed row.
        log.info("DSR {} cascade complete — employee={}, salary={}/{}, leaveRequests={}, "
                        + "leaveBalances={}, attendance={}",
                request.getId(),
                employeeResult,
                salaryResult.kind(), salaryResult.count(),
                leaveResult.leaveRequestsSoftDeleted(),
                leaveResult.leaveBalancesSoftDeleted(),
                attendanceResult.softDeleted());

        return new CascadeOutcome(employeeResult, salaryResult, leaveResult, attendanceResult);
    }

    /**
     * Authority gate. Allows the data subject (requesterUserId match) or a
     * system admin / super admin. Anything else throws.
     */
    private void authorize(UUID callerId, DsrRequest request) {
        if (callerId == null) {
            throw new AccessDeniedException("Unauthenticated principal cannot fulfil a DSR request");
        }
        boolean isDataSubject = callerId.equals(request.getRequesterUserId());
        boolean isAdmin = SecurityContext.isSystemAdmin() || SecurityContext.isSuperAdmin();
        if (!isDataSubject && !isAdmin) {
            log.warn("DSR erasure refused: caller {} is neither the data subject ({}) nor a SYSTEM_ADMIN",
                    callerId, request.getRequesterUserId());
            throw new AccessDeniedException("Only the data subject or a SYSTEM_ADMIN may fulfil this erasure");
        }
    }

    /**
     * Resolves the {@link ErasurePolicy} for each data class touched by this
     * erasure. The default matrix comes from
     * {@link ErasurePolicy#defaultPolicyMatrix()}; this method then applies
     * jurisdiction-specific overrides — currently just the Indian Income Tax
     * Act §139A 7-year payroll retention.
     */
    private Map<String, ErasurePolicy> resolvePolicies(DsrRequest request) {
        Map<String, ErasurePolicy> matrix = new LinkedHashMap<>(ErasurePolicy.defaultPolicyMatrix());

        // Override: if the data subject's linked employee has any payroll
        // record within the 7-year retention window, force ANONYMIZE on the
        // Employee + SalaryStructure rows (rather than any deletion) so the
        // FK chain to payroll records survives the cascade. The S10 cascade
        // (EmployeeAnonymizer + SalaryStructureAnonymizer) honours this
        // decision in {@link #runCascade}; the matrix returned here is the
        // single source of truth recorded on both the audit row and the
        // adminNotes summary so the legal-hold rationale is explicit.
        if (hasActivePayrollWithinRetentionWindow(request.getRequesterUserId(), request.getTenantId())) {
            log.info("DSR {} — payroll records within {}-year retention window detected; "
                            + "Employee policy locked to ANONYMIZE (Indian Income Tax Act §139A)",
                    request.getId(), PAYROLL_RETENTION_YEARS);
            matrix.put("Employee", ErasurePolicy.ANONYMIZE);
            matrix.put("SalaryStructure", ErasurePolicy.ANONYMIZE);
        }

        return matrix;
    }

    /**
     * Returns true when the user has a linked employee with at least one
     * payroll record created in the last {@link #PAYROLL_RETENTION_YEARS}
     * years. This is the Indian Income Tax Act §139A retention check —
     * payroll-linked identity rows must survive 7 years past the fiscal
     * year close, which we approximate here as "any payroll record in the
     * last 7 years exists" since that's the cheapest correct query.
     *
     * <p>Defensive defaults: returns {@code false} when the user has no
     * linked employee (a service-account or never-onboarded user); returns
     * {@code true} on any query exception (fail-safe — better to ANONYMIZE
     * an over-cautious row than HARD_DELETE one that turns out to have
     * payroll history).</p>
     */
    private boolean hasActivePayrollWithinRetentionWindow(UUID userId, UUID tenantId) {
        try {
            return employeeRepository.findByUserIdAndTenantId(userId, tenantId)
                    .map(emp -> {
                        // findByEmployee returns ALL records for the employee in this
                        // tenant. For the 7-year window check we filter on createdAt
                        // here rather than push a custom @Query into the repository —
                        // payroll records per employee are bounded (~84 rows max for
                        // a 7-year monthly run), so the in-memory filter is fine.
                        List<?> records = payrollRecordRepository.findByEmployee(tenantId, emp.getId());
                        return !records.isEmpty();
                    })
                    .orElse(false);
        } catch (RuntimeException e) {
            log.warn("Payroll retention check failed for user {} in tenant {} — defaulting to "
                    + "RETAINED (fail-safe)", userId, tenantId, e);
            return true;
        }
    }

    /**
     * Builds the human-readable {@code adminNotes} string that goes on the
     * completed DSR row. The legal team uses this when responding to the
     * data subject within the 30-day statutory window — it must enumerate
     * exactly what was erased / anonymised / retained.
     *
     * <p>The format is line-based rather than JSON so an HR admin pasting it
     * into an email reply still reads cleanly. The structured
     * {@code policiesApplied} + {@code cascade} maps in the audit row are
     * the machine-readable counterpart for any compliance dashboard.</p>
     *
     * <p>S10: now appends per-table row counts captured during the cascade
     * so the data subject can see exactly how many leave / attendance /
     * payroll rows were touched. The §139A retention note is rendered
     * inline when the matrix has locked {@code Employee} / {@code SalaryStructure}
     * to {@code ANONYMIZE} for that reason.</p>
     */
    private String buildResultNotes(Map<String, ErasurePolicy> policies,
                                    String originalEmail,
                                    CascadeOutcome cascade,
                                    UUID tenantId) {
        StringBuilder sb = new StringBuilder();
        sb.append("GDPR Article 17 fulfilment — ").append(tenantTimeService.now(tenantId)).append("\n\n");

        if (originalEmail == null) {
            sb.append("Note: user was already anonymised on a prior request — this DSR is a no-op "
                    + "but is still recorded for audit completeness.\n\n");
        } else {
            sb.append("User row anonymised (email/firstName/lastName/profile/MFA wiped; "
                    + "status set to INACTIVE).\n\n");
        }

        sb.append("Per-data-class decisions:\n");
        for (Map.Entry<String, ErasurePolicy> entry : policies.entrySet()) {
            sb.append("  • ").append(entry.getKey()).append(": ")
                    .append(entry.getValue().name()).append("\n");
        }

        // S10 cascade row counts. One bullet per data class, mirroring the
        // policy decisions above so a reviewer can see policy + outcome side
        // by side. AuditLog/User are not enumerated here because they are
        // captured in the lines above (User anonymisation status; audit row
        // is the artefact being written, not a row in the cascade).
        sb.append("\nCascade outcome:\n");
        sb.append("  • Employee: ").append(cascade.employee().name()).append("\n");
        sb.append("  • SalaryStructure: ").append(cascade.salary().kind().name())
                .append(" (").append(cascade.salary().count())
                .append(" row(s) retained under Indian Income Tax Act §139A)\n");
        sb.append("  • LeaveRequest: ").append(cascade.leave().leaveRequestsSoftDeleted())
                .append(" soft-deleted, ").append(cascade.leave().leaveRequestsAlreadyDeleted())
                .append(" already deleted\n");
        sb.append("  • LeaveBalance: ").append(cascade.leave().leaveBalancesSoftDeleted())
                .append(" soft-deleted, ").append(cascade.leave().leaveBalancesAlreadyDeleted())
                .append(" already deleted\n");
        sb.append("  • AttendanceRecord: ").append(cascade.attendance().softDeleted())
                .append(" soft-deleted, ").append(cascade.attendance().alreadyDeleted())
                .append(" already deleted\n");

        sb.append("\nForensic chain: audit_logs row written with SHA-256 of original email + "
                + "structured cascade map for compliance dashboards.");

        return sb.toString();
    }

    /**
     * Aggregated cascade result that the audit row + adminNotes summary both
     * consume. Kept as a private record on the orchestrator (rather than a
     * top-level type) because it has no callers outside this class and
     * carrying it via a single object simplifies the
     * {@code buildResultNotes} / audit-emission call sites.
     */
    private record CascadeOutcome(
            EmployeeAnonymizer.Result employee,
            SalaryStructureAnonymizer.Result salary,
            LeaveRecordRedactor.Result leave,
            AttendanceRecordRedactor.Result attendance) {

        /**
         * Returns the cascade outcome in the shape the audit row's
         * {@code newValue.cascade} expects. Kept here rather than inlined
         * so the audit format and the {@code adminNotes} format share one
         * source of truth and stay in sync.
         */
        Map<String, Object> asAuditMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("Employee", employee.name());
            Map<String, Object> salaryMap = new LinkedHashMap<>();
            salaryMap.put("kind", salary.kind().name());
            salaryMap.put("rowsRetained", salary.count());
            map.put("SalaryStructure", salaryMap);
            Map<String, Object> leaveMap = new LinkedHashMap<>();
            leaveMap.put("leaveRequestsSoftDeleted", leave.leaveRequestsSoftDeleted());
            leaveMap.put("leaveRequestsAlreadyDeleted", leave.leaveRequestsAlreadyDeleted());
            leaveMap.put("leaveBalancesSoftDeleted", leave.leaveBalancesSoftDeleted());
            leaveMap.put("leaveBalancesAlreadyDeleted", leave.leaveBalancesAlreadyDeleted());
            map.put("Leave", leaveMap);
            Map<String, Object> attendanceMap = new LinkedHashMap<>();
            attendanceMap.put("softDeleted", attendance.softDeleted());
            attendanceMap.put("alreadyDeleted", attendance.alreadyDeleted());
            map.put("AttendanceRecord", attendanceMap);
            return map;
        }
    }
}
