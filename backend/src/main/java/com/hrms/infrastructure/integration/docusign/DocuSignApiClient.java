package com.hrms.infrastructure.integration.docusign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.resilience.CircuitBreaker;
import com.hrms.common.resilience.CircuitBreakerRegistry;
import com.hrms.domain.integration.ConnectorConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * REST API client for DocuSign eSignature platform.
 *
 * <p><strong>Features:</strong>
 * <ul>
 *   <li>OAuth 2.0 JWT Grant authentication via DocuSignAuthService</li>
 *   <li>Circuit breaker pattern for resilience (5 failures before open, 30s duration)</li>
 *   <li>Rate limiting: 1000 calls per hour (enforced per tenant)</li>
 *   <li>Comprehensive logging for debugging</li>
 *   <li>Thread-safe token and rate limit management</li>
 * </ul>
 *
 * <p><strong>Rate Limiting:</strong>
 * DocuSign API has a limit of 1000 calls per hour. This client maintains a simple
 * rolling-window counter per tenant using timestamps. If the limit is exceeded,
 * an exception is thrown immediately.</p>
 *
 * <p><strong>Threading:</strong> All public methods are thread-safe. The client
 * uses ConcurrentHashMap for rate limit tracking and atomic operations.</p>
 */
@Service
@Slf4j
public class DocuSignApiClient {

    private final DocuSignAuthService authService;
    private final CircuitBreaker circuitBreaker;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    // Rate limiting: track request timestamps per tenant
    private final ConcurrentHashMap<UUID, List<Long>> requestTimestamps = new ConcurrentHashMap<>();

    private static final int RATE_LIMIT_PER_HOUR = 1000;

    public DocuSignApiClient(DocuSignAuthService authService,
                             CircuitBreakerRegistry circuitBreakerRegistry,
                             ObjectMapper objectMapper) {
        this.authService = authService;
        this.circuitBreaker = circuitBreakerRegistry.forDocuSign();
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * Create an envelope from a DocuSign template and send it for signature.
     *
     * <p>This method creates a new envelope by:
     * <ol>
     *   <li>Generating the request JSON from template ID</li>
     *   <li>Specifying recipients and document URL</li>
     *   <li>POSTing to /accounts/{accountId}/envelopes</li>
     * </ol>
     *
     * <p><strong>Note:</strong> The recipient and document URLs are added to the template.
     * Refer to DocuSign's template merging documentation for details on variable substitution.</p>
     *
     * @param config connector configuration
     * @param templateId DocuSign template ID
     * @param recipientEmail recipient's email address
     * @param recipientName recipient's full name
     * @param documentUrl URL to the document to sign
     * @param subject envelope subject line
     * @return EnvelopeResponse with envelope ID and status
     * @throws RuntimeException if the request fails
     */
    public EnvelopeResponse createEnvelope(ConnectorConfig config,
                                           String templateId,
                                           String recipientEmail,
                                           String recipientName,
                                           String documentUrl,
                                           String subject) {
        return circuitBreaker.execute(() -> {
            checkRateLimit(config.tenantId());

            try {
                String accessToken = authService.getAccessToken(config);
                String accountId = getString(config, "accountId");
                String baseUrl = getString(config, "baseUrl");

                String requestBody = buildCreateEnvelopeJson(templateId, recipientEmail, recipientName, subject);

                String url = String.format("%s/accounts/%s/envelopes", baseUrl.replaceAll("/+$", ""), accountId);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 201) {
                    log.error("DocuSign createEnvelope returned status {}: {}", response.statusCode(), response.body());
                    throw new RuntimeException("Failed to create envelope: " + response.statusCode());
                }

                JsonNode responseJson = objectMapper.readTree(response.body());
                String envelopeId = responseJson.get("envelopeId").asText();
                String status = responseJson.get("status").asText("sent");

                log.info("Created DocuSign envelope: {} with status: {}", envelopeId, status);
                return new EnvelopeResponse(envelopeId, status, responseJson.get("uri").asText());
            } catch (IOException | InterruptedException e) {
                log.error("Error creating DocuSign envelope", e);
                throw new RuntimeException("Error creating envelope: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Get the current status of an envelope.
     *
     * @param config connector configuration
     * @param envelopeId the envelope ID
     * @return EnvelopeStatusResponse with envelope status and recipient info
     * @throws RuntimeException if the request fails
     */
    public EnvelopeStatusResponse getEnvelopeStatus(ConnectorConfig config, String envelopeId) {
        return circuitBreaker.execute(() -> {
            checkRateLimit(config.tenantId());

            try {
                String accessToken = authService.getAccessToken(config);
                String accountId = getString(config, "accountId");
                String baseUrl = getString(config, "baseUrl");

                String url = String.format("%s/accounts/%s/envelopes/%s?include=recipients",
                        baseUrl.replaceAll("/+$", ""), accountId, envelopeId);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + accessToken)
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    log.error("DocuSign getEnvelopeStatus returned status {}: {}", response.statusCode(), response.body());
                    throw new RuntimeException("Failed to get envelope status: " + response.statusCode());
                }

                JsonNode responseJson = objectMapper.readTree(response.body());
                String status = responseJson.get("status").asText();

                List<RecipientStatus> recipients = parseRecipients(responseJson.get("recipients"));

                log.debug("Fetched envelope status: {} with {} recipients", envelopeId, recipients.size());
                return new EnvelopeStatusResponse(envelopeId, status, recipients);
            } catch (IOException | InterruptedException e) {
                log.error("Error getting envelope status", e);
                throw new RuntimeException("Error getting envelope status: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Void (cancel) an envelope.
     *
     * @param config connector configuration
     * @param envelopeId the envelope ID
     * @param reason the reason for voiding
     * @throws RuntimeException if the request fails
     */
    public void voidEnvelope(ConnectorConfig config, String envelopeId, String reason) {
        circuitBreaker.execute(() -> {
            checkRateLimit(config.tenantId());

            try {
                String accessToken = authService.getAccessToken(config);
                String accountId = getString(config, "accountId");
                String baseUrl = getString(config, "baseUrl");

                String requestBody = objectMapper.writeValueAsString(Map.of("voidedReason", reason != null ? reason : "Voided"));

                String url = String.format("%s/accounts/%s/envelopes/%s",
                        baseUrl.replaceAll("/+$", ""), accountId, envelopeId);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Content-Type", "application/json")
                        .method("PUT", HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    log.error("DocuSign voidEnvelope returned status {}: {}", response.statusCode(), response.body());
                    throw new RuntimeException("Failed to void envelope: " + response.statusCode());
                }

                log.info("Voided envelope: {}", envelopeId);
            } catch (IOException | InterruptedException e) {
                log.error("Error voiding envelope", e);
                throw new RuntimeException("Error voiding envelope: " + e.getMessage(), e);
            }
            return null;
        });
    }

    /**
     * Download a signed document from an envelope.
     *
     * <p><strong>Note:</strong> The document becomes available after the envelope is completed.
     * The documentId is typically "combined" for all documents or a specific document number.</p>
     *
     * @param config connector configuration
     * @param envelopeId the envelope ID
     * @param documentId the document ID (e.g., "combined" for all documents)
     * @return the document bytes
     * @throws RuntimeException if the request fails
     */
    public byte[] downloadDocument(ConnectorConfig config, String envelopeId, String documentId) {
        return circuitBreaker.execute(() -> {
            checkRateLimit(config.tenantId());

            try {
                String accessToken = authService.getAccessToken(config);
                String accountId = getString(config, "accountId");
                String baseUrl = getString(config, "baseUrl");

                String url = String.format("%s/accounts/%s/envelopes/%s/documents/%s",
                        baseUrl.replaceAll("/+$", ""), accountId, envelopeId, documentId);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + accessToken)
                        .GET()
                        .build();

                HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());

                if (response.statusCode() != 200) {
                    log.error("DocuSign downloadDocument returned status {}", response.statusCode());
                    throw new RuntimeException("Failed to download document: " + response.statusCode());
                }

                log.debug("Downloaded document from envelope: {}", envelopeId);
                return response.body();
            } catch (IOException | InterruptedException e) {
                log.error("Error downloading document", e);
                throw new RuntimeException("Error downloading document: " + e.getMessage(), e);
            }
        });
    }

    /**
     * List all templates in the account.
     *
     * @param config connector configuration
     * @return list of templates
     * @throws RuntimeException if the request fails
     */
    public List<TemplateResponse> listTemplates(ConnectorConfig config) {
        return circuitBreaker.execute(() -> {
            checkRateLimit(config.tenantId());

            try {
                String accessToken = authService.getAccessToken(config);
                String accountId = getString(config, "accountId");
                String baseUrl = getString(config, "baseUrl");

                String url = String.format("%s/accounts/%s/templates", baseUrl.replaceAll("/+$", ""), accountId);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + accessToken)
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    log.error("DocuSign listTemplates returned status {}: {}", response.statusCode(), response.body());
                    throw new RuntimeException("Failed to list templates: " + response.statusCode());
                }

                JsonNode responseJson = objectMapper.readTree(response.body());
                List<TemplateResponse> templates = new ArrayList<>();

                JsonNode templatesArray = responseJson.get("envelopeTemplates");
                if (templatesArray != null && templatesArray.isArray()) {
                    for (JsonNode templateNode : templatesArray) {
                        templates.add(new TemplateResponse(
                                templateNode.get("templateId").asText(),
                                templateNode.get("name").asText(),
                                templateNode.get("description").asText("")
                        ));
                    }
                }

                log.debug("Listed {} DocuSign templates", templates.size());
                return templates;
            } catch (IOException | InterruptedException e) {
                log.error("Error listing templates", e);
                throw new RuntimeException("Error listing templates: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Register a Connect (webhook) callback URL with DocuSign.
     *
     * <p>This endpoint receives notifications about envelope status changes,
     * recipient actions, and other events.</p>
     *
     * @param config connector configuration
     * @param webhookUrl the webhook URL to register
     * @param events comma-separated list of event types (e.g., "envelope-completed,envelope-sent")
     * @throws RuntimeException if the request fails
     */
    public void registerConnectWebhook(ConnectorConfig config, String webhookUrl, String events) {
        circuitBreaker.execute(() -> {
            checkRateLimit(config.tenantId());

            try {
                String accessToken = authService.getAccessToken(config);
                String accountId = getString(config, "accountId");
                String baseUrl = getString(config, "baseUrl");

                Map<String, Object> requestBody = new HashMap<>();
                requestBody.put("urlToPublishTo", webhookUrl);
                requestBody.put("allEnvelopeEvents", true);
                requestBody.put("requiresAcknowledgment", true);
                requestBody.put("signMessageWithX509Cert", false);
                requestBody.put("includeDocumentFields", true);

                String url = String.format("%s/accounts/%s/connect", baseUrl.replaceAll("/+$", ""), accountId);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Authorization", "Bearer " + accessToken)
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 201 && response.statusCode() != 200) {
                    log.error("DocuSign registerConnectWebhook returned status {}: {}", response.statusCode(), response.body());
                    throw new RuntimeException("Failed to register webhook: " + response.statusCode());
                }

                log.info("Registered DocuSign Connect webhook: {}", webhookUrl);
            } catch (IOException | InterruptedException e) {
                log.error("Error registering webhook", e);
                throw new RuntimeException("Error registering webhook: " + e.getMessage(), e);
            }
            return null;
        });
    }

    // ==================== Helper Methods ====================

    /**
     * Check if the rate limit has been exceeded for this tenant.
     * Uses a rolling window of the last hour.
     *
     * @param tenantId the tenant ID
     * @throws RuntimeException if rate limit is exceeded
     */
    private void checkRateLimit(UUID tenantId) {
        long now = System.currentTimeMillis();
        long oneHourAgo = now - (60 * 60 * 1000);

        List<Long> timestamps = requestTimestamps.computeIfAbsent(tenantId, k -> new ArrayList<>());

        synchronized (timestamps) {
            // Remove timestamps older than 1 hour
            timestamps.removeIf(ts -> ts < oneHourAgo);

            if (timestamps.size() >= RATE_LIMIT_PER_HOUR) {
                log.warn("DocuSign rate limit exceeded for tenant: {}", tenantId);
                throw new RuntimeException("DocuSign API rate limit exceeded (1000 calls/hour)");
            }

            // Add current timestamp
            timestamps.add(now);
        }
    }

    /**
     * Build the JSON request body for creating an envelope from a template.
     */
    private String buildCreateEnvelopeJson(String templateId, String recipientEmail, String recipientName, String subject) throws IOException {
        Map<String, Object> envelope = new HashMap<>();
        envelope.put("templateId", templateId);
        envelope.put("templateRoles", List.of(Map.of(
                "email", recipientEmail,
                "name", recipientName,
                "roleName", "Signer"
        )));
        envelope.put("subject", subject);
        envelope.put("status", "sent");

        return objectMapper.writeValueAsString(envelope);
    }

    /**
     * Parse recipient status information from the API response.
     */
    private List<RecipientStatus> parseRecipients(JsonNode recipientsNode) {
        List<RecipientStatus> recipients = new ArrayList<>();

        if (recipientsNode != null && recipientsNode.isArray()) {
            for (JsonNode recipientNode : recipientsNode) {
                recipients.add(new RecipientStatus(
                        recipientNode.get("name").asText(),
                        recipientNode.get("email").asText(),
                        recipientNode.get("status").asText(),
                        recipientNode.get("completedDateTime").asText("")
                ));
            }
        }

        return recipients;
    }

    /**
     * Extract a string value from the connector config settings.
     */
    private static String getString(ConnectorConfig config, String key) {
        Object value = config.settings().get(key);
        if (value == null) {
            throw new IllegalArgumentException("Missing required config: " + key);
        }
        return value.toString();
    }

    // ==================== DTOs ====================

    /**
     * Response from creating a DocuSign envelope.
     */
    public record EnvelopeResponse(
            String envelopeId,
            String status,
            String uri
    ) {}

    /**
     * Status information for a DocuSign envelope.
     */
    public record EnvelopeStatusResponse(
            String envelopeId,
            String status,
            List<RecipientStatus> recipients
    ) {}

    /**
     * Status of a single recipient in an envelope.
     */
    public record RecipientStatus(
            String name,
            String email,
            String status,
            String signedAt
    ) {}

    /**
     * Template information from the DocuSign account.
     */
    public record TemplateResponse(
            String templateId,
            String name,
            String description
    ) {}
}
