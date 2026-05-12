package com.hrms.application.compliance.service;

import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Cascade step 2 of GDPR Article 17 fulfilment — replaces PII fields on the
 * {@link Employee} row that is logically pinned to an already-anonymised
 * {@code User}. Step 1 ({@code UserAnonymizer}) wipes the principal's login
 * identity; this component handles the HR-record fan-out where the data
 * subject's day-to-day personal details live (name, contact, bank, address).
 *
 * <p><strong>Why anonymise instead of delete?</strong> The {@code Employee}
 * row is FK-pinned by:</p>
 * <ul>
 *   <li>{@code attendance_records.employee_id} (operational telemetry)</li>
 *   <li>{@code leave_requests.employee_id} / {@code leave_balances.employee_id}</li>
 *   <li>{@code salary_structures.employee_id} / {@code employee_payroll_records.employee_id}
 *       (Indian Income Tax Act §139A — 7-year retention)</li>
 *   <li>{@code contracts.employee_id} (employment-law retention)</li>
 *   <li>self-FK via {@code employees.manager_id} (org-chart back-references)</li>
 * </ul>
 * <p>Hard-deleting the row would orphan all of those. We instead overwrite
 * every PII column with a deterministic placeholder or {@code null} and keep
 * the row, the {@code employeeCode} (audit pseudonym), and {@code joiningDate}
 * (drives the 7-year retention window check) intact.</p>
 *
 * <p><strong>What gets wiped</strong> (all wipes are idempotent on second call):</p>
 * <ul>
 *   <li>{@code firstName} → {@link #ANONYMIZED_FIRST_NAME} (column is NOT NULL).</li>
 *   <li>{@code middleName}, {@code lastName} → {@code null}.</li>
 *   <li>{@code personalEmail}, {@code phoneNumber}, {@code emergencyContactNumber}
 *       → {@code null}.</li>
 *   <li>{@code dateOfBirth} → {@code null} (DoB is a direct PII identifier and
 *       has no payroll/tax retention obligation — the joiningDate is what the
 *       §139A check uses).</li>
 *   <li>{@code address}, {@code city}, {@code state}, {@code postalCode},
 *       {@code country} → {@code null}.</li>
 *   <li>{@code avatarUrl} → {@code null}.</li>
 *   <li>{@code bankAccountNumber}, {@code bankName}, {@code bankIfscCode},
 *       {@code taxId} → {@code null}. These are {@code EncryptedStringConverter}
 *       columns; setting to {@code null} bypasses the converter on write and
 *       leaves the ciphertext column empty rather than a placeholder that the
 *       converter would have to round-trip on next read.</li>
 *   <li>{@code gender}, {@code employmentType} are NOT wiped — they are
 *       statistical-only enum values with no direct identifier value and the
 *       {@code employmentType} column is {@code NOT NULL}.</li>
 * </ul>
 *
 * <p><strong>What we preserve and why</strong></p>
 * <ul>
 *   <li>{@code employeeCode} — audit pseudonym used in payroll-history queries
 *       and forensic logs. The data subject is no longer identifiable by the
 *       code alone, and preserving it lets the legal team correlate the audit
 *       chain when responding to a follow-up complaint.</li>
 *   <li>{@code joiningDate} — drives the §139A 7-year retention check that
 *       {@code DsrErasureService} runs on every erasure. Wiping it would
 *       force the next compliance sweep to treat the record as unbounded.</li>
 *   <li>{@code status} — left as-is. Setting it to {@code TERMINATED} here
 *       would inadvertently fire termination workflows (last-paycheck calc,
 *       exit interview reminders) that the data subject did not consent to.
 *       The {@code User} status is already {@code INACTIVE} from S9-B, which
 *       is the load-bearing signal for auth flows.</li>
 *   <li>{@code managerId}, {@code departmentId}, {@code officeLocationId},
 *       {@code teamId} — org-chart FKs. Preserved so reporting hierarchies
 *       calculated for historical audit periods still resolve.</li>
 * </ul>
 *
 * <p><strong>Idempotency contract:</strong> {@link #anonymize(UUID, UUID)} is
 * safe to call repeatedly. A natural sentinel ({@code firstName} matching
 * {@link #ANONYMIZED_FIRST_NAME}) is used instead of a dedicated
 * {@code anonymized_at} column on the {@code employees} table — adding one
 * would require a corresponding JPA field on {@link Employee} which is
 * outside the strict scope of this sprint and the sentinel is sufficient
 * because:</p>
 * <ul>
 *   <li>{@code firstName} is {@code NOT NULL} in the schema, so the column
 *       always carries a value to compare.</li>
 *   <li>The sentinel is uppercase ({@link #ANONYMIZED_FIRST_NAME}) and longer
 *       than typical first names; collisions with a real first name are not
 *       possible under the application's name-validation rules.</li>
 *   <li>If a future sprint adds {@code employees.anonymized_at} the check can
 *       be flipped without touching the cascade caller.</li>
 * </ul>
 *
 * <p><strong>Transactional contract:</strong> {@link #anonymize(UUID, UUID)}
 * runs in {@link Propagation#REQUIRES_NEW} so the Employee PII wipe commits
 * atomically even if a subsequent cascade step ({@code LeaveRecordRedactor},
 * {@code AttendanceRecordRedactor}) fails. The data subject's stated right to
 * erasure outweighs cascade completeness — a partial cascade with the
 * PII-bearing row wiped is preferable to an all-or-nothing rollback that
 * leaves the PII intact.</p>
 *
 * <p>Mirrors the pattern of {@link UserAnonymizer} both in transactional
 * stance and idempotency strategy so the two anonymisers behave identically
 * from the orchestrator's perspective.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeAnonymizer {

    /**
     * Placeholder retained on {@code firstName} because the column is
     * {@code NOT NULL}. Doubles as the idempotency sentinel — a subsequent
     * call sees this value and returns early without rewriting the row.
     * Matches the uppercase convention used in {@code UserAnonymizer} so
     * an admin scanning the anonymised rows recognises the marker.
     */
    static final String ANONYMIZED_FIRST_NAME = "ANONYMIZED";

    private final EmployeeRepository employeeRepository;

    /**
     * Anonymises the {@link Employee} row linked to {@code userId} within
     * {@code tenantId}. Returns a status enum the cascade orchestrator uses
     * to drive the {@code adminNotes} summary on the DSR row.
     *
     * <p>Flow:</p>
     * <ol>
     *   <li>Resolve the employee row via {@link EmployeeRepository#findByUserIdAndTenantId}.
     *       If the user has no linked employee (service-account, never-onboarded
     *       user) returns {@link Result#NOT_FOUND} — a benign no-op.</li>
     *   <li>If {@code firstName} already matches the sentinel, returns
     *       {@link Result#ALREADY_ANONYMIZED} so the orchestrator records the
     *       idempotent skip in the audit summary.</li>
     *   <li>Otherwise overwrites all PII columns documented in the class
     *       javadoc, saves, returns {@link Result#ANONYMIZED}.</li>
     * </ol>
     *
     * <p>Tenant-safety: the underlying repository method filters by
     * {@code tenantId} so a cross-tenant DSR cannot target the wrong row.</p>
     *
     * @param userId   the user whose linked employee is to be anonymised
     * @param tenantId the tenant the DSR was raised under
     * @return the result of the cascade step (never {@code null})
     * @throws IllegalArgumentException when either argument is null
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Result anonymize(UUID userId, UUID tenantId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId must not be null");
        }
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId must not be null");
        }

        Optional<Employee> maybeEmployee = employeeRepository.findByUserIdAndTenantId(userId, tenantId);
        if (maybeEmployee.isEmpty()) {
            log.info("EmployeeAnonymizer.anonymize: no employee row linked to user {} in tenant {} — "
                    + "no-op (service account or never-onboarded user)", userId, tenantId);
            return Result.NOT_FOUND;
        }

        Employee employee = maybeEmployee.get();

        if (isAlreadyAnonymized(employee)) {
            log.info("EmployeeAnonymizer.anonymize: employee {} (user {}) already anonymised — no-op",
                    employee.getId(), userId);
            return Result.ALREADY_ANONYMIZED;
        }

        // Identifiers — firstName kept as the sentinel because the column is
        // NOT NULL; middle and last cleared.
        employee.setFirstName(ANONYMIZED_FIRST_NAME);
        employee.setMiddleName(null);
        employee.setLastName(null);

        // Contact details.
        employee.setPersonalEmail(null);
        employee.setPhoneNumber(null);
        employee.setEmergencyContactNumber(null);

        // Date of birth — direct PII identifier; no payroll retention need for
        // this column (the §139A retention check uses joiningDate, not DoB).
        employee.setDateOfBirth(null);

        // Postal address.
        employee.setAddress(null);
        employee.setCity(null);
        employee.setState(null);
        employee.setPostalCode(null);
        employee.setCountry(null);

        // Avatar — could be a profile photo with biometric content.
        employee.setAvatarUrl(null);

        // Encrypted financial / tax PII. Setting to null is correct: the
        // EncryptedStringConverter is only invoked on non-null values, so
        // wipe = direct null write, no converter round-trip required.
        employee.setBankAccountNumber(null);
        employee.setBankName(null);
        employee.setBankIfscCode(null);
        employee.setTaxId(null);

        // Note: we save explicitly rather than relying on dirty-checking so
        // the row commits to disk before this REQUIRES_NEW transaction
        // returns to the orchestrator — matches the UserAnonymizer pattern.
        employeeRepository.save(employee);

        log.info("EmployeeAnonymizer: anonymised employee {} (user {}) in tenant {} — "
                + "name/contact/address/bank/tax PII wiped; employeeCode={} and joiningDate={} preserved",
                employee.getId(), userId, tenantId, employee.getEmployeeCode(), employee.getJoiningDate());

        return Result.ANONYMIZED;
    }

    /**
     * Idempotency sentinel check. An employee row is considered already
     * anonymised when its {@code firstName} matches the literal placeholder
     * AND the typical PII columns are null — the dual check guards against
     * a tenant whose name-validation rules accidentally allow the literal
     * "ANONYMIZED" as a real first name from rewriting the row twice.
     *
     * <p>Visible to package because the cascade-level test suite asserts
     * idempotency by invoking the sentinel directly without re-running the
     * full anonymise flow.</p>
     */
    boolean isAlreadyAnonymized(Employee employee) {
        return ANONYMIZED_FIRST_NAME.equals(employee.getFirstName())
                && employee.getPersonalEmail() == null
                && employee.getPhoneNumber() == null
                && employee.getDateOfBirth() == null;
    }

    /**
     * Outcome of a single {@link EmployeeAnonymizer#anonymize} call. The
     * orchestrator translates this to the per-data-class line in the DSR
     * {@code adminNotes} summary so the human reviewing the request sees
     * exactly what happened in the cascade step.
     */
    public enum Result {
        /** Employee row was wiped on this call. */
        ANONYMIZED,
        /** Sentinel matched — no rewrite needed. */
        ALREADY_ANONYMIZED,
        /** No employee row linked to the user (service-account or never-onboarded). */
        NOT_FOUND
    }
}
