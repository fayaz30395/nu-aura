package com.hrms.api.compliance.controller;

import com.hrms.application.compliance.service.DsrExportArtifact;
import com.hrms.application.compliance.service.DsrExportService;
import com.hrms.application.compliance.service.DsrService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * SYSTEM_ADMIN-gated fulfilment endpoint for GDPR Article 15 (Access) and
 * Article 20 (Portability) requests.
 *
 * <p>Lives at {@code /api/v1/admin/dsr/{id}/fulfill} rather than under the
 * existing {@code /api/v1/me/dsr/admin/...} prefix because:</p>
 *
 * <ul>
 *   <li>The route mounts at {@code /admin/...} top-level, signalling
 *       "true admin operation" — the {@code /me/dsr/admin} path remains for
 *       self-service status transitions handled by ops staff who already
 *       use that UI.</li>
 *   <li>Fulfilment returns a binary octet-stream rather than the JSON
 *       projections the existing admin routes return; routing it through a
 *       separate controller avoids cross-pollinating response contracts.</li>
 *   <li>Separating this controller keeps the audit / permission surface
 *       narrow — a future signed-URL flavour can replace just this class.</li>
 * </ul>
 *
 * <p>The actual aggregation + audit live in {@link DsrService} +
 * {@link DsrExportService}; this controller is intentionally thin.</p>
 */
@RestController
@RequestMapping("/api/v1/admin/dsr")
@RequiredArgsConstructor
@Tag(name = "GDPR DSR (Admin)", description = "SYSTEM_ADMIN fulfilment of Articles 15 / 20 requests")
public class DsrAdminFulfillmentController {

    private final DsrService dsrService;
    private final DsrExportService dsrExportService;

    /**
     * Fulfil a pending ACCESS / PORTABILITY request. Streams the rendered
     * artefact back inline as {@code application/octet-stream} with a
     * {@code Content-Disposition: attachment} header so browser callers
     * trigger a download. The {@code X-DSR-Artifact-Sha256} response header
     * carries the integrity anchor for callers integrating with downstream
     * archival systems.
     *
     * <p><strong>Security:</strong> gated by {@link Permission#SYSTEM_ADMIN}
     * with {@code revalidate = true} so the permission is re-checked against
     * the current DB role assignment rather than trusting JWT claims —
     * fulfilment exposes the requester's full PII graph and a stale JWT
     * with a recently-revoked admin role must not pass.</p>
     *
     * <p><strong>Signed-URL future:</strong> when the artefact exceeds the
     * 50 MB inline ceiling, the export pipeline throws
     * {@link DsrExportService.ArtifactTooLargeException}. The current
     * response is a placeholder 413 — a follow-up will swap this for a
     * pre-signed object-store URL pointing at a chunked upload. The signed
     * URL stub is intentionally not implemented here to keep the inline
     * fast-path lean.</p>
     */
    @PostMapping("/{id}/fulfill")
    @RequiresPermission(value = Permission.SYSTEM_ADMIN, revalidate = true)
    @Operation(
            summary = "Fulfil a GDPR Article 15 / 20 DSR request",
            description = "SYSTEM_ADMIN-only. Aggregates the requester's tenant-scoped "
                    + "personal data, renders a JSON artefact, stamps SHA-256 + size onto "
                    + "the DSR row, transitions PENDING → IN_PROGRESS → COMPLETED, writes "
                    + "an EXPORT audit row, and returns the artefact bytes inline."
    )
    public ResponseEntity<byte[]> fulfill(@PathVariable("id") UUID requestId) {
        DsrExportArtifact artefact = dsrService.processAccessOrPortability(requestId);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        headers.setContentDispositionFormData("attachment", artefact.filename());
        headers.setContentLength(artefact.size());
        // Integrity anchor — clients can recompute SHA-256 of the body and
        // compare against this header. Mirrors what's stamped on the DSR row.
        headers.set("X-DSR-Artifact-Sha256", dsrExportService.sha256Hex(artefact.bytes()));
        headers.set("X-DSR-Artifact-Type", artefact.type().name());

        return ResponseEntity.ok().headers(headers).body(artefact.bytes());
    }

    /**
     * Map the "artefact too large to deliver inline" signal to a 413 with a
     * machine-readable hint pointing at the (yet-to-ship) chunked-export
     * endpoint. We return JSON here even though the success path is
     * octet-stream — error envelopes follow the project-wide JSON contract.
     */
    @ExceptionHandler(DsrExportService.ArtifactTooLargeException.class)
    public ResponseEntity<java.util.Map<String, Object>> handleTooLarge(
            DsrExportService.ArtifactTooLargeException ex) {
        // 413 Payload Too Large — the artefact is bigger than what we can
        // safely render inline. Follow-up will publish a signed URL here.
        return ResponseEntity.status(413).body(java.util.Map.of(
                "error", "DSR_EXPORT_TOO_LARGE",
                "message", ex.getMessage(),
                "nextStep", "chunked-export-endpoint-pending"
        ));
    }
}
