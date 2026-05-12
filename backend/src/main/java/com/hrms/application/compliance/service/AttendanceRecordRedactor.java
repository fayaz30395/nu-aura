package com.hrms.application.compliance.service;

import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Cascade step 5 of GDPR Article 17 fulfilment — applies the
 * {@code SOFT_DELETE_PRESERVE_AUDIT} policy to every {@link AttendanceRecord}
 * row tied to the data subject's employee.
 *
 * <p><strong>Why soft-delete rather than hard-delete or anonymise?</strong>
 * Attendance data carries no Indian statutory retention obligation (unlike
 * payroll under §139A), so the data subject is fully entitled to have it
 * erased. We choose soft-delete for parity with the leave cascade
 * ({@link LeaveRecordRedactor}) and so the audit chain that references
 * {@code attendance_records.id} from regularisation-approval workflows /
 * shift-attendance reconciliation logs continues to resolve. The rows drop
 * from the app-visible {@code @Where(clause = "is_deleted = false")} filter
 * but remain available for forensic compliance review and bounded reversal
 * via {@link com.hrms.common.entity.BaseEntity#restore()}.</p>
 *
 * <p><strong>What's sensitive on the attendance row?</strong> Every column
 * is operationally identifying — but more importantly several columns can
 * leak location PII:</p>
 * <ul>
 *   <li>{@code checkInLocation} / {@code checkOutLocation} — free-text often
 *       containing "Home, Bengaluru" or a specific street address.</li>
 *   <li>{@code checkInLatitude/Longitude} / {@code checkOutLatitude/Longitude}
 *       — GPS coordinates with sub-metre precision; correlation with public
 *       map data can reveal the data subject's home or commute pattern.</li>
 *   <li>{@code checkInIp} / {@code checkOutIp} — network identifiers tied
 *       to home / co-working / cafe locations.</li>
 *   <li>{@code regularizationReason}, {@code notes} — free-text fields that
 *       may carry medical or family detail (e.g. "left early for medical
 *       appointment").</li>
 * </ul>
 * <p>Soft-deleting the row hides the entire payload in one atomic operation
 * — preferable to column-by-column wiping which risks missing a future
 * schema addition.</p>
 *
 * <p><strong>Idempotency contract:</strong> each row's {@code isDeleted}
 * flag is checked before {@link com.hrms.common.entity.BaseEntity#softDelete()}
 * is invoked. Already-deleted rows are left intact so their original
 * {@code deletedAt} timestamp survives — this matters because that
 * timestamp may itself be the load-bearing evidence in a downstream
 * compliance audit (e.g. "we soft-deleted this row 4 years ago as part of
 * an unrelated termination, not as part of the recent DSR").</p>
 *
 * <p><strong>Why per-row save instead of a bulk JPQL UPDATE?</strong>
 * The {@code @Version} optimistic-lock counter and the
 * {@code @LastModifiedDate} audit columns on
 * {@link com.hrms.common.entity.BaseEntity} must advance for every modified
 * row so downstream compliance dashboards can correlate the
 * {@code updated_at} timestamp with the DSR completion time. A bulk
 * {@code @Modifying} {@code UPDATE} bypasses both, leaving a forensic gap.
 * The per-data-subject volume is bounded (max ~2,500 rows for a 7-year
 * daily-attendance tenure), so the load → softDelete() → saveAll cost is
 * acceptable.</p>
 *
 * <p><strong>Transactional contract:</strong> {@link Propagation#REQUIRES_NEW}
 * matches the rest of the cascade — the soft-delete sweep commits even if a
 * later orchestrator step fails. Attendance rows are per-row independent,
 * so a partial sweep is safe to retry: idempotency guarantees a re-run
 * touches only the rows still flagged active.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AttendanceRecordRedactor {

    private final AttendanceRecordRepository attendanceRecordRepository;

    /**
     * Soft-deletes every {@link AttendanceRecord} row tied to the given
     * employee + tenant. Skips already-deleted rows so their original
     * {@code deletedAt} is preserved.
     *
     * @param employeeId the employee whose attendance history is being
     *                   redacted; when {@code null} the call short-circuits
     *                   (data subject has no linked employee)
     * @param tenantId   the tenant the DSR was raised under; required
     * @return per-row counts of newly-deleted vs. previously-deleted records
     * @throws IllegalArgumentException when {@code tenantId} is {@code null}
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Result redact(UUID employeeId, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId must not be null");
        }
        if (employeeId == null) {
            log.info("AttendanceRecordRedactor.redact: employeeId null for tenant {} — "
                    + "no attendance rows to soft-delete (user has no linked employee)", tenantId);
            return Result.NO_EMPLOYEE;
        }

        // Specification-based query: AttendanceRecordRepository exposes only
        // paged + date-bounded finders. For the cascade we need *every* row
        // for the employee regardless of date — the JpaSpecificationExecutor
        // lets us issue a single tenant-scoped equality query without adding
        // a bespoke "find all by employee unbounded" method to the repository
        // (which would be tempting to misuse from non-compliance code paths).
        List<AttendanceRecord> records = attendanceRecordRepository
                .findAll((root, query, cb) -> cb.and(
                        cb.equal(root.get("tenantId"), tenantId),
                        cb.equal(root.get("employeeId"), employeeId)));

        int softDeleted = 0;
        int alreadyDeleted = 0;
        for (AttendanceRecord record : records) {
            if (record.isDeleted()) {
                alreadyDeleted++;
                continue;
            }
            record.softDelete();
            softDeleted++;
        }
        if (softDeleted > 0) {
            attendanceRecordRepository.saveAll(records);
        }

        log.info("AttendanceRecordRedactor: soft-deleted {} attendance_record(s) for employee {} "
                + "in tenant {} (skipped {} record(s) already deleted)",
                softDeleted, employeeId, tenantId, alreadyDeleted);

        return new Result(softDeleted, alreadyDeleted);
    }

    /**
     * Cascade outcome for the attendance step. Splits new vs. previously
     * soft-deleted counts so the orchestrator can emit a precise summary
     * line in {@code adminNotes}.
     */
    public record Result(int softDeleted, int alreadyDeleted) {

        /**
         * Convenience constant for the no-employee path. Lets the
         * orchestrator distinguish "no employee link" from "employee exists
         * but had nothing to redact" without an extra enum field.
         */
        public static final Result NO_EMPLOYEE = new Result(0, 0);

        /** @return true when no row was newly soft-deleted by this run. */
        public boolean isNoOp() {
            return softDeleted == 0;
        }
    }
}
