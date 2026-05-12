package com.hrms.application.security.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CaptchaService}'s two implementations (S12-J).
 *
 * <ul>
 *   <li>{@link CaptchaService.NoOp} — the dev / test default. Must accept every
 *       token, including null and blank, so local logins are not gated on a
 *       Google round-trip.</li>
 *   <li>{@link CaptchaService.Google} — production verifier. Must call Google's
 *       siteverify endpoint with the configured secret, gate on the v3 score
 *       threshold, fail closed on misconfiguration / network / parse errors,
 *       and retry exactly once on transient {@link ResourceAccessException}.</li>
 * </ul>
 * <p>
 * The {@link RestTemplate} is mocked so the suite never touches the network —
 * we drive every code path by returning canned JSON bodies (or throwing) for
 * each test case.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("CaptchaService Tests")
class CaptchaServiceTest {

    /**
     * Stable client IP for siteverify calls — value is opaque to the test.
     */
    private static final String REMOTE_IP = "203.0.113.7";

    /**
     * Non-empty secret so the misconfigured-secret short-circuit does not fire.
     */
    private static final String TEST_SECRET = "test-secret-key";

    /**
     * Default v3 score threshold (matches {@code app.security.captcha.min-score} default).
     */
    private static final double DEFAULT_MIN_SCORE = 0.5;

    @Nested
    @DisplayName("NoOp (CAPTCHA disabled)")
    class NoOpScanner {

        private final CaptchaService.NoOp scanner = new CaptchaService.NoOp();

        @Test
        @DisplayName("verify() returns true for a normal token")
        void returnsTrueForValidLookingToken() {
            assertThat(scanner.verify("any-token-value", REMOTE_IP)).isTrue();
        }

        @Test
        @DisplayName("verify() returns true even for null token (dev/test passthrough)")
        void returnsTrueForNullToken() {
            // NoOp is intentionally permissive — the captcha gate is disabled,
            // so even null tokens must pass to keep local logins working.
            assertThat(scanner.verify(null, REMOTE_IP)).isTrue();
        }

        @Test
        @DisplayName("verify() returns true for null remoteIp")
        void returnsTrueForNullRemoteIp() {
            assertThat(scanner.verify("token", null)).isTrue();
        }
    }

    @Nested
    @DisplayName("Google (CAPTCHA enabled)")
    class GoogleScanner {

        private final ObjectMapper objectMapper = new ObjectMapper();
        @Mock
        private RestTemplate restTemplate;
        private CaptchaService.Google scanner;

        @BeforeEach
        void setUp() {
            scanner = new CaptchaService.Google(restTemplate, objectMapper);
            // Inject @Value-driven fields directly — the production code reads
            // them after Spring property binding, but in a pure unit test we
            // bypass the container.
            ReflectionTestUtils.setField(scanner, "secretKey", TEST_SECRET);
            ReflectionTestUtils.setField(scanner, "minScore", DEFAULT_MIN_SCORE);
        }

        @Test
        @DisplayName("Returns true when Google reports success=true and score >= min-score")
        void returnsTrueWhenSuccessAndScoreAboveThreshold() {
            String body = "{\"success\":true,\"score\":0.9,\"action\":\"login\",\"hostname\":\"hrms.example.com\"}";
            when(restTemplate.postForEntity(
                    contains("recaptcha/api/siteverify"),
                    any(HttpEntity.class),
                    eq(String.class))).thenReturn(ResponseEntity.ok(body));

            assertThat(scanner.verify("good-token", REMOTE_IP)).isTrue();
            verify(restTemplate, times(1)).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }

        @Test
        @DisplayName("Returns false when score is below threshold (likely bot)")
        void returnsFalseWhenScoreBelowThreshold() {
            // v3 score < min-score must fail closed regardless of success flag —
            // this is the whole point of the score gate.
            String body = "{\"success\":true,\"score\":0.3,\"action\":\"login\"}";
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok(body));

            assertThat(scanner.verify("lowscore-token", REMOTE_IP)).isFalse();
        }

        @Test
        @DisplayName("Returns false when Google reports success=false")
        void returnsFalseWhenSuccessFalse() {
            // Forged / expired / mismatched-secret tokens — Google returns
            // success=false with an error-codes array. We log the array at WARN
            // and fail closed.
            String body = "{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}";
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok(body));

            assertThat(scanner.verify("forged-token", REMOTE_IP)).isFalse();
        }

        @Test
        @DisplayName("Returns true when score is absent (v2 response)")
        void returnsTrueWhenScoreMissing() {
            // Score is v3-only — v2 responses omit it entirely. Treat missing
            // score as a pass since v2 already proved the challenge was solved.
            String body = "{\"success\":true,\"hostname\":\"hrms.example.com\"}";
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok(body));

            assertThat(scanner.verify("v2-token", REMOTE_IP)).isTrue();
        }

        @Test
        @DisplayName("Returns false for blank token without calling Google")
        void returnsFalseForBlankToken() {
            assertThat(scanner.verify("", REMOTE_IP)).isFalse();
            assertThat(scanner.verify("   ", REMOTE_IP)).isFalse();
            assertThat(scanner.verify(null, REMOTE_IP)).isFalse();
            verify(restTemplate, never()).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }

        @Test
        @DisplayName("Returns false (fail closed) when secret-key is blank — operator misconfig")
        void returnsFalseWhenSecretKeyMissing() {
            // Operator forgot to set RECAPTCHA_SECRET_KEY. Fail closed so the
            // gate is not silently bypassed; also do NOT call Google (no point
            // — it would error 400 anyway, and we want a single failure mode).
            ReflectionTestUtils.setField(scanner, "secretKey", "");

            assertThat(scanner.verify("any-token", REMOTE_IP)).isFalse();
            verify(restTemplate, never()).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }

        @Test
        @DisplayName("Retries once on ResourceAccessException then fails closed")
        void retriesOnceOnNetworkError() {
            // Two consecutive socket failures — first triggers retry, second
            // exhausts retry budget. The contract guarantees MAX_RETRIES=1
            // (i.e. up to 2 calls total).
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new ResourceAccessException("connect timeout"))
                    .thenThrow(new ResourceAccessException("connect timeout"));

            assertThat(scanner.verify("token", REMOTE_IP)).isFalse();
            verify(restTemplate, times(2)).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }

        @Test
        @DisplayName("Recovers when first call times out but retry succeeds")
        void recoversAfterRetry() {
            String body = "{\"success\":true,\"score\":0.7}";
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new ResourceAccessException("transient"))
                    .thenReturn(ResponseEntity.ok(body));

            assertThat(scanner.verify("token", REMOTE_IP)).isTrue();
            verify(restTemplate, times(2)).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }

        @Test
        @DisplayName("Does NOT retry on RestClientException (4xx/5xx) — fails closed immediately")
        void doesNotRetryOnRestClientException() {
            // Non-IO failures (4xx, malformed body returned with non-200, etc.)
            // indicate Google rejected the call shape — a retry will produce the
            // same response. Fail closed on the first try.
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new RestClientException("400 Bad Request"));

            assertThat(scanner.verify("token", REMOTE_IP)).isFalse();
            verify(restTemplate, times(1)).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }

        @Test
        @DisplayName("Returns false on malformed Google JSON (defence in depth)")
        void returnsFalseOnMalformedJson() {
            // A captive portal / proxy could return non-JSON. The parser must
            // not throw out of verify() — it logs and fails closed.
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok("<html>not json</html>"));

            assertThat(scanner.verify("token", REMOTE_IP)).isFalse();
        }

        @Test
        @DisplayName("Returns false on empty / null Google response body")
        void returnsFalseOnEmptyBody() {
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.status(HttpStatus.OK).body(""));

            assertThat(scanner.verify("token", REMOTE_IP)).isFalse();
        }

        @Test
        @DisplayName("Forwards secret + token + remoteIp to Google in form body")
        @SuppressWarnings("unchecked")
            // entity body type comes from form-encoded ctor — cast is safe under HttpEntity contract
        void sendsExpectedFormFields() {
            String body = "{\"success\":true,\"score\":0.9}";
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok(body));

            scanner.verify("user-token", REMOTE_IP);

            org.mockito.ArgumentCaptor<HttpEntity<?>> captor =
                    org.mockito.ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(anyString(), captor.capture(), eq(String.class));

            MultiValueMap<String, String> form = (MultiValueMap<String, String>) captor.getValue().getBody();
            assertThat(form).isNotNull();
            assertThat(form.getFirst("secret")).isEqualTo(TEST_SECRET);
            assertThat(form.getFirst("response")).isEqualTo("user-token");
            assertThat(form.getFirst("remoteip")).isEqualTo(REMOTE_IP);
        }

        @Test
        @DisplayName("Omits remoteip form field when remoteIp is null/blank")
        @SuppressWarnings("unchecked")
        void omitsRemoteIpWhenAbsent() {
            String body = "{\"success\":true,\"score\":0.9}";
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok(body));

            scanner.verify("user-token", null);

            org.mockito.ArgumentCaptor<HttpEntity<?>> captor =
                    org.mockito.ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(anyString(), captor.capture(), eq(String.class));

            MultiValueMap<String, String> form = (MultiValueMap<String, String>) captor.getValue().getBody();
            assertThat(form).isNotNull();
            assertThat(form.containsKey("remoteip"))
                    .as("remoteip should be omitted when null — Google treats it as optional")
                    .isFalse();
        }
    }

}
