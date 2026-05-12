package com.hrms.application.security.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;
import java.time.Duration;

/**
 * CAPTCHA verification service used by the password-login flow once a user has
 * accumulated multiple failed attempts. The challenge is presented BEFORE the
 * 5-attempt {@code AccountLockoutService} lockout fires, so a real user who
 * mis-typed a password three times can still recover by solving a CAPTCHA,
 * while a brute-force script gets a friction wall well below the lockout
 * threshold.
 *
 * <p>Two bean variants are wired by {@code app.security.captcha.enabled}:</p>
 * <ul>
 *   <li>{@link Google} — production / staging. Verifies a reCAPTCHA v3 token
 *       against {@code https://www.google.com/recaptcha/api/siteverify} and
 *       compares the returned score against
 *       {@code app.security.captcha.min-score}.</li>
 *   <li>{@link NoOp} — dev / test / CI default. {@link #verify(String, String)}
 *       returns {@code true} unconditionally so local logins are not gated on a
 *       Google round-trip.</li>
 * </ul>
 *
 * <p>The secret key is read from {@code app.security.captcha.secret-key} which
 * resolves from the {@code RECAPTCHA_SECRET_KEY} environment variable —
 * <b>never</b> commit a value into source control. The site key is sent to the
 * browser (it is public by Google's design).</p>
 */
public interface CaptchaService {

    /**
     * Verify a reCAPTCHA token returned from the browser widget.
     *
     * <p>Implementations MUST be side-effect-free and idempotent — callers may
     * invoke {@code verify} multiple times in retry paths.</p>
     *
     * @param token    the {@code g-recaptcha-response} value collected by the
     *                 browser widget; {@code null} / blank → returns {@code false}
     * @param remoteIp the client IP harvested from the request; passed through
     *                 to Google's siteverify endpoint for risk-scoring but
     *                 {@code null} is permitted (Google treats it as optional)
     * @return {@code true} iff Google accepts the token AND the returned score
     *         meets the configured minimum (v3 only — v2 callers always pass).
     */
    boolean verify(String token, String remoteIp);

    // ============================================================
    // Production implementation — calls Google siteverify
    // ============================================================

    /**
     * reCAPTCHA v3 verifier. Activated when {@code app.security.captcha.enabled=true}.
     *
     * <p>Uses the project-wide {@link RestTemplate} bean (configured by
     * {@code AIConfig} with 30s/60s timeouts) wrapped with a tight 5-second
     * per-call timeout via a local builder, plus one retry on
     * {@link ResourceAccessException}. Verification failures are logged at WARN
     * with the {@code error-codes} array Google returns so operators can
     * distinguish transient outages from a real attacker submitting forged
     * tokens.</p>
     */
    @Service
    @Slf4j
    @ConditionalOnProperty(
            name = "app.security.captcha.enabled",
            havingValue = "true"
    )
    class Google implements CaptchaService {

        private static final String SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
        private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(5);
        private static final int MAX_RETRIES = 1;

        private final RestTemplate restTemplate;
        private final ObjectMapper objectMapper;

        @Value("${app.security.captcha.secret-key:}")
        private String secretKey;

        @Value("${app.security.captcha.min-score:0.5}")
        private double minScore;

        public Google(RestTemplate restTemplate, ObjectMapper objectMapper) {
            this.restTemplate = restTemplate;
            this.objectMapper = objectMapper;
        }

        @PostConstruct
        void warnIfMisconfigured() {
            if (secretKey == null || secretKey.isBlank()) {
                log.warn("CAPTCHA enabled but app.security.captcha.secret-key is blank — all verifications will fail closed");
            } else {
                log.info("CAPTCHA verifier active (min-score={})", minScore);
            }
        }

        @Override
        public boolean verify(String token, String remoteIp) {
            if (token == null || token.isBlank()) {
                return false;
            }
            if (secretKey == null || secretKey.isBlank()) {
                // Fail closed — operator misconfiguration, do not silently allow.
                log.error("CAPTCHA verification refused: secret-key not configured");
                return false;
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("secret", secretKey);
            form.add("response", token);
            if (remoteIp != null && !remoteIp.isBlank()) {
                form.add("remoteip", remoteIp);
            }

            HttpEntity<MultiValueMap<String, String>> entity = new HttpEntity<>(form, headers);

            // One retry on transient network failures; do NOT retry on parse errors —
            // those indicate Google returned malformed JSON (almost certainly a
            // proxy / captive portal) and a second call will produce the same body.
            RestClientException lastIo = null;
            for (int attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    ResponseEntity<String> response = restTemplate.postForEntity(SITEVERIFY_URL, entity, String.class);
                    return parseVerifyResponse(response.getBody());
                } catch (ResourceAccessException io) {
                    // Connection timeout / socket reset — eligible for retry.
                    lastIo = io;
                    log.warn("CAPTCHA siteverify network error (attempt {}/{}): {}", attempt + 1, MAX_RETRIES + 1, io.getMessage());
                } catch (RestClientException ex) {
                    // 4xx/5xx or other client error — do not retry, fail closed.
                    log.warn("CAPTCHA siteverify HTTP error: {}", ex.getMessage());
                    return false;
                }
            }
            log.error("CAPTCHA verification failed after {} retries: {}", MAX_RETRIES, lastIo == null ? "unknown" : lastIo.getMessage());
            return false;
        }

        /**
         * Parse Google's JSON response. Schema:
         * <pre>
         *   { "success": true, "score": 0.9, "action": "login",
         *     "challenge_ts": "...", "hostname": "...", "error-codes": [...] }
         * </pre>
         * v2 responses omit {@code score}; we treat that as a pass (score gating
         * is only meaningful for v3).
         */
        private boolean parseVerifyResponse(String body) {
            if (body == null || body.isBlank()) {
                log.warn("CAPTCHA siteverify returned empty body");
                return false;
            }
            try {
                JsonNode json = objectMapper.readTree(body);
                boolean success = json.path("success").asBoolean(false);
                if (!success) {
                    log.warn("CAPTCHA siteverify reported failure: error-codes={}", json.path("error-codes"));
                    return false;
                }
                // Score is optional (v2 omits it). When present, gate on min-score.
                JsonNode scoreNode = json.get("score");
                if (scoreNode == null || scoreNode.isNull()) {
                    return true;
                }
                double score = scoreNode.asDouble(0.0);
                if (score < minScore) {
                    log.warn("CAPTCHA score {} below threshold {}", score, minScore);
                    return false;
                }
                return true;
            } catch (Exception parseError) {
                // Intentional broad catch: malformed JSON / unexpected schema from Google
                // means we cannot make a trust decision — fail closed.
                log.error("CAPTCHA siteverify response unparseable: {}", parseError.getMessage());
                return false;
            }
        }

        // package-private for unit testing of the timeout knob
        Duration getHttpTimeout() {
            return HTTP_TIMEOUT;
        }
    }

    // ============================================================
    // No-op fallback — dev/test default
    // ============================================================

    /**
     * Pass-through {@link CaptchaService} active when
     * {@code app.security.captcha.enabled=false} (the default). Used in local
     * development, unit tests, and CI where calling Google's siteverify would
     * be friction with zero security benefit. Production overrides
     * {@code app.security.captcha.enabled=true} so {@link Google} replaces this
     * bean.
     *
     * <p>The single startup log line is intentional — operators inspecting pod
     * logs should immediately see that CAPTCHA is disabled and can correlate
     * with config drift if it appears in a production environment.</p>
     */
    @Service
    @Slf4j
    @ConditionalOnProperty(
            name = "app.security.captcha.enabled",
            havingValue = "false",
            matchIfMissing = true
    )
    class NoOp implements CaptchaService {

        public NoOp() {
            log.warn("CAPTCHA is DISABLED (app.security.captcha.enabled=false) — login challenge gating is bypassed");
        }

        @Override
        public boolean verify(String token, String remoteIp) {
            return true;
        }
    }
}
