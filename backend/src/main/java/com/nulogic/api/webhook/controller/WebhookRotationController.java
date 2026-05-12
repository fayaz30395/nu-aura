package com.nulogic.api.webhook.controller;

import com.nulogic.application.webhook.service.WebhookService;
import com.nulogic.application.webhook.service.WebhookService.SecretRotationResult;
import com.nulogic.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.UUID;

import static com.nulogic.common.security.Permission.SYSTEM_ADMIN;

/**
 * Admin-only endpoint for rotating a webhook's HMAC signing secret with a 24-hour
 * dual-secret window (Wave-10 P0-5).
 *
 * <p>Sits under {@code /api/v1/admin/webhooks/...} rather than the public
 * {@code /api/webhooks} surface used by {@link WebhookController} so the URL itself
 * signals that this is a privileged operation. Authorization is enforced via
 * {@link RequiresPermission} with {@code revalidate = true} — we never trust stale
 * JWT claims for a secret-mutating operation.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/webhooks")
@RequiredArgsConstructor
@Tag(name = "Webhook Admin", description = "Privileged webhook operations (secret rotation, etc.)")
@SecurityRequirement(name = "bearerAuth")
public class WebhookRotationController {

    private final WebhookService webhookService;

    /**
     * Rotate a webhook's HMAC signing secret.
     *
     * <p><strong>Behaviour:</strong> generates a fresh 32-byte CSPRNG secret, retains
     * the previous secret for 24h so in-flight retries (and consumer-side replay
     * verification) continue to work, then returns the new secret to the caller
     * <em>once</em>. The admin MUST persist the response — there is no API to read
     * the secret back later.</p>
     *
     * <p><strong>Authorization:</strong> {@code SYSTEM_ADMIN} with {@code revalidate = true}
     * — every call hits the DB to confirm the user still has the permission, defending
     * against stale JWTs after a role change.</p>
     *
     * @param id webhook UUID — must belong to the caller's tenant
     * @return {@link RotateSecretResponse} containing the freshly minted secret and
     * the timestamp at which the previous secret stops being honoured
     */
    @PostMapping("/{id}/rotate-secret")
    @RequiresPermission(value = SYSTEM_ADMIN, revalidate = true)
    @Operation(summary = "Rotate webhook secret",
            description = "Generate a new HMAC signing secret for a webhook. The previous secret " +
                    "remains valid for verification for 24 hours so in-flight retries are not " +
                    "broken. The new secret is returned ONCE — the admin must share it with the " +
                    "webhook consumer out-of-band.")
    public ResponseEntity<RotateSecretResponse> rotateSecret(@PathVariable UUID id) {
        SecretRotationResult result = webhookService.rotateSecret(id);
        log.info("Webhook {} secret rotated (admin endpoint); previous valid until {}",
                id, result.previousSecretExpiresAt());
        return ResponseEntity.ok(new RotateSecretResponse(
                result.webhookId(),
                result.newSecret(),
                result.previousSecretExpiresAt()
        ));
    }

    /**
     * Response payload for {@link #rotateSecret(UUID)}.
     *
     * <p>{@code newSecret} is the freshly minted Base64-encoded secret. The admin is
     * expected to capture this immediately and share it out-of-band with the consumer —
     * the platform will not return it again.</p>
     *
     * <p>{@code previousSecretExpiresAt} tells the admin how long the consumer has to
     * cut over before signatures generated under the previous secret stop verifying.</p>
     */
    public record RotateSecretResponse(
            UUID webhookId,
            String newSecret,
            LocalDateTime previousSecretExpiresAt
    ) {
    }
}
