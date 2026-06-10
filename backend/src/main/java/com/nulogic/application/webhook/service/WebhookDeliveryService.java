package com.nulogic.application.webhook.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.metrics.MetricsService;
import com.nulogic.common.resilience.CircuitBreaker;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.common.validation.SsrfProtectionUtils;
import com.nulogic.domain.webhook.Webhook;
import com.nulogic.domain.webhook.WebhookDelivery;
import com.nulogic.domain.webhook.WebhookDelivery.DeliveryStatus;
import com.nulogic.domain.webhook.WebhookEventType;
import com.nulogic.domain.webhook.WebhookStatus;
import com.nulogic.infrastructure.webhook.repository.WebhookDeliveryRepository;
import com.nulogic.infrastructure.webhook.repository.WebhookRepository;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for reliable webhook delivery with retries and circuit breaker.
 *
 * <p><strong>Features:</strong></p>
 * <ul>
 *   <li>Asynchronous delivery for non-blocking event processing</li>
 *   <li>Exponential backoff retry strategy (1m, 5m, 15m, 1h)</li>
 *   <li>HMAC-SHA256 signature for payload verification</li>
 *   <li>Circuit breaker to prevent overwhelming failing endpoints</li>
 *   <li>Idempotency via event ID tracking</li>
 *   <li>Metrics for monitoring delivery success/failure rates</li>
 * </ul>
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WebhookDeliveryService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String SIGNATURE_HEADER = "X-Webhook-Signature";
    private static final String EVENT_ID_HEADER = "X-Webhook-Event-Id";
    private static final String EVENT_TYPE_HEADER = "X-Webhook-Event-Type";
    private static final String TIMESTAMP_HEADER = "X-Webhook-Timestamp";

    // Headers redacted from response storage to prevent secret leakage when admins
    // view delivery history. Mirrors the request-side forbidden list in WebhookController.
    private static final Set<String> SENSITIVE_RESPONSE_HEADERS = Set.of(
            "authorization", "cookie", "set-cookie", "proxy-authorization"
    );
    // Headers a webhook owner must NEVER be able to control on outbound delivery —
    // mirrors the controller-side allowlist filter. Defense in depth.
    private static final Set<String> FORBIDDEN_CUSTOM_HEADERS = Set.of(
            "authorization", "cookie", "set-cookie", "host", "content-length",
            "x-forwarded-for", "x-real-ip", "x-forwarded-host", "proxy-authorization"
    );
    private final WebhookRepository webhookRepository;
    private final WebhookDeliveryRepository deliveryRepository;
    private final WebhookService webhookService;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;
    private final MetricsService metricsService;
    private final TenantTimeService tenantTimeService;
    // NOTE: injected RestTemplate is the shared singleton from AIConfig. We do NOT use it
    // for outbound webhook delivery — instead deliveryRestTemplate (built in @PostConstruct)
    // has redirect-following disabled to close an SSRF-via-redirect bypass.
    private final RestTemplate restTemplate;
    // Circuit breakers per webhook URL to prevent cascading failures
    private final Map<UUID, CircuitBreaker> circuitBreakers = new ConcurrentHashMap<>();
    private static final int RETRY_BATCH_SIZE = 100;
    // INT-4: in-flight rows (PENDING/DELIVERING) untouched for this long are orphans from a
    // pod crash — the longest legitimate attempt is ~40s (10s connect + 30s read).
    private static final int STALE_IN_FLIGHT_MINUTES = 10;
    // Webhook-scoped RestTemplate with redirect-following disabled.
    private RestTemplate deliveryRestTemplate;

    /**
     * Build a webhook-scoped RestTemplate with redirect-following disabled.
     *
     * <p>Standard RestTemplate follows 3xx by default — an attacker who controls a
     * webhook endpoint can return a redirect to an internal address (169.254.169.254,
     * etc.) and bypass the SSRF check performed against the original URL.</p>
     *
     * <p>Using {@link SimpleClientHttpRequestFactory} subclassed to set
     * {@code setInstanceFollowRedirects(false)} on the underlying
     * {@link HttpURLConnection} avoids depending on apache HttpComponents.</p>
     */
    @PostConstruct
    void initDeliveryRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String httpMethod) throws java.io.IOException {
                super.prepareConnection(connection, httpMethod);
                // SECURITY: do NOT follow redirects — an attacker-controlled webhook
                // endpoint could redirect to an internal address.
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(10_000); // 10s
        factory.setReadTimeout(30_000);    // 30s
        this.deliveryRestTemplate = new RestTemplate(factory);
    }

    /**
     * Dispatch an event to all subscribed webhooks for the current tenant.
     *
     * @param eventType Type of event
     * @param payload   Event payload object
     */
    @Async
    @Transactional
    public void dispatchEvent(WebhookEventType eventType, Object payload) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            log.warn("Cannot dispatch webhook event without tenant context");
            return;
        }

        dispatchEvent(tenantId, eventType, payload);
    }

    /**
     * Dispatch an event to all subscribed webhooks for a specific tenant.
     * Uses cached webhook list for improved performance.
     */
    @Transactional
    public void dispatchEvent(UUID tenantId, WebhookEventType eventType, Object payload) {
        // Use cached webhook service for better performance
        List<Webhook> webhooks = webhookService.findActiveWebhooks(tenantId);

        String eventId = UUID.randomUUID().toString();
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(buildEventPayload(tenantId, eventType, eventId, payload));
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize webhook payload for event {}: {}", eventType, e.getMessage());
            return;
        }

        for (Webhook webhook : webhooks) {
            if (webhook.subscribesTo(eventType)) {
                // Check idempotency
                if (deliveryRepository.existsByWebhookIdAndEventId(webhook.getId(), eventId)) {
                    log.debug("Skipping duplicate event {} for webhook {}", eventId, webhook.getId());
                    continue;
                }

                WebhookDelivery delivery = WebhookDelivery.builder()
                        .webhookId(webhook.getId())
                        .eventType(eventType)
                        .eventId(eventId)
                        .payload(payloadJson)
                        .status(DeliveryStatus.PENDING)
                        .build();
                delivery.setTenantId(tenantId);

                delivery = deliveryRepository.save(delivery);

                // Attempt immediate delivery
                deliverWebhook(webhook, delivery);
            }
        }
    }

    /**
     * Attempt to deliver a webhook.
     */
    private void deliverWebhook(Webhook webhook, WebhookDelivery delivery) {
        CircuitBreaker circuitBreaker = getOrCreateCircuitBreaker(webhook.getId());

        // Check circuit breaker
        if (!circuitBreaker.allowRequest()) {
            log.debug("Circuit breaker open for webhook {}, scheduling retry", webhook.getId());
            delivery.setStatus(DeliveryStatus.RETRYING);
            // Resolve "now" in the webhook owner's local zone — the delivery row was created
            // by tenant-scoped code and downstream sweeps query nextRetryAt against the same
            // tenant zone, so they must agree.
            delivery.setNextRetryAt(tenantTimeService.now(webhook.getTenantId()).plusMinutes(5));
            deliveryRepository.save(delivery);
            return;
        }

        delivery.setStatus(DeliveryStatus.DELIVERING);
        deliveryRepository.save(delivery);

        long startTime = System.currentTimeMillis();
        int statusCode = 0;
        String responseBody = null;
        String errorMessage = null;

        try {
            // SECURITY: re-validate the webhook URL at delivery time. The URL was validated
            // at create/update via WebhookUrlValidator, but DNS may have changed (rebinding)
            // and a redirect could point elsewhere — deliveryRestTemplate blocks redirects.
            if (!SsrfProtectionUtils.isUrlSafe(webhook.getUrl())) {
                throw new BusinessException("Webhook URL blocked by SSRF policy: " + webhook.getUrl());
            }

            HttpHeaders headers = buildHeaders(webhook, delivery);
            HttpEntity<String> request = new HttpEntity<>(delivery.getPayload(), headers);

            ResponseEntity<String> response = deliveryRestTemplate.exchange(
                    webhook.getUrl(),
                    HttpMethod.POST,
                    request,
                    String.class
            );

            statusCode = response.getStatusCode().value();
            responseBody = sanitizeResponseBody(response.getBody(), response.getHeaders());

            // SECURITY: a 3xx from the receiver is treated as a delivery failure rather than
            // being followed. This closes the redirect-SSRF bypass: even if an attacker registers
            // a public webhook URL and tries to redirect us to a private host, we never follow it.
            if (response.getStatusCode().is3xxRedirection()) {
                RuntimeException redirectError = new RuntimeException("HTTP " + statusCode + " redirect not followed");
                circuitBreaker.recordFailure(redirectError);
                webhook.recordFailure("HTTP " + statusCode + " (redirect rejected)");
                webhookRepository.save(webhook);
                recordFailureMetric(webhook, statusCode);
                errorMessage = "Redirects are not followed for webhook delivery";
            } else if (response.getStatusCode().is2xxSuccessful()) {
                circuitBreaker.recordSuccess();
                webhook.recordSuccess();
                webhookRepository.save(webhook);
                recordSuccessMetric(webhook);
            } else {
                RuntimeException httpError = new RuntimeException("HTTP " + statusCode);
                circuitBreaker.recordFailure(httpError);
                webhook.recordFailure("HTTP " + statusCode);
                webhookRepository.save(webhook);
                recordFailureMetric(webhook, statusCode);
            }

        } catch (BusinessException e) {
            // SSRF policy rejection: record as failure but do not invoke the network.
            errorMessage = e.getMessage();
            circuitBreaker.recordFailure(e);
            webhook.recordFailure(errorMessage);
            webhookRepository.save(webhook);
            recordFailureMetric(webhook, 0);
            log.warn("Webhook delivery refused by SSRF policy for {} to {}: {}",
                    delivery.getEventId(), webhook.getUrl(), errorMessage);
        } catch (RuntimeException e) {
            // Intentional broad catch — external HTTP delivery; any transport error must be recorded
            errorMessage = e.getMessage();
            circuitBreaker.recordFailure(e);
            webhook.recordFailure(errorMessage);
            webhookRepository.save(webhook);
            recordFailureMetric(webhook, 0);
            log.error("Webhook delivery failed for {} to {}: {}", delivery.getEventId(), webhook.getUrl(), errorMessage);
        }

        long durationMs = System.currentTimeMillis() - startTime;
        delivery.recordAttempt(
                statusCode,
                responseBody,
                durationMs,
                errorMessage,
                tenantTimeService.now(delivery.getTenantId()));
        deliveryRepository.save(delivery);

        recordDurationMetric(webhook, durationMs);

        // Record to centralized metrics
        UUID tenantId = delivery.getTenantId();
        if (tenantId != null) {
            boolean success = errorMessage == null && statusCode >= 200 && statusCode < 300;
            metricsService.recordWebhookDelivery(
                    tenantId,
                    delivery.getEventType().name(),
                    success,
                    Duration.ofMillis(durationMs));
        }
    }

    /**
     * Build HTTP headers for webhook request.
     */
    private HttpHeaders buildHeaders(Webhook webhook, WebhookDelivery delivery) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(EVENT_ID_HEADER, delivery.getEventId());
        headers.set(EVENT_TYPE_HEADER, delivery.getEventType().name());
        headers.set(TIMESTAMP_HEADER, String.valueOf(System.currentTimeMillis()));

        // Add HMAC signature if secret is configured
        if (webhook.getSecret() != null && !webhook.getSecret().isBlank()) {
            String signature = computeSignature(delivery.getPayload(), webhook.getSecret());
            headers.set(SIGNATURE_HEADER, "sha256=" + signature);
        }

        // Add custom headers if configured (with forbidden-header filtering as a second
        // line of defense; the controller already strips these at create/update time).
        if (webhook.getCustomHeaders() != null) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, String> customHeaders = objectMapper.readValue(
                        webhook.getCustomHeaders(), Map.class);
                customHeaders.forEach((k, v) -> {
                    if (k == null) return;
                    if (FORBIDDEN_CUSTOM_HEADERS.contains(k.toLowerCase())) {
                        log.warn("Dropping forbidden custom header '{}' on webhook {}", k, webhook.getId());
                        return;
                    }
                    headers.set(k, v);
                });
            } catch (JsonProcessingException e) {
                log.warn("Failed to parse custom headers for webhook {}: {}", webhook.getId(), e.getMessage());
            }
        }

        return headers;
    }

    /**
     * Compute HMAC-SHA256 signature for payload verification.
     */
    private String computeSignature(String payload, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hmacBytes);
        } catch (java.security.GeneralSecurityException e) {
            log.error("Failed to compute HMAC signature: {}", e.getMessage());
            return "";
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    /**
     * Verify an inbound webhook signature, accepting EITHER the current secret OR the
     * previous secret while the rotation window has not expired.
     *
     * <p>This is the consumer-side of the dual-secret rotation contract introduced in
     * V166: when an admin rotates a webhook's secret, payloads already in-flight (or
     * stored for later replay by the consumer) may still carry signatures generated
     * with the prior secret. Until {@link Webhook#getPreviousSecretExpiresAt()}, we
     * accept either signature; afterwards, only the current secret is valid.</p>
     *
     * <p>NOTE: NU-AURA currently has no inbound webhook endpoint. This method exists
     * so future inbound paths and unit tests can validate that the rotation window
     * behaves correctly without duplicating the dual-secret logic.</p>
     *
     * @param webhook              the webhook whose signature we are verifying
     * @param payload              the raw payload bytes that were signed (UTF-8 JSON)
     * @param providedSignatureHex hex signature received from the caller
     *                             (without any "sha256=" prefix — strip that upstream)
     * @return true iff {@code providedSignatureHex} matches a signature computed from
     * either the current secret or a non-expired previous secret
     */
    public boolean verifySignature(Webhook webhook, String payload, String providedSignatureHex) {
        if (webhook == null || providedSignatureHex == null || providedSignatureHex.isBlank()) {
            return false;
        }
        // Try the current secret first — the common case, even mid-rotation, is that
        // the consumer has already updated.
        if (matchesSignature(payload, webhook.getSecret(), providedSignatureHex)) {
            return true;
        }
        // Then try the previous secret iff the rotation window is still open. A NULL
        // previousSecret or an expired previousSecretExpiresAt collapses this to false
        // without invoking HMAC — important to avoid acting on stale grace-period state.
        // "Now" must be the webhook owner's local zone — previousSecretExpiresAt was stamped
        // in that zone at rotation time (see WebhookService#rotateSecret).
        LocalDateTime previousExpiresAt = webhook.getPreviousSecretExpiresAt();
        if (previousExpiresAt != null
                && previousExpiresAt.isAfter(tenantTimeService.now(webhook.getTenantId()))) {
            return matchesSignature(payload, webhook.getPreviousSecret(), providedSignatureHex);
        }
        return false;
    }

    /**
     * Constant-time HMAC comparison. Returns false on any nullity/blank/error path so
     * callers cannot accidentally treat a misconfigured webhook as verified.
     */
    private boolean matchesSignature(String payload, String secret, String providedSignatureHex) {
        if (secret == null || secret.isBlank() || payload == null) {
            return false;
        }
        String expected = computeSignature(payload, secret);
        if (expected.isEmpty()) {
            return false;
        }
        byte[] a = expected.getBytes(StandardCharsets.UTF_8);
        byte[] b = providedSignatureHex.getBytes(StandardCharsets.UTF_8);
        // MessageDigest.isEqual is constant-time on length-equal inputs (and returns
        // false in constant time when lengths differ) — exactly what HMAC verification needs.
        return MessageDigest.isEqual(a, b);
    }

    /**
     * V166: hourly sweep that clears expired previous secrets so they cannot be used to
     * verify a signature past the rotation window. Bulk UPDATE keeps the sweep cheap.
     *
     * <p>ShedLock keeps the job single-flighted in a multi-pod deployment; the partial
     * index {@code idx_webhooks_previous_secret_expires} keeps the predicate fast.</p>
     */
    @Scheduled(cron = "0 0 * * * *") // top of every hour
    @SchedulerLock(name = "webhookClearExpiredPreviousSecrets",
            lockAtLeastFor = "PT5M", lockAtMostFor = "PT55M")
    @Transactional
    public void clearExpiredPreviousSecrets() {
        // Iterate per tenant so the cutoff timestamp is resolved in each tenant's local zone
        // via TenantTimeService — matches how rotateSecret stamps previousSecretExpiresAt.
        int totalCleared = 0;
        for (UUID tenantId : webhookRepository.findDistinctTenantIds()) {
            int cleared = webhookRepository.clearExpiredPreviousSecrets(
                    tenantId, tenantTimeService.now(tenantId));
            totalCleared += cleared;
        }
        if (totalCleared > 0) {
            log.info("Cleared {} expired previous_secret(s) on webhooks", totalCleared);
        }
    }

    /**
     * Sanitize the response body before storing it on the delivery record.
     *
     * <p>Redaction targets:</p>
     * <ul>
     *   <li>Sensitive response headers serialized into the body (Authorization, Cookie, Set-Cookie,
     *       Proxy-Authorization) — admins viewing delivery history must never see leaked secrets.</li>
     *   <li>Body length capped by WebhookDelivery#truncate (2000 chars) downstream.</li>
     * </ul>
     *
     * <p>If sensitive headers are present in the response, they are logged for audit but
     * not persisted on the delivery record.</p>
     */
    private String sanitizeResponseBody(String body, HttpHeaders responseHeaders) {
        if (responseHeaders != null) {
            for (String name : SENSITIVE_RESPONSE_HEADERS) {
                if (responseHeaders.containsKey(name)
                        || responseHeaders.containsKey(name.substring(0, 1).toUpperCase() + name.substring(1))) {
                    // We do not echo header values into the body — but log presence for audit.
                    log.debug("Sensitive response header '{}' present from webhook target; suppressing from storage", name);
                }
            }
        }
        if (body == null) return null;
        // Best-effort body-level redaction in case the target echoes its own auth headers.
        String redacted = body;
        for (String name : SENSITIVE_RESPONSE_HEADERS) {
            // Strip "Authorization: ..." style lines from response body text.
            redacted = redacted.replaceAll("(?i)(" + java.util.regex.Pattern.quote(name) + ")\\s*[:=]\\s*[^\\r\\n]*",
                    "$1: [REDACTED]");
        }
        return redacted;
    }

    /**
     * Build the event payload wrapper. The {@code timestamp} field is rendered in the
     * tenant's local zone so consumers see times that match the rest of the platform's
     * outbound contract surface.
     */
    private Map<String, Object> buildEventPayload(UUID tenantId, WebhookEventType eventType, String eventId, Object data) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", eventId);
        payload.put("type", eventType.name());
        payload.put("timestamp", tenantTimeService.now(tenantId).toString());
        payload.put("data", data);
        return payload;
    }

    /**
     * Process pending retries.
     * Runs every minute.
     */
    @Scheduled(fixedRate = 60000)
    @SchedulerLock(name = "webhookProcessRetries", lockAtLeastFor = "PT2M", lockAtMostFor = "PT15M")
    @Transactional
    public void processRetries() {
        // INT-4: first reclaim deliveries orphaned by a pod crash. Rows stuck in PENDING
        // (saved, crashed before the first attempt) or DELIVERING (crashed mid-attempt)
        // match no retry query and would be invisible forever, violating ADR-004's
        // at-least-once promise. Reset them to RETRYING due now; the loop below then
        // re-attempts them through the normal path (HMAC signing in buildHeaders,
        // backoff + 5-attempt FAILED cap in recordAttempt). The staleness cutoff uses
        // the same clock as @LastModifiedDate auditing stamps; the bulk update is
        // flushed in this transaction, so the tenant pivot below sees the reclaimed rows.
        LocalDateTime staleCutoff = LocalDateTime.now().minusMinutes(STALE_IN_FLIGHT_MINUTES);
        for (UUID tenantId : deliveryRepository.findDistinctTenantIdsWithStaleInFlight(staleCutoff)) {
            int reclaimed = deliveryRepository.reclaimStaleInFlightDeliveries(
                    tenantId, staleCutoff, tenantTimeService.now(tenantId));
            if (reclaimed > 0) {
                log.warn("Reclaimed {} webhook delivery(ies) stuck PENDING/DELIVERING > {}min for tenant {} (pod crash recovery)",
                        reclaimed, STALE_IN_FLIGHT_MINUTES, tenantId);
            }
        }

        // Iterate per tenant so the "ready for retry" cutoff is the tenant's local now,
        // matching the zone in which nextRetryAt was originally stamped (see deliverWebhook).
        // Narrow the sweep to tenants with retryable work only, which reduces scans when
        // most tenants are inactive or only have delivered history.
        for (UUID tenantId : deliveryRepository.findDistinctTenantIdsWithRetrying()) {
            Map<UUID, Optional<Webhook>> webhookCache = new HashMap<>();
            LocalDateTime tenantNow = tenantTimeService.now(tenantId);
            Pageable pageable = PageRequest.of(
                    0,
                    RETRY_BATCH_SIZE,
                    Sort.by(Sort.Direction.ASC, "nextRetryAt").and(Sort.by(Sort.Direction.ASC, "id")));

            while (true) {
                Page<WebhookDelivery> readyForRetry = deliveryRepository.findReadyForRetry(
                        tenantId, tenantNow, pageable);

                if (readyForRetry.isEmpty()) {
                    break;
                }

                for (WebhookDelivery delivery : readyForRetry.getContent()) {
                    TenantContext.setCurrentTenant(tenantId);
                    try {
                        Optional<Webhook> webhook = webhookCache.computeIfAbsent(
                                delivery.getWebhookId(),
                                id -> webhookRepository.findByIdAndTenantId(id, tenantId));
                        webhook.ifPresentOrElse(
                                activeWebhook -> {
                                    if (activeWebhook.getStatus() == WebhookStatus.ACTIVE) {
                                        log.info("Retrying webhook delivery {} (attempt {})",
                                                delivery.getId(), delivery.getAttempts() + 1);

                                        // Record retry metrics
                                        metricsService.recordWebhookRetry(
                                                tenantId,
                                                delivery.getEventType().name(),
                                                delivery.getAttempts() + 1);

                                        deliverWebhook(activeWebhook, delivery);
                                    } else {
                                        failDeliveryWithoutRetry(
                                                delivery,
                                                tenantId,
                                                "Webhook is not active");
                                    }
                                },
                                () -> failDeliveryWithoutRetry(
                                        delivery,
                                        tenantId,
                                        "Webhook was deleted"));
                    } finally {
                        TenantContext.clear();
                    }
                }

                if (readyForRetry.getContent().size() < RETRY_BATCH_SIZE) {
                    break;
                }
            }
        }
    }

    private void failDeliveryWithoutRetry(WebhookDelivery delivery, UUID tenantId, String reason) {
        circuitBreakers.remove(delivery.getWebhookId());
        delivery.setStatus(WebhookDelivery.DeliveryStatus.FAILED);
        delivery.setErrorMessage(reason);
        delivery.setNextRetryAt(null);
        deliveryRepository.save(delivery);
        log.warn("Marking webhook delivery {} as failed for tenant {}: {}",
                delivery.getId(), tenantId, reason);
    }

    /**
     * Get or create a circuit breaker for a webhook.
     */
    private CircuitBreaker getOrCreateCircuitBreaker(UUID webhookId) {
        return circuitBreakers.computeIfAbsent(webhookId, id ->
                new CircuitBreaker("webhook-" + id, 5, 2, Duration.ofSeconds(30)));
    }

    // ========== Metrics ==========

    // Q-P13: webhook_id was removed from Prometheus tags — per-webhook UUIDs create
    // unbounded cardinality (one time-series per registered webhook). The success/
    // failure rate per tenant is still answerable via centralized metricsService
    // (which tags by tenant_bucket + event_type), so we lose nothing observability-wise.

    private void recordSuccessMetric(Webhook webhook) {
        Counter.builder("webhook.delivery")
                .tag("status", "success")
                .register(meterRegistry)
                .increment();
    }

    private void recordFailureMetric(Webhook webhook, int statusCode) {
        Counter.builder("webhook.delivery")
                .tag("status", "failure")
                .tag("http_status", String.valueOf(statusCode))
                .register(meterRegistry)
                .increment();
    }

    private void recordDurationMetric(Webhook webhook, long durationMs) {
        Timer.builder("webhook.delivery.duration")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }
}
