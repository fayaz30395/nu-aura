package com.nulogic.api.admin.controller;

import com.nulogic.application.security.service.EncryptionBackfillService;
import com.nulogic.application.security.service.EncryptionBackfillService.BackfillResult;
import com.nulogic.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.nulogic.common.security.Permission.SYSTEM_ADMIN;

/**
 * SuperAdmin-only endpoints to drive the one-time re-encryption backfill that
 * complements Flyway V147 and V271. Each endpoint scans a single table and re-saves
 * legacy plaintext rows through the JPA {@code @Convert} pipeline, producing
 * IV-prefixed ciphertext on the next write.
 *
 * <p>All endpoints are idempotent: re-running a backfill after every row has
 * been encrypted is a no-op because the candidate-id query filters on rows
 * lacking the {@code ":"} delimiter used by {@code EncryptedStringConverter},
 * or on rows where the encrypted column is still NULL (for the DOB endpoint).
 */
@RestController
@RequestMapping("/api/v1/admin/encryption-backfill")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Encryption Backfill",
        description = "One-time re-encryption of legacy plaintext PII rows (post-V147 / post-V271)")
public class EncryptionBackfillController {

    private final EncryptionBackfillService service;

    @PostMapping("/users/mfa-secrets")
    @Operation(summary = "Re-encrypt users.mfa_secret",
            description = "Scans users with a plaintext mfa_secret and re-saves them so the column is " +
                    "rewritten in the IV-prefixed AES-GCM ciphertext format.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<BackfillResult> backfillMfaSecrets() {
        log.info("SuperAdmin triggering backfill: users.mfa_secret");
        return ResponseEntity.ok(service.backfillUserMfaSecrets());
    }

    @PostMapping("/benefit-dependents")
    @Operation(summary = "Re-encrypt benefit_dependents PII columns",
            description = "Scans benefit_dependents rows with any legacy plaintext PII column " +
                    "(national_id, passport_number, phone, email, address, pre_existing_conditions) " +
                    "and re-saves them so every encrypted column is rewritten in AES-GCM format.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<BackfillResult> backfillBenefitDependents() {
        log.info("SuperAdmin triggering backfill: benefit_dependents PII");
        return ResponseEntity.ok(service.backfillBenefitDependents());
    }

    @PostMapping("/benefit-dependents/dob")
    @Operation(summary = "Backfill benefit_dependents.date_of_birth_enc (V271)",
            description = "Copies the legacy plaintext date_of_birth DATE column into the new " +
                    "AES-GCM encrypted date_of_birth_enc TEXT column for all un-migrated rows. " +
                    "Idempotent: rows already having a non-null date_of_birth_enc are skipped. " +
                    "PREREQUISITE: ENCRYPTION_KEY environment variable must be set.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<BackfillResult> backfillBenefitDependentDob() {
        log.info("SuperAdmin triggering backfill: benefit_dependents.date_of_birth_enc (V271)");
        return ResponseEntity.ok(service.backfillBenefitDependentDob());
    }

    @PostMapping("/tax-declarations")
    @Operation(summary = "Re-encrypt tax_declarations.previous_employer_pan",
            description = "Scans tax_declarations with plaintext previous_employer_pan values and " +
                    "re-saves them in AES-GCM ciphertext format.")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    public ResponseEntity<BackfillResult> backfillTaxDeclarations() {
        log.info("SuperAdmin triggering backfill: tax_declarations.previous_employer_pan");
        return ResponseEntity.ok(service.backfillTaxDeclarations());
    }
}
