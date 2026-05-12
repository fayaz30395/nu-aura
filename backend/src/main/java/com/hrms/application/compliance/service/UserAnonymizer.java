package com.hrms.application.compliance.service;

import com.hrms.domain.user.User;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.UUID;

/**
 * Replaces PII on a {@link User} row to fulfil GDPR Article 17 ("right to be
 * forgotten") while preserving the row for FK integrity / legal hold.
 *
 * <p><strong>Why anonymise instead of delete?</strong></p>
 * <ul>
 *   <li>{@code users.id} is a logical reference from many tables —
 *       {@code audit_logs.actor_id}, {@code employees.user_id},
 *       {@code payroll_runs.processed_by}, etc. Hard-deleting orphans those
 *       records and breaks forensic queries.</li>
 *   <li>Audit chain integrity: Article 17 itself is best demonstrated by an
 *       intact audit row that links the fulfilment back to the data subject's
 *       original ID. Deleting the User row blinds that link.</li>
 *   <li>Legal hold (Indian Income Tax Act §139A): payroll-linked identity
 *       records must survive 7 years even after a DSR request.</li>
 * </ul>
 *
 * <p><strong>What gets replaced:</strong></p>
 * <ul>
 *   <li>{@code email} → {@code anonymized+&lt;uuid&gt;@erased.invalid}
 *       (RFC 6761 reserved {@code .invalid} TLD — guaranteed never to route).</li>
 *   <li>{@code firstName} → literal {@code "ANONYMIZED"} (kept non-null because
 *       the column is {@code NOT NULL} in the DB schema).</li>
 *   <li>{@code lastName} → {@code null} (column is nullable).</li>
 *   <li>{@code profilePictureUrl} → {@code null}.</li>
 *   <li>{@code mfaSecret}, {@code mfaBackupCodes} → {@code null} (cannot leave
 *       valid MFA material on an anonymised account).</li>
 *   <li>{@code passwordHash} → a fresh 256-bit random value, BCrypt-incompatible
 *       so {@code passwordEncoder.matches} can never accept any input.</li>
 *   <li>{@code status} → {@link User.UserStatus#INACTIVE} (login flows reject).</li>
 *   <li>{@code anonymizedAt} → {@code now()} (V160 marker column).</li>
 * </ul>
 *
 * <p><strong>Idempotency:</strong> calling {@link #anonymize(UUID, UUID)} on a
 * user that already has a non-null {@code anonymizedAt} is a no-op (returns
 * {@code false}). This is important because Article 17 fulfilment may be
 * triggered by multiple paths (DSR queue, SuperAdmin "force erase", scheduled
 * GDPR sweep) and double-anonymisation would emit duplicate audit rows.</p>
 *
 * <p><strong>Transactional contract:</strong> {@link #anonymize(UUID, UUID)} runs
 * in {@link Propagation#REQUIRES_NEW} so the PII wipe commits atomically even
 * if a calling cascade aborts later — the data subject's stated right to
 * erasure is more important than the rest of the cascade succeeding.
 * {@code DsrErasureService} orchestrates the surrounding audit + status
 * transitions in its own transaction; the anonymisation step is the
 * load-bearing one.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserAnonymizer {

    /**
     * Length of the random byte sequence used to overwrite {@code passwordHash}.
     * 32 bytes (256 bits) provides full collision resistance against any
     * brute-force guess; the BCrypt format prefix is deliberately omitted so
     * {@code BCryptPasswordEncoder.matches} returns {@code false} for any
     * input rather than computing a comparison hash.
     */
    private static final int ANONYMIZED_PASSWORD_BYTES = 32;

    /**
     * Domain used for anonymised email addresses. The {@code .invalid} TLD is
     * reserved by RFC 6761 and is guaranteed never to resolve to a real
     * mailbox — so an anonymised email cannot accidentally receive
     * notifications even if a downstream job tries to send one.
     */
    private static final String ANONYMIZED_EMAIL_DOMAIN = "@erased.invalid";

    /**
     * Placeholder kept on {@code firstName} because the column is
     * {@code NOT NULL} in the DB schema. Uppercase to make the value visually
     * unmistakable in any admin tooling that still lists the row.
     */
    private static final String ANONYMIZED_FIRST_NAME = "ANONYMIZED";

    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Anonymises the {@link User} identified by {@code userId} within the given
     * {@code tenantId}, replacing all PII fields with deterministic
     * placeholders and stamping {@code anonymizedAt = now()}. Status is set to
     * {@link User.UserStatus#INACTIVE} so the principal can no longer log in.
     *
     * <p>Returns the previous (pre-anonymisation) email so the caller can
     * SHA-256 it for the audit record. Returns {@code null} when the user is
     * already anonymised (idempotent no-op) or not found — the caller is
     * responsible for treating those cases as terminal in its own audit.</p>
     *
     * <p>Tenant-safety: looks the user up via
     * {@link UserRepository#findByIdAndTenantId(UUID, UUID)} so a cross-tenant
     * DSR cannot accidentally anonymise the wrong row.</p>
     *
     * @param userId   the user to anonymise (must belong to {@code tenantId})
     * @param tenantId the tenant context the DSR was raised under
     * @return the original email (used for hashing in the audit row), or
     * {@code null} when the user was already anonymised or not found
     * @throws IllegalArgumentException when {@code userId} or {@code tenantId}
     *                                  is null (defensive — neither should ever be null at the call
     *                                  sites in {@code DsrErasureService})
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String anonymize(UUID userId, UUID tenantId) {
        if (userId == null) {
            throw new IllegalArgumentException("userId must not be null");
        }
        if (tenantId == null) {
            throw new IllegalArgumentException("tenantId must not be null");
        }

        User user = userRepository.findByIdAndTenantId(userId, tenantId).orElse(null);
        if (user == null) {
            log.warn("UserAnonymizer.anonymize: user {} not found in tenant {} — treating as no-op",
                    userId, tenantId);
            return null;
        }

        if (user.getAnonymizedAt() != null) {
            log.info("UserAnonymizer.anonymize: user {} already anonymised at {} — no-op",
                    userId, user.getAnonymizedAt());
            return null;
        }

        // Preserve the original email for the audit hash before we overwrite it.
        // We deliberately don't store this anywhere else — it lives on the stack
        // for the lifetime of this call, then the caller hashes it and discards.
        String originalEmail = user.getEmail();

        user.setEmail(anonymizedEmail());
        user.setFirstName(ANONYMIZED_FIRST_NAME);
        user.setLastName(null);
        user.setProfilePictureUrl(null);
        user.setMfaSecret(null);
        user.setMfaBackupCodes(null);
        user.setPasswordHash(unguessablePasswordHash());
        user.setStatus(User.UserStatus.INACTIVE);
        user.setAnonymizedAt(LocalDateTime.now());

        // Note: we save explicitly (rather than relying on dirty-checking) to
        // keep the read flow in the audit logger (which runs on a different
        // @Async thread) seeing the committed row, not the L1 cache copy.
        userRepository.save(user);

        log.info("UserAnonymizer: anonymised user {} in tenant {} — status=INACTIVE, "
                + "PII fields wiped, anonymized_at stamped", userId, tenantId);

        return originalEmail;
    }

    /**
     * Generates a unique anonymised email address. Includes a fresh UUID
     * suffix so two anonymised users in the same tenant never collide on
     * the {@code (email, tenantId)} unique index.
     */
    private String anonymizedEmail() {
        return "anonymized+" + UUID.randomUUID() + ANONYMIZED_EMAIL_DOMAIN;
    }

    /**
     * Returns a fresh random string suitable for overwriting
     * {@code passwordHash}. The format is deliberately not BCrypt
     * ({@code "$2a$..."}) — when {@code BCryptPasswordEncoder.matches} sees a
     * non-BCrypt prefix it returns {@code false} without computing a hash.
     * That means no password input can ever authenticate as this user, which
     * is the intended outcome of Article 17 fulfilment.
     */
    private String unguessablePasswordHash() {
        byte[] entropy = new byte[ANONYMIZED_PASSWORD_BYTES];
        secureRandom.nextBytes(entropy);
        // "ERASED:" prefix is a forensic marker — if an investigator later
        // dumps the column they can see at a glance that this is an
        // anonymisation sentinel rather than a leaked hash.
        return "ERASED:" + Base64.getEncoder().encodeToString(entropy);
    }
}
