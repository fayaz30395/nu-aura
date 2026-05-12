package com.hrms.application.security.service;

import com.hrms.infrastructure.benefits.repository.BenefitDependentRepository;
import com.hrms.infrastructure.tax.repository.TaxDeclarationRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * One-time re-encryption backfill for legacy plaintext rows in columns that
 * were widened by Flyway V147 (PII at rest hardening).
 *
 * <p>Background: {@link com.hrms.common.converter.EncryptedStringConverter} writes
 * values in the format {@code Base64(IV) ":" Base64(ciphertext+tag)}. When the
 * converter encounters a legacy plaintext value (no {@code ":"} delimiter) it
 * returns the raw value unchanged so the application keeps functioning. This
 * service scans for those legacy rows and triggers a {@code save()} round-trip
 * through the JPA {@code @Convert} pipeline so the value is rewritten in the
 * IV-prefixed ciphertext format.
 *
 * <p>This is intentionally synchronous and operator-triggered (see
 * {@link com.hrms.api.admin.controller.EncryptionBackfillController}). Run it
 * once per environment after V147 ships, then deploy the follow-up CHECK
 * constraints documented in V147__encrypt_pii_columns.sql.
 *
 * <p>Sprint 3 S3-D (audit gap) — see V147 migration notes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EncryptionBackfillService {

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final BenefitDependentRepository benefitDependentRepository;
    private final TaxDeclarationRepository taxDeclarationRepository;

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Re-encrypt legacy {@code users.mfa_secret} values that don't carry the
     * IV-prefixed ciphertext format.
     */
    @Transactional
    public BackfillResult backfillUserMfaSecrets() {
        List<UUID> candidateIds = findLegacyIds(
                "SELECT id FROM users WHERE mfa_secret IS NOT NULL AND mfa_secret NOT LIKE '%:%'");
        int migrated = 0;
        for (UUID id : candidateIds) {
            try {
                if (userRepository.findById(id).map(this::resaveUser).orElse(false)) {
                    migrated++;
                }
            } catch (Exception e) {
                log.warn("Failed to re-encrypt users.mfa_secret for id={}: {}", id, e.getMessage());
            }
        }
        log.info("Backfill users.mfa_secret: candidates={}, migrated={}", candidateIds.size(), migrated);
        return new BackfillResult(candidateIds.size(), migrated);
    }

    /**
     * Re-encrypt legacy {@code benefit_dependents} PII columns (national_id,
     * passport_number, phone, email, address, pre_existing_conditions).
     */
    @Transactional
    public BackfillResult backfillBenefitDependents() {
        // OR'd predicate catches a row if ANY encrypted column is still plaintext.
        // Re-saving the whole entity once re-encrypts every @Convert'd field on it.
        List<UUID> candidateIds = findLegacyIds(
                "SELECT id FROM benefit_dependents WHERE " +
                        "(national_id IS NOT NULL AND national_id NOT LIKE '%:%') OR " +
                        "(passport_number IS NOT NULL AND passport_number NOT LIKE '%:%') OR " +
                        "(phone IS NOT NULL AND phone NOT LIKE '%:%') OR " +
                        "(email IS NOT NULL AND email NOT LIKE '%:%') OR " +
                        "(address IS NOT NULL AND address NOT LIKE '%:%') OR " +
                        "(pre_existing_conditions IS NOT NULL AND pre_existing_conditions NOT LIKE '%:%')");
        int migrated = 0;
        for (UUID id : candidateIds) {
            try {
                if (benefitDependentRepository.findById(id)
                        .map(dep -> {
                            benefitDependentRepository.save(dep);
                            return true;
                        }).orElse(false)) {
                    migrated++;
                }
            } catch (Exception e) {
                log.warn("Failed to re-encrypt benefit_dependents id={}: {}", id, e.getMessage());
            }
        }
        log.info("Backfill benefit_dependents: candidates={}, migrated={}", candidateIds.size(), migrated);
        return new BackfillResult(candidateIds.size(), migrated);
    }

    /**
     * Re-encrypt legacy {@code tax_declarations.previous_employer_pan} values.
     */
    @Transactional
    public BackfillResult backfillTaxDeclarations() {
        List<UUID> candidateIds = findLegacyIds(
                "SELECT id FROM tax_declarations WHERE previous_employer_pan IS NOT NULL " +
                        "AND previous_employer_pan NOT LIKE '%:%'");
        int migrated = 0;
        for (UUID id : candidateIds) {
            try {
                if (taxDeclarationRepository.findById(id)
                        .map(td -> {
                            taxDeclarationRepository.save(td);
                            return true;
                        }).orElse(false)) {
                    migrated++;
                }
            } catch (Exception e) {
                log.warn("Failed to re-encrypt tax_declarations id={}: {}", id, e.getMessage());
            }
        }
        log.info("Backfill tax_declarations.previous_employer_pan: candidates={}, migrated={}",
                candidateIds.size(), migrated);
        return new BackfillResult(candidateIds.size(), migrated);
    }

    // ─── Internals ─────────────────────────────────────────────────────────────

    private List<UUID> findLegacyIds(String sql) {
        return jdbc.queryForList(sql, UUID.class);
    }

    /**
     * Triggers a save-round-trip only when the in-memory value is still legacy
     * (no ":" delimiter), preventing accidental double-encrypt on idempotent runs.
     */
    private boolean resaveUser(com.hrms.domain.user.User user) {
        String secret = user.getMfaSecret();
        if (secret == null || secret.contains(":")) {
            return false;
        }
        userRepository.save(user);
        return true;
    }

    /**
     * Result of a backfill pass.
     *
     * @param totalCandidates      rows matching the legacy pattern at scan time
     * @param successfullyMigrated rows successfully re-saved (and therefore re-encrypted)
     */
    public record BackfillResult(int totalCandidates, int successfullyMigrated) {
    }
}
