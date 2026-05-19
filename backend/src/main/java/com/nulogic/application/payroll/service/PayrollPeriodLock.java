package com.nulogic.application.payroll.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Period-wide pessimistic lock for payroll computation.
 *
 * <p><strong>Why this exists (T1-04):</strong>
 * {@code PayrollRunRepository.findByIdAndTenantIdForUpdate} locks a single
 * {@code PayrollRun} row. That is enough to serialize state transitions on a
 * given run id, but the underlying invariant we actually want is "at most one
 * computation can be touching the payslips for (tenant, year, month) at any
 * time". Two ways the row lock fails to enforce that:</p>
 * <ul>
 *   <li>The legacy synchronous path ({@link PayrollRunService#processPayrollRun})
 *       and the async path ({@link PayrollRunService#initiateProcessing} +
 *       consumer-side {@link PayrollRunService#completeProcessing}) can both
 *       be triggered for the same run id; the row lock blocks the second, but
 *       a retried Kafka delivery on a different consumer instance could race a
 *       direct admin call on the same period if the row was already released.</li>
 *   <li>Future code that bypasses the standard service methods (debug
 *       endpoints, ad-hoc replays, batch tools) might not acquire the row
 *       lock at all.</li>
 * </ul>
 *
 * <p>This component issues a PostgreSQL transaction-scoped advisory lock keyed
 * on {@code hashtextextended(tenantId|year|month)}. The lock is automatically
 * released at commit/rollback; callers therefore must already be inside an
 * active transaction. We enforce that via {@code Propagation.MANDATORY}.</p>
 *
 * <p>Backlog reference: T1-04 in
 * {@code docs/architecture/improvement-backlog.md}.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayrollPeriodLock {

    /**
     * Use the wider 64-bit advisory lock space so we can pass the full hash
     * without truncating to int. {@code pg_advisory_xact_lock(bigint)} takes
     * a single bigint key; we derive it deterministically from the composite.
     */
    private static final String ACQUIRE_LOCK_SQL =
            "SELECT pg_advisory_xact_lock(hashtextextended(?, 0))";

    private final JdbcTemplate jdbcTemplate;

    /**
     * Acquire the transaction-scoped advisory lock for the given payroll
     * period. Blocks until the lock is granted; throws if no transaction is
     * active.
     *
     * @param tenantId tenant whose period we are computing
     * @param year     pay period year
     * @param month    pay period month (1-12)
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public void lockPeriod(UUID tenantId, Integer year, Integer month) {
        if (tenantId == null || year == null || month == null) {
            throw new IllegalArgumentException(
                    "PayrollPeriodLock requires tenantId, year, and month");
        }
        String key = tenantId + "|" + year + "|" + month;
        // The query returns void; just execute and ignore the empty result.
        jdbcTemplate.queryForObject(ACQUIRE_LOCK_SQL, Object.class, key);
        log.debug("Acquired payroll period lock for tenant={}, year={}, month={}",
                tenantId, year, month);
    }
}
