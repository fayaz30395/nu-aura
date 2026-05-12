package com.nulogic.application.compliance.service;

import com.nulogic.domain.payroll.SalaryStructure;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Cascade step 3 of GDPR Article 17 fulfilment — handles the
 * {@link SalaryStructure} rows pinned to a data subject's employee record.
 * Applies the {@code ANONYMIZE} policy from the {@code ErasurePolicy} matrix.
 *
 * <p><strong>Why ANONYMIZE rather than DELETE?</strong> Indian Income Tax Act
 * §139A and the parallel statutory retention rules (Payment of Bonus Act,
 * Provident Fund Act) require salary records be readable for <em>seven
 * years</em> from the close of the financial year they were emitted in.
 * That window outlasts most DSR requests — so the rows must survive even
 * an Article 17 erasure. The compromise the platform applies is:</p>
 * <ul>
 *   <li>Keep the amount columns ({@code basicSalary}, {@code hra},
 *       {@code conveyanceAllowance}, ..., {@code netSalary}) intact — these
 *       are the load-bearing values for any tax authority inspection.</li>
 *   <li>Wipe any PII columns physically present on the salary row.</li>
 * </ul>
 *
 * <p><strong>What this anonymiser actually wipes in the current schema</strong></p>
 * <p>The {@link SalaryStructure} entity in this codebase does <em>not</em>
 * carry direct PII columns: it stores {@code employeeId} as an FK, salary
 * amounts ({@link SalaryStructure#getBasicSalary()} et al.), effective dates,
 * and the {@code isActive} flag. All directly identifying data (bank account,
 * IFSC, PAN/tax-id) lives on the {@code Employee} row and is wiped by
 * {@link EmployeeAnonymizer}. So this anonymiser is, today, a forensic-only
 * step: it confirms the data subject's salary history exists, records that
 * the rows are being retained under §139A, and leaves the amounts untouched.</p>
 *
 * <p>The component is still emitted as a first-class cascade step (rather
 * than collapsed into {@code EmployeeAnonymizer}) for three reasons:</p>
 * <ol>
 *   <li><strong>Forward compatibility</strong> — if a future schema migration
 *       adds a PII column directly to {@code salary_structures} (e.g. bank
 *       reference number for direct-deposit overrides), this anonymiser is
 *       the natural home for wiping it. The cascade contract remains stable.</li>
 *   <li><strong>Audit narrative</strong> — the §139A retention rationale is
 *       documented per-row in this class so the DSR result text can cite
 *       the specific number of payroll structures retained, which the legal
 *       team needs when responding within the 30-day statutory window.</li>
 *   <li><strong>Policy matrix coherence</strong> — {@code ErasurePolicy.defaultPolicyMatrix()}
 *       lists {@code SalaryStructure → ANONYMIZE} as a separate decision from
 *       {@code Employee → ANONYMIZE}; the orchestrator's per-data-class loop
 *       must invoke a corresponding handler for each entry, otherwise the
 *       audit row claims a policy was applied when no code path verified it.</li>
 * </ol>
 *
 * <p><strong>Idempotency contract:</strong> the rows are never destructively
 * modified by this anonymiser today, so every call is naturally idempotent.
 * The return value distinguishes the "rows exist and were retained" path
 * from "no rows existed for this employee" path so the orchestrator can
 * emit the right line in the DSR summary.</p>
 *
 * <p><strong>Transactional contract:</strong> {@link Propagation#REQUIRES_NEW}
 * matches the rest of the cascade. If a future PII column wipe is added the
 * commit semantics are already correct — the wipe survives any subsequent
 * cascade failure.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SalaryStructureAnonymizer {

    private final SalaryStructureRepository salaryStructureRepository;

    /**
     * Applies the {@code SalaryStructure → ANONYMIZE} policy for the given
     * employee + tenant. Today this is a forensic count operation (no PII
     * columns to wipe); the row count is returned so the DSR summary can
     * include "{N} salary records retained under Indian Income Tax Act §139A".
     *
     * @param employeeId the employee whose salary rows are being processed;
     *                   may be {@code null} when the data subject has no
     *                   linked employee, in which case the call short-circuits
     * @param tenantId   the tenant the DSR was raised under; required
     * @return a {@link Result} describing the cascade outcome
     * @throws IllegalArgumentException when {@code tenantId} is {@code null}
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Result anonymize(UUID employeeId, UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId must not be null");
        }
        if (employeeId == null) {
            // No linked employee — short-circuit. Note this is distinct from
            // "employee exists but has zero salary structures" (NOT_FOUND vs
            // RETAINED with count=0); EmployeeAnonymizer.NOT_FOUND already
            // captures the former case for the orchestrator.
            log.info("SalaryStructureAnonymizer.anonymize: employeeId null for tenant {} — "
                    + "no salary structures to process", tenantId);
            return Result.NO_EMPLOYEE;
        }

        List<SalaryStructure> structures = salaryStructureRepository
                .findAllByTenantIdAndEmployeeId(tenantId, employeeId);

        if (structures.isEmpty()) {
            // Employee has no salary structure on file — common for interns or
            // contractors paid via a separate channel. The cascade still
            // succeeds; the DSR summary records "no records to retain".
            log.info("SalaryStructureAnonymizer.anonymize: employee {} in tenant {} has no salary "
                    + "structures — no retention action needed", employeeId, tenantId);
            return new Result(ResultKind.NO_RECORDS, 0);
        }

        // The current schema carries no direct PII columns on salary_structures
        // (see class javadoc). The §139A retention obligation means we leave
        // every amount column intact. If a future migration adds a PII column
        // here, wipe it in this loop before the count is returned.
        int retained = structures.size();
        log.info("SalaryStructureAnonymizer: retained {} salary structure row(s) for employee {} "
                        + "in tenant {} under Indian Income Tax Act §139A (amounts preserved, "
                        + "no PII columns to wipe on this entity)",
                retained, employeeId, tenantId);

        return new Result(ResultKind.RETAINED_AMOUNTS, retained);
    }

    /**
     * Classifies the cascade outcome so the orchestrator can pick the right
     * summary phrasing without inspecting the count.
     */
    public enum ResultKind {
        /**
         * Rows present; amounts kept under §139A retention.
         */
        RETAINED_AMOUNTS,
        /**
         * Employee exists, but no salary structures on file.
         */
        NO_RECORDS,
        /**
         * No linked employee — orchestrator short-circuit.
         */
        NO_EMPLOYEE
    }

    /**
     * Outcome of a single {@link SalaryStructureAnonymizer#anonymize} call.
     * The {@code count} is the number of salary structure rows the cascade
     * touched (zero for {@link ResultKind#NO_RECORDS} / {@link ResultKind#NO_EMPLOYEE}).
     */
    public record Result(ResultKind kind, int count) {

        /**
         * Convenience constant for the no-employee path so callers don't
         * have to construct a zero-count record inline.
         */
        public static final Result NO_EMPLOYEE = new Result(ResultKind.NO_EMPLOYEE, 0);
    }
}
