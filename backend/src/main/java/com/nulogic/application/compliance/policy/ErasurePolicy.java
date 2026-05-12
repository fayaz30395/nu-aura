package com.nulogic.application.compliance.policy;

import com.nulogic.domain.compliance.DsrRequest;

import java.util.Map;

/**
 * Per-data-class decision matrix for GDPR Article 17 fulfilment.
 *
 * <p>Article 17 ("right to be forgotten") is not absolute: data with a legal
 * basis to retain (tax records, audit logs, ongoing contractual obligations)
 * may NOT be hard-deleted. This enum captures the four legitimate outcomes the
 * NU-AURA platform applies, on a per-data-class basis, when fulfilling an
 * erasure request:</p>
 *
 * <ul>
 *   <li>{@link #HARD_DELETE} — physical row removal. Safe only when no
 *       downstream FKs or legal-hold reasons apply.</li>
 *   <li>{@link #SOFT_DELETE_PRESERVE_AUDIT} — sets {@code is_deleted=true}
 *       so the row disappears from app reads, but the underlying record is
 *       still available for forensic queries / audit chain traversal.</li>
 *   <li>{@link #ANONYMIZE} — keeps the row + FKs intact but replaces all PII
 *       (name, email, contact details) with deterministic placeholders. Used
 *       when downstream entities (payroll, audit, employment contracts) need
 *       a stable foreign-key target but the data subject has the right to
 *       have personally identifying values removed.</li>
 *   <li>{@link #RETAIN_FOR_LEGAL_HOLD} — explicitly does NOTHING. The data
 *       class is exempt from Article 17 fulfilment because a higher legal
 *       authority (tax law, anti-fraud retention, accounting standards) requires
 *       us to keep the records intact for a regulated retention period.
 *       Documented in the DSR result so the data subject can be informed.</li>
 * </ul>
 *
 * <p>The {@link #defaultPolicyMatrix()} map is the platform-wide default;
 * tenant-specific overrides could be layered on later via a CompliancePolicy
 * row, but for this sprint the matrix is the source of truth. The matrix is
 * intentionally exposed as a {@code Map<String, ErasurePolicy>} keyed by the
 * canonical data-class name (matches {@code AuditLog.entityType}) so future
 * cascade work in S10 can drive its branch logic from a single lookup.</p>
 *
 * <p>Pattern note (audit M-COMP-D): an {@link ErasurePolicy#HARD_DELETE}
 * decision must be paired with a legal-hold check inside
 * {@code DsrErasureService} before execution. The enum value alone is not a
 * green-light — it is the *intent* the service planner uses when the row has
 * no retention obligation.</p>
 */
public enum ErasurePolicy {

    /**
     * Physical row removal. Used when no downstream FKs or legal-hold apply.
     */
    HARD_DELETE,

    /**
     * Soft-delete via {@code BaseEntity.softDelete()} ({@code is_deleted=true}).
     * Removes the row from app-visible queries (via the entity-level
     * {@code @Where(clause = "is_deleted = false")}) while preserving the row
     * for legal-hold forensic traversal. PII is NOT wiped — only the visibility
     * flag flips.
     */
    SOFT_DELETE_PRESERVE_AUDIT,

    /**
     * Replace PII fields with deterministic placeholders; keep the row and
     * all FKs intact. Default for FK-pinned tables (payroll, audit, contracts)
     * where downstream integrity requires a stable target but the data subject
     * has the right to remove identifying values.
     */
    ANONYMIZE,

    /**
     * Explicitly retained — Article 17 fulfilment is suppressed for this data
     * class because a higher legal authority (Indian Income Tax Act §139A,
     * 7-year audit retention, etc.) requires the records be kept intact.
     * The DSR result must document which records were retained and why.
     */
    RETAIN_FOR_LEGAL_HOLD;

    /**
     * Platform-default decision matrix used by
     * {@code DsrErasureService.processErasure}.
     *
     * <p>Keys match the canonical {@code AuditLog.entityType} string for each
     * data class so the cascade planner can resolve a policy with one lookup.
     * Values reflect the platform-wide compliance stance and were reviewed
     * with NU's compliance team for the S9 sprint:</p>
     *
     * <table>
     *   <caption>Default policy matrix</caption>
     *   <tr><th>Data class</th><th>Policy</th><th>Rationale</th></tr>
     *   <tr><td>User</td><td>ANONYMIZE</td>
     *       <td>FK-pinned by audit, employee, contracts. Cannot hard-delete
     *           without orphaning records.</td></tr>
     *   <tr><td>Employee</td><td>ANONYMIZE</td>
     *       <td>FK-pinned by attendance, payroll, leave. Same reasoning.</td></tr>
     *   <tr><td>LeaveRequest</td><td>SOFT_DELETE_PRESERVE_AUDIT</td>
     *       <td>Personal data but no statutory retention; soft-delete is enough
     *           to satisfy the right to erasure while preserving audit chain.</td></tr>
     *   <tr><td>AuditLog</td><td>RETAIN_FOR_LEGAL_HOLD</td>
     *       <td>Legal-hold forever. Audit logs are the forensic chain that
     *           proves we fulfilled the DSR — wiping them would defeat the
     *           purpose. The audit row is itself anonymised by
     *           {@code DsrErasureService} which hashes the original email.</td></tr>
     *   <tr><td>SalaryStructure</td><td>ANONYMIZE</td>
     *       <td>Payroll retention (Indian Income Tax Act §139A, 7 years).
     *           Same FK-pinning concern as Employee.</td></tr>
     *   <tr><td>AttendanceRecord</td><td>SOFT_DELETE_PRESERVE_AUDIT</td>
     *       <td>Operational personal data, no statutory retention; soft-delete
     *           is consistent with the rest of the soft-delete pattern.</td></tr>
     * </table>
     *
     * <p>The matrix is immutable. New data classes must be added here
     * explicitly and reviewed with compliance before the corresponding cascade
     * branch is wired up in {@code DsrErasureService}.</p>
     */
    public static Map<String, ErasurePolicy> defaultPolicyMatrix() {
        return Map.of(
                "User", ANONYMIZE,
                "Employee", ANONYMIZE,
                "LeaveRequest", SOFT_DELETE_PRESERVE_AUDIT,
                "AuditLog", RETAIN_FOR_LEGAL_HOLD,
                "SalaryStructure", ANONYMIZE,
                "AttendanceRecord", SOFT_DELETE_PRESERVE_AUDIT
        );
    }

    /**
     * Convenience lookup for the cascade planner. Returns
     * {@link #SOFT_DELETE_PRESERVE_AUDIT} for unknown data classes — a safe
     * default that hides the row from the data subject's view but does not
     * destroy it (allowing later review by compliance if the data class turns
     * out to need a different policy).
     *
     * @param entityType canonical entity name (matches {@code AuditLog.entityType})
     * @return the platform-default {@link ErasurePolicy}; never {@code null}
     */
    public static ErasurePolicy forEntity(String entityType) {
        return defaultPolicyMatrix().getOrDefault(entityType, SOFT_DELETE_PRESERVE_AUDIT);
    }

    /**
     * Returns true when {@code this} represents a no-op for cascading purposes
     * (the row should not be touched).
     */
    public boolean isRetainedAsIs() {
        return this == RETAIN_FOR_LEGAL_HOLD;
    }

    /**
     * Documentation-only helper: tags an erasure decision with the
     * {@link DsrRequest} that drove it. Used in result strings emitted by
     * {@code DsrErasureService} when populating {@code adminNotes} so a human
     * reviewing the DSR row can see, per data class, what was decided and why.
     */
    public String describe(DsrRequest request) {
        return switch (this) {
            case HARD_DELETE -> "HARD_DELETE — row removed for request " + request.getId();
            case SOFT_DELETE_PRESERVE_AUDIT -> "SOFT_DELETE — row hidden via is_deleted=true; audit chain preserved";
            case ANONYMIZE -> "ANONYMIZE — PII replaced with deterministic placeholders; FKs preserved";
            case RETAIN_FOR_LEGAL_HOLD -> "RETAIN — legal-hold exemption (e.g. Indian Income Tax Act §139A)";
        };
    }
}
