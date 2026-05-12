package com.hrms.application.compliance.service;

import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Cascade step 4 of GDPR Article 17 fulfilment — applies the
 * {@code SOFT_DELETE_PRESERVE_AUDIT} policy to {@link LeaveRequest} and
 * {@link LeaveBalance} rows for the data subject's employee record.
 *
 * <p><strong>Why soft-delete rather than anonymise?</strong> Leave records
 * carry no statutory retention obligation in India (unlike payroll under
 * Indian Income Tax Act §139A) — they are operational HR data the data
 * subject is fully entitled to have erased. The platform default of
 * soft-delete (rather than hard-delete) is chosen so:</p>
 * <ul>
 *   <li>The audit chain referencing {@code leave_requests.id} from
 *       workflow approvals / manager-action logs still resolves — the row
 *       drops from the app-visible {@code @Where(clause = "is_deleted = false")}
 *       filter but remains discoverable for forensic compliance review.</li>
 *   <li>The reversal path is bounded — should the legal team determine
 *       the erasure was issued in error, {@link com.hrms.common.entity.BaseEntity#restore()}
 *       reinstates the rows. Hard-delete leaves no such path.</li>
 *   <li>It matches the same {@code SOFT_DELETE_PRESERVE_AUDIT} stance the
 *       {@code ErasurePolicy} matrix declares for {@code AttendanceRecord},
 *       keeping the two HR-operational tables symmetric.</li>
 * </ul>
 *
 * <p><strong>What rows are touched</strong></p>
 * <ul>
 *   <li>Every {@link LeaveRequest} where {@code employeeId} and {@code tenantId}
 *       match — covers PENDING, APPROVED, REJECTED, CANCELLED, regardless of
 *       past status. The {@code reason}, {@code comments}, and
 *       {@code rejectionReason} free-text columns can carry medical-leave
 *       detail that is sensitive PII; soft-deleting hides the whole row in
 *       one atomic step rather than column-wiping.</li>
 *   <li>Every {@link LeaveBalance} where {@code employeeId} and {@code tenantId}
 *       match — balance rows are correlated identifiers (a stale balance row
 *       for an anonymised employee leaks the existence of historical leave
 *       activity even if the request rows themselves are soft-deleted).</li>
 * </ul>
 *
 * <p><strong>Idempotency contract:</strong> each row is examined for its
 * {@code isDeleted} flag before {@link com.hrms.common.entity.BaseEntity#softDelete()}
 * is invoked. Already-deleted rows are left untouched (preserving the
 * original {@code deletedAt} timestamp the audit chain captured) and the
 * return value's per-collection {@code skipped} count reflects them so the
 * orchestrator can emit "{N} already deleted, {M} newly soft-deleted" in
 * the DSR summary.</p>
 *
 * <p>The work is done in-memory per row (load → softDelete() → saveAll)
 * rather than via a single bulk JPQL {@code UPDATE} statement so that the
 * {@code @Version} optimistic-lock counter and the {@code @LastModifiedDate}
 * audit columns advance correctly. The volume per data subject is bounded
 * (a few hundred leave_requests for a 10-year tenure at most, plus &lt;100
 * leave_balances), so the loop cost is negligible compared with the
 * single-shot transactional commit benefits.</p>
 *
 * <p><strong>Transactional contract:</strong> {@link Propagation#REQUIRES_NEW}
 * matches the rest of the cascade — the soft-delete sweep commits even if a
 * downstream step (attendance redaction) fails. Leave data is per-row
 * independent, so a partial sweep is safe to retry: idempotency guarantees
 * a re-run touches only the rows still flagged active.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaveRecordRedactor {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;

    /**
     * Soft-deletes every {@link LeaveRequest} and {@link LeaveBalance} row
     * tied to the given {@code employeeId} + {@code tenantId}. Already
     * soft-deleted rows are skipped, preserving their original
     * {@code deletedAt} timestamp.
     *
     * @param employeeId the employee whose leave history is being redacted;
     *                   when {@code null} the call short-circuits (data
     *                   subject has no linked employee row)
     * @param tenantId   the tenant the DSR was raised under; required
     * @return per-collection counts of newly-deleted vs. previously-deleted
     *         rows, used by the orchestrator to build the DSR summary
     * @throws IllegalArgumentException when {@code tenantId} is {@code null}
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Result redact(UUID employeeId, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId must not be null");
        }
        if (employeeId == null) {
            log.info("LeaveRecordRedactor.redact: employeeId null for tenant {} — "
                    + "no leave rows to soft-delete (user has no linked employee)", tenantId);
            return Result.NO_EMPLOYEE;
        }

        // --- Leave requests --------------------------------------------------
        // Use the JpaSpecificationExecutor entry point with a simple equality
        // specification would work, but the existing repository already
        // exposes a paginated finder by (tenantId, employeeId). To bulk-load
        // we use the same tenant-scoped query through findAll with Specification
        // — actually simpler: use JpaRepository.findAll-by-attribute via a
        // small ad-hoc loop on the paged finder. The page size is generous
        // because a single data subject has bounded history.
        //
        // We avoid a custom @Modifying bulk UPDATE here so each row's
        // @Version optimistic-lock counter and @LastModifiedDate column
        // advance correctly — important because downstream compliance
        // dashboards inspect updated_at to track per-DSR action timing.
        List<LeaveRequest> leaveRequests = leaveRequestRepository
                .findAll((root, query, cb) -> cb.and(
                        cb.equal(root.get("tenantId"), tenantId),
                        cb.equal(root.get("employeeId"), employeeId)));

        int leaveRequestsSoftDeleted = 0;
        int leaveRequestsAlreadyDeleted = 0;
        for (LeaveRequest lr : leaveRequests) {
            if (lr.isDeleted()) {
                leaveRequestsAlreadyDeleted++;
                continue;
            }
            lr.softDelete();
            leaveRequestsSoftDeleted++;
        }
        if (leaveRequestsSoftDeleted > 0) {
            leaveRequestRepository.saveAll(leaveRequests);
        }

        // --- Leave balances --------------------------------------------------
        // findAllByTenantIdAndEmployeeId returns every balance row across all
        // years and leave types — that's exactly the cascade scope: hide all
        // accrual history for the data subject.
        List<LeaveBalance> leaveBalances = leaveBalanceRepository
                .findAllByTenantIdAndEmployeeId(tenantId, employeeId);

        int leaveBalancesSoftDeleted = 0;
        int leaveBalancesAlreadyDeleted = 0;
        for (LeaveBalance lb : leaveBalances) {
            if (lb.isDeleted()) {
                leaveBalancesAlreadyDeleted++;
                continue;
            }
            lb.softDelete();
            leaveBalancesSoftDeleted++;
        }
        if (leaveBalancesSoftDeleted > 0) {
            leaveBalanceRepository.saveAll(leaveBalances);
        }

        log.info("LeaveRecordRedactor: soft-deleted {} leave_request(s) and {} leave_balance(s) "
                + "for employee {} in tenant {} (skipped {} request(s) and {} balance(s) "
                + "already deleted)",
                leaveRequestsSoftDeleted, leaveBalancesSoftDeleted, employeeId, tenantId,
                leaveRequestsAlreadyDeleted, leaveBalancesAlreadyDeleted);

        return new Result(
                leaveRequestsSoftDeleted, leaveRequestsAlreadyDeleted,
                leaveBalancesSoftDeleted, leaveBalancesAlreadyDeleted);
    }

    /**
     * Cascade outcome for the leave-records step. Splits the counts per
     * collection so the orchestrator can emit a precise per-table summary
     * in {@code adminNotes}: "{requestsSoftDeleted} new + {requestsAlreadyDeleted}
     * pre-existing soft-deletes on leave_requests; similar on leave_balances".
     */
    public record Result(
            int leaveRequestsSoftDeleted,
            int leaveRequestsAlreadyDeleted,
            int leaveBalancesSoftDeleted,
            int leaveBalancesAlreadyDeleted) {

        /**
         * Convenience constant for the no-employee path. All counts zero,
         * lets the orchestrator distinguish "no employee link" from
         * "employee exists but had nothing to redact" without exposing a
         * separate enum field.
         */
        public static final Result NO_EMPLOYEE = new Result(0, 0, 0, 0);

        /**
         * @return true when no row was touched by this cascade step (either
         *         because nothing existed, or every row was already deleted).
         */
        public boolean isNoOp() {
            return leaveRequestsSoftDeleted == 0 && leaveBalancesSoftDeleted == 0;
        }

        /** @return total newly soft-deleted rows across both collections. */
        public int totalSoftDeleted() {
            return leaveRequestsSoftDeleted + leaveBalancesSoftDeleted;
        }
    }
}
