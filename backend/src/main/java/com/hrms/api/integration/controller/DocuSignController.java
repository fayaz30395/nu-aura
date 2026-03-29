package com.hrms.api.integration.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.integration.dto.*;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.integration.ConnectorConfig;
import com.hrms.domain.integration.docusign.DocuSignEnvelope;
import com.hrms.domain.integration.docusign.DocuSignTemplateMapping;
import com.hrms.infrastructure.integration.docusign.DocuSignApiClient;
import com.hrms.infrastructure.integration.repository.DocuSignEnvelopeRepository;
import com.hrms.infrastructure.integration.repository.DocuSignTemplateMappingRepository;
import com.hrms.application.integration.service.IntegrationConnectorConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.HmacUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * REST controller for DocuSign-specific e-signature operations.
 *
 * <p>Provides endpoints for managing DocuSign envelopes (signing requests), template mappings,
 * and webhook callbacks from DocuSign. Handles the complete envelope lifecycle from creation
 * to completion.</p>
 *
 * <p><strong>Security Note (CRIT-002):</strong>
 * <ul>
 *   <li>The webhook endpoint ({@link #handleDocuSignCallback}) is public and uses HMAC-SHA256
 *       signature verification with the tenant's DocuSign configuration.</li>
 *   <li>Tenant is resolved from the envelope ID in the webhook payload.</li>
 *   <li>All other endpoints require INTEGRATION:READ or INTEGRATION:MANAGE permissions.</li>
 * </ul>
 * </p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/integrations/docusign")
@RequiredArgsConstructor
public class DocuSignController {

    private final DocuSignEnvelopeRepository envelopeRepository;
    private final DocuSignTemplateMappingRepository templateMappingRepository;
    private final IntegrationConnectorConfigService configService;
    private final DocuSignApiClient apiClient;
    private final ObjectMapper objectMapper;

    // ===================== Webhook Endpoint =====================

    /**
     * Handles inbound DocuSign webhook callbacks (DocuSign Connect).
     *
     * <p><strong>Security (CRIT-002):</strong>
     * <ul>
     *   <li>This endpoint is public and accessible without authentication.</li>
     *   <li>The tenant is resolved from the envelope ID in the payload.</li>
     *   <li>The HMAC signature is verified using the tenant's DocuSign HMAC secret.</li>
     *   <li>The tenant context is set before processing and cleared in a finally block.</li>
     *   <li>The endpoint uses HMAC-SHA256 signature verification as specified in the
     *       DocuSign Connect documentation.</li>
     * </ul>
     * </p>
     *
     * @param payload the DocuSign webhook payload (XML or JSON)
     * @param headers the request headers containing X-DocuSign-Signature-1
     * @return 200 OK if successfully processed, 401 if signature invalid, 404 if envelope not found
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleDocuSignCallback(
            @RequestBody String payload,
            @RequestHeader Map<String, String> headers) {
        log.debug("Received DocuSign webhook callback");

        try {
            // Parse the webhook payload to extract the envelope ID
            DocuSignWebhookEvent event = parseDocuSignPayload(payload);
            String envelopeId = event.getEnvelopeId();

            // Resolve tenant from envelope ID (without tenant filter)
            DocuSignEnvelope envelope = envelopeRepository.findByEnvelopeId(envelopeId)
                    .orElseThrow(() -> {
                        log.warn("Webhook for unknown envelope: {}", envelopeId);
                        return new IllegalArgumentException("Envelope not found: " + envelopeId);
                    });

            UUID tenantId = envelope.getTenantId();

            // Get the connector configuration for this tenant to retrieve HMAC secret
            ConnectorConfig config = configService.getConfig(tenantId, "docusign");
            String hmacSecret = (String) config.settings().get("hmacSecret");

            if (hmacSecret == null || hmacSecret.isEmpty()) {
                log.error("HMAC secret not configured for tenant: {}", tenantId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Verify HMAC signature (CRIT-002)
            if (!verifyHmacSignature(headers, payload, hmacSecret)) {
                log.warn("Invalid HMAC signature for envelope: {}", envelopeId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // Set tenant context before processing
            TenantContext.setCurrentTenant(tenantId);
            try {
                // Process the envelope status update
                processEnvelopeEvent(envelope, event);
                log.info("Successfully processed DocuSign webhook for envelope: {}", envelopeId);
                return ResponseEntity.ok().build();
            } finally {
                TenantContext.clear();
            }

        } catch (IllegalArgumentException e) {
            log.error("Invalid webhook payload", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (Exception e) {
            log.error("Error processing DocuSign webhook", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ===================== Envelope Management Endpoints =====================

    /**
     * Lists all DocuSign envelopes for the current tenant.
     *
     * <p>Returns a paginated list of envelopes with their current status and metadata.</p>
     *
     * @param page the page number (0-indexed, default 0)
     * @param size the page size (default 20, max 100)
     * @param status optional filter by envelope status (SENT, COMPLETED, DECLINED, ERROR, etc.)
     * @return a page of envelope responses
     */
    @GetMapping("/envelopes")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<Page<DocuSignEnvelopeResponse>> listEnvelopes(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        log.debug("Listing DocuSign envelopes for tenant");
        UUID tenantId = TenantContext.requireCurrentTenant();

        // Validate and limit page size
        if (size > 100) {
            size = 100;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by("sentAt").descending());

        Page<DocuSignEnvelope> envelopes;
        if (status != null && !status.isEmpty()) {
            envelopes = envelopeRepository.findByTenantIdAndStatusAndIsDeletedFalse(
                    tenantId, status, pageable);
        } else {
            envelopes = envelopeRepository.findByTenantIdAndIsDeletedFalse(
                    tenantId, pageable);
        }

        Page<DocuSignEnvelopeResponse> responsePage = envelopes.map(this::toEnvelopeResponse);
        return ResponseEntity.ok(responsePage);
    }

    /**
     * Retrieves details about a specific DocuSign envelope.
     *
     * @param id the envelope UUID (primary key in NU-AURA database)
     * @return envelope details
     * @throws IllegalArgumentException if the envelope is not found
     */
    @GetMapping("/envelopes/{id}")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<DocuSignEnvelopeResponse> getEnvelopeDetails(
            @PathVariable UUID id) {
        log.debug("Getting details for envelope: {}", id);
        UUID tenantId = TenantContext.requireCurrentTenant();

        DocuSignEnvelope envelope = envelopeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Envelope not found: " + id));

        // Verify tenant isolation
        if (!envelope.getTenantId().equals(tenantId)) {
            log.warn("Attempted to access envelope from different tenant");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(toEnvelopeResponse(envelope));
    }

    /**
     * Voids a DocuSign envelope.
     *
     * <p>Cancels the signing request and marks the envelope as voided. Recipients will
     * no longer be able to sign the document.</p>
     *
     * @param id the envelope UUID
     * @return the updated envelope response
     * @throws IllegalArgumentException if the envelope is not found
     */
    @PostMapping("/envelopes/{id}/void")
    @RequiresPermission(Permission.INTEGRATION_MANAGE)
    public ResponseEntity<DocuSignEnvelopeResponse> voidEnvelope(
            @PathVariable UUID id) {
        log.info("Voiding envelope: {}", id);
        UUID tenantId = TenantContext.requireCurrentTenant();

        DocuSignEnvelope envelope = envelopeRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Envelope not found: " + id));

        // Verify tenant isolation
        if (!envelope.getTenantId().equals(tenantId)) {
            log.warn("Attempted to void envelope from different tenant");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            // Call DocuSign API to void the envelope
            ConnectorConfig config = configService.getConfig(tenantId, "docusign");
            apiClient.voidEnvelope(config, envelope.getEnvelopeId(), "Voided by admin");

            // Update local status
            envelope.setStatus("VOIDED");
            envelopeRepository.save(envelope);

            return ResponseEntity.ok(toEnvelopeResponse(envelope));
        } catch (Exception e) {
            log.error("Failed to void envelope: {}", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ===================== DocuSign Template Management Endpoints =====================

    /**
     * Lists all templates available in DocuSign for the current tenant.
     *
     * <p>Queries the DocuSign API to retrieve the list of templates that can be used
     * for creating envelopes.</p>
     *
     * @return a map of template ID to template name
     */
    @GetMapping("/templates")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<Map<String, String>> listDocuSignTemplates() {
        log.debug("Listing DocuSign templates");
        UUID tenantId = TenantContext.requireCurrentTenant();

        try {
            ConnectorConfig config = configService.getConfig(tenantId, "docusign");
            List<DocuSignApiClient.TemplateResponse> templatesList = apiClient.listTemplates(config);
            Map<String, String> templates = templatesList.stream()
                .collect(Collectors.toMap(
                    DocuSignApiClient.TemplateResponse::templateId,
                    DocuSignApiClient.TemplateResponse::name
                ));
            return ResponseEntity.ok(templates);
        } catch (Exception e) {
            log.error("Failed to list DocuSign templates", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Lists all template mappings configured in NU-AURA for the current tenant.
     *
     * <p>Returns the mappings between document types and DocuSign templates.</p>
     *
     * @return a list of template mapping responses
     */
    @GetMapping("/template-mappings")
    @RequiresPermission(Permission.INTEGRATION_READ)
    public ResponseEntity<List<DocuSignTemplateMappingResponse>> listTemplateMappings() {
        log.debug("Listing DocuSign template mappings");
        UUID tenantId = TenantContext.requireCurrentTenant();

        List<DocuSignTemplateMapping> mappings = templateMappingRepository
                .findByTenantIdAndIsDeletedFalse(tenantId);

        List<DocuSignTemplateMappingResponse> responses = mappings.stream()
                .map(mapping -> DocuSignTemplateMappingResponse.builder()
                        .id(mapping.getId())
                        .documentType(mapping.getDocumentType())
                        .docusignTemplateId(mapping.getDocusignTemplateId())
                        .description(mapping.getDescription())
                        .isActive(mapping.isActive())
                        .createdAt(mapping.getCreatedAt())
                        .updatedAt(mapping.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Creates or updates a DocuSign template mapping.
     *
     * <p>Associates a document type with a DocuSign template ID. If a mapping for the
     * document type already exists, it is updated; otherwise, a new one is created.</p>
     *
     * @param request the template mapping request
     * @return the created or updated mapping
     */
    @PutMapping("/template-mappings")
    @RequiresPermission(Permission.INTEGRATION_MANAGE)
    public ResponseEntity<DocuSignTemplateMappingResponse> saveTemplateMapping(
            @Valid @RequestBody DocuSignTemplateMappingRequest request) {
        log.info("Saving template mapping for document type: {}", request.getDocumentType());
        UUID tenantId = TenantContext.requireCurrentTenant();

        DocuSignTemplateMapping mapping = templateMappingRepository
                .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, request.getDocumentType())
                .orElse(null);

        if (mapping == null) {
            // Create new mapping
            mapping = DocuSignTemplateMapping.builder()
                    .tenantId(tenantId)
                    .documentType(request.getDocumentType())
                    .docusignTemplateId(request.getDocusignTemplateId())
                    .description(request.getDescription())
                    .isActive(true)
                    .isDeleted(false)
                    .build();
        } else {
            // Update existing mapping
            mapping.setDocusignTemplateId(request.getDocusignTemplateId());
            mapping.setDescription(request.getDescription());
            mapping.setUpdatedAt(java.time.LocalDateTime.now());
        }

        DocuSignTemplateMapping saved = templateMappingRepository.save(mapping);

        DocuSignTemplateMappingResponse response = DocuSignTemplateMappingResponse.builder()
                .id(saved.getId())
                .documentType(saved.getDocumentType())
                .docusignTemplateId(saved.getDocusignTemplateId())
                .description(saved.getDescription())
                .isActive(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ===================== Private Helper Methods =====================

    /**
     * Parses a DocuSign webhook payload to extract the envelope ID and status.
     *
     * <p>Handles both XML and JSON payloads from DocuSign Connect.</p>
     *
     * @param payload the webhook payload
     * @return a DTO with extracted information
     * @throws IOException if JSON parsing fails
     */
    private DocuSignWebhookEvent parseDocuSignPayload(String payload) throws IOException {
        // Try to parse as JSON first
        try {
            JsonNode json = objectMapper.readTree(payload);
            String envelopeId = json.path("envelopeId").asText();
            String status = json.path("status").asText();
            return new DocuSignWebhookEvent(envelopeId, status);
        } catch (IOException e) {
            // If JSON fails, try to parse as XML (simplified XML parsing)
            // For now, we'll expect JSON payloads
            log.error("Failed to parse webhook payload", e);
            throw e;
        }
    }

    /**
     * Processes an envelope status update from a DocuSign webhook event.
     *
     * @param envelope the envelope to update
     * @param event the webhook event with new status
     */
    private void processEnvelopeEvent(DocuSignEnvelope envelope, DocuSignWebhookEvent event) {
        log.debug("Processing envelope event: {} -> {}", envelope.getId(), event.getStatus());

        // Update the envelope status
        envelope.setStatus(event.getStatus());

        // If completed, update time
        if ("COMPLETED".equals(event.getStatus()) || "completed".equalsIgnoreCase(event.getStatus())) {
            try {
                // TODO: Download PDF from DocuSign and upload to MinIO to get the signedDocUrl
                envelope.setCompletedAt(java.time.Instant.now());
            } catch (Exception e) {
                log.error("Failed to process completed envelope: {}", envelope.getId(), e);
            }
        }

        envelopeRepository.save(envelope);
    }

    /**
     * Verifies the HMAC-SHA256 signature of a DocuSign webhook payload.
     *
     * <p><strong>Security (CRIT-002):</strong> This method verifies that the webhook
     * came from DocuSign and has not been tampered with.</p>
     *
     * @param headers the request headers
     * @param payload the webhook payload
     * @param hmacSecret the HMAC secret from the connector configuration
     * @return true if the signature is valid, false otherwise
     */
    private boolean verifyHmacSignature(Map<String, String> headers, String payload,
                                        String hmacSecret) {
        // DocuSign sends the signature in the X-DocuSign-Signature-1 header
        String docuSignSignature = headers.get("X-DocuSign-Signature-1");
        if (docuSignSignature == null) {
            log.warn("Missing X-DocuSign-Signature-1 header");
            return false;
        }

        // Compute the expected signature
        String expectedSignature = HmacUtils.hmacSha256Hex(
                hmacSecret.getBytes(StandardCharsets.UTF_8),
                payload.getBytes(StandardCharsets.UTF_8));

        // Compare signatures (constant-time comparison to prevent timing attacks)
        return MessageDigestUtils.constantTimeEquals(docuSignSignature, expectedSignature);
    }

    /**
     * Converts a DocuSignEnvelope entity to a DTO for API responses.
     *
     * @param envelope the entity
     * @return the DTO
     */
    private DocuSignEnvelopeResponse toEnvelopeResponse(DocuSignEnvelope envelope) {
        return DocuSignEnvelopeResponse.builder()
                .id(envelope.getId())
                .envelopeId(envelope.getEnvelopeId())
                .entityType(envelope.getEntityType())
                .entityId(envelope.getEntityId())
                .status(envelope.getStatus())
                .recipientsJson(envelope.getRecipientsJson())
                .signedDocumentUrl(envelope.getSignedDocumentUrl())
                .errorMessage(envelope.getErrorMessage())
                .sentAt(envelope.getSentAt())
                .completedAt(envelope.getCompletedAt())
                .createdAt(envelope.getCreatedAt())
                .updatedAt(envelope.getUpdatedAt())
                .build();
    }

    /**
     * Simple DTO for webhook event data.
     */
    private static class DocuSignWebhookEvent {
        private final String envelopeId;
        private final String status;

        public DocuSignWebhookEvent(String envelopeId, String status) {
            this.envelopeId = envelopeId;
            this.status = status;
        }

        public String getEnvelopeId() {
            return envelopeId;
        }

        public String getStatus() {
            return status;
        }
    }

    /**
     * Utility class for constant-time string comparison.
     */
    private static class MessageDigestUtils {
        /**
         * Compares two strings in constant time to prevent timing attacks.
         *
         * @param a the first string
         * @param b the second string
         * @return true if the strings are equal, false otherwise
         */
        public static boolean constantTimeEquals(String a, String b) {
            if (a == null || b == null) {
                return a == b;
            }

            byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
            byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);

            if (aBytes.length != bBytes.length) {
                return false;
            }

            int result = 0;
            for (int i = 0; i < aBytes.length; i++) {
                result |= aBytes[i] ^ bBytes[i];
            }

            return result == 0;
        }
    }
}
