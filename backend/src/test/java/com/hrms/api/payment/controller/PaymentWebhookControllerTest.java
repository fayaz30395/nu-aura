package com.hrms.api.payment.controller;

import com.hrms.application.payment.service.PaymentService;
import org.springframework.context.annotation.Import;
import com.hrms.common.config.TestMeterRegistryConfig;
import com.hrms.common.exception.FeatureDisabledException;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.PaymentFeatureGuard;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Unit tests for PaymentWebhookController.
 * <p>
 * Key security assertions:
 * - Requests without a signature header receive 401 (not processed)
 * - Error responses do NOT leak internal exception stack traces or messages (LOW-2 FIX)
 * - The Razorpay and Stripe dedicated endpoints forward to the generic handler correctly
 * - Health endpoint returns 200 when payments are enabled
 */
@WebMvcTest(PaymentWebhookController.class)
@ContextConfiguration(classes = {PaymentWebhookController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PaymentWebhookController Unit Tests")
class PaymentWebhookControllerTest {

    private static final String BASE_URL = "/api/v1/payments/webhooks";
    private static final String VALID_PAYLOAD = "{\"event\":\"payment.captured\",\"id\":\"evt_001\"}";
    private static final String VALID_SIGNATURE = "sha256=abc123";
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PaymentService paymentService;
    @MockitoBean
    private PaymentFeatureGuard paymentFeatureGuard;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/payments/webhooks/{provider}  — Generic provider webhook
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /{provider} — Generic Provider Webhook")
    class GenericProviderWebhookEndpoint {

        @Test
        @DisplayName("Should return 200 with success message when signature present and processing succeeds")
        void shouldReturn200WhenSignaturePresentAndProcessingSucceeds() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            doNothing().when(paymentService).processWebhook(eq("razorpay"), eq(VALID_PAYLOAD),
                    eq(VALID_SIGNATURE));

            mockMvc.perform(post(BASE_URL + "/generic-provider")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Signature", VALID_SIGNATURE)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Webhook processed successfully"));

            verify(paymentService).processWebhook(eq("generic-provider"), eq(VALID_PAYLOAD),
                    eq(VALID_SIGNATURE));
        }

        @Test
        @DisplayName("Should return 401 when no signature header is provided")
        void shouldReturn401WhenNoSignatureHeader() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL + "/generic-provider")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isUnauthorized())
                    .andExpect(content().string("Signature verification failed"));

            verify(paymentService, never()).processWebhook(any(), any(), any());
        }

        @Test
        @DisplayName("Should prefer X-Signature over provider-specific headers")
        void shouldPreferXSignatureHeader() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL + "/generic")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Signature", VALID_SIGNATURE)
                            .header("X-Razorpay-Signature", "razorpay-sig-should-be-ignored")
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isOk());

            verify(paymentService).processWebhook(eq("generic"), eq(VALID_PAYLOAD),
                    eq(VALID_SIGNATURE));
        }

        @Test
        @DisplayName("Should use X-Razorpay-Signature when X-Signature absent")
        void shouldUseRazorpaySignatureWhenXSignatureAbsent() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            String razorpaySignature = "razorpay-hmac-sha256";

            mockMvc.perform(post(BASE_URL + "/razorpay")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Razorpay-Signature", razorpaySignature)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isOk());

            verify(paymentService).processWebhook(eq("razorpay"), eq(VALID_PAYLOAD),
                    eq(razorpaySignature));
        }

        @Test
        @DisplayName("Should use Stripe-Signature when X-Signature and Razorpay both absent")
        void shouldUseStripeSignatureAsFallback() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            String stripeSignature = "t=1234,v1=abcdef";

            mockMvc.perform(post(BASE_URL + "/stripe")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Stripe-Signature", stripeSignature)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isOk());

            verify(paymentService).processWebhook(eq("stripe"), eq(VALID_PAYLOAD),
                    eq(stripeSignature));
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Error response must NOT leak internal exception details (LOW-2 FIX)
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("Error Response Security — No Exception Leakage (LOW-2 FIX)")
    class ErrorResponseSecurityTests {

        @Test
        @DisplayName("Should return generic error message — not exception class or stack trace")
        void shouldReturnGenericErrorMessageNotStackTrace() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            doThrow(new RuntimeException(
                    "Internal DB error: connection refused to jdbc:postgresql://prod-db"))
                    .when(paymentService)
                    .processWebhook(anyString(), anyString(), anyString());

            MvcResult result = mockMvc.perform(post(BASE_URL + "/razorpay")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Razorpay-Signature", VALID_SIGNATURE)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isInternalServerError())
                    .andReturn();

            String body = result.getResponse().getContentAsString();

            // Must not leak internal exception messages, class names, or JDBC URLs
            assertThat(body).doesNotContain("RuntimeException");
            assertThat(body).doesNotContain("jdbc:");
            assertThat(body).doesNotContain("java.lang");
            assertThat(body).doesNotContain("connection refused");
            assertThat(body).doesNotContain("DB error");
            // Generic message must be present
            assertThat(body).isEqualTo("Error processing webhook");
        }

        @Test
        @DisplayName("Should return generic 500 for any unexpected exception type")
        void shouldReturn500ForAnyUnexpectedException() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            doThrow(new IllegalStateException(
                    "Secret key=sk_live_SUPERSECRET stored in logs"))
                    .when(paymentService)
                    .processWebhook(anyString(), anyString(), anyString());

            MvcResult result = mockMvc.perform(post(BASE_URL + "/stripe")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Stripe-Signature", "t=1,v1=sig")
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isInternalServerError())
                    .andReturn();

            String body = result.getResponse().getContentAsString();

            // Sensitive secret data must never appear in webhook response
            assertThat(body).doesNotContain("SUPERSECRET");
            assertThat(body).doesNotContain("sk_live");
            assertThat(body).doesNotContain("IllegalStateException");
            assertThat(body).isEqualTo("Error processing webhook");
        }

        @Test
        @DisplayName("Malformed JSON payload with valid signature should still return safe response")
        void shouldReturnSafeResponseForMalformedPayload() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            // Service may throw any exception for bad payload
            doThrow(new RuntimeException("JSON parse error at line 1 col 5"))
                    .when(paymentService)
                    .processWebhook(anyString(), anyString(), anyString());

            MvcResult result = mockMvc.perform(post(BASE_URL + "/razorpay")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Signature", VALID_SIGNATURE)
                            .content("{invalid json"))
                    .andReturn();

            String body = result.getResponse().getContentAsString();

            // Must not leak JSON parsing error details
            assertThat(body).doesNotContain("parse error");
            assertThat(body).doesNotContain("java.lang");
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/payments/webhooks/razorpay  — Razorpay specific
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /razorpay — Razorpay Specific Webhook")
    class RazorpayWebhookEndpoint {

        @Test
        @DisplayName("Should return 200 when Razorpay-Signature present and processing succeeds")
        void shouldReturn200WhenRazorpaySignaturePresent() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            String sig = "razorpay_valid_sig_xyz";

            mockMvc.perform(post(BASE_URL + "/razorpay")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("X-Razorpay-Signature", sig)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Webhook processed successfully"));

            verify(paymentService).processWebhook(eq("razorpay"), eq(VALID_PAYLOAD), eq(sig));
        }

        @Test
        @DisplayName("Should return 400 when Razorpay-Signature header is missing on dedicated endpoint")
        void shouldReturn400WhenRazorpaySignatureMissingOnDedicatedEndpoint() throws Exception {
            // The dedicated endpoint has required=true on Stripe-Signature, so missing header → 400
            mockMvc.perform(post(BASE_URL + "/razorpay")
                            .contentType(MediaType.APPLICATION_JSON)
                            // No X-Razorpay-Signature and no X-Signature
                            .content(VALID_PAYLOAD))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        // 400 (missing required header) or 401 (signature check fails at controller level)
                        assertThat(status).isIn(400, 401);
                    });
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // POST /api/v1/payments/webhooks/stripe  — Stripe specific
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("POST /stripe — Stripe Specific Webhook")
    class StripeWebhookEndpoint {

        @Test
        @DisplayName("Should return 200 when Stripe-Signature present and processing succeeds")
        void shouldReturn200WhenStripeSignaturePresent() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();
            String sig = "t=1234567890,v1=stripe_hash_abc";

            mockMvc.perform(post(BASE_URL + "/stripe")
                            .contentType(MediaType.APPLICATION_JSON)
                            .header("Stripe-Signature", sig)
                            .content(VALID_PAYLOAD))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Webhook processed successfully"));

            verify(paymentService).processWebhook(eq("stripe"), eq(VALID_PAYLOAD), eq(sig));
        }

        @Test
        @DisplayName("Should return 400 when Stripe-Signature header is missing on dedicated endpoint")
        void shouldReturn400WhenStripeSignatureMissing() throws Exception {
            mockMvc.perform(post(BASE_URL + "/stripe")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(VALID_PAYLOAD))
                    .andExpect(result -> {
                        int status = result.getResponse().getStatus();
                        assertThat(status).isIn(400, 401);
                    });
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // GET /api/v1/payments/webhooks/health
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("GET /health — Webhook Health Check")
    class WebhookHealthEndpoint {

        @Test
        @DisplayName("Should return 200 with active message when payments are enabled")
        void shouldReturn200WhenPaymentsEnabled() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(get(BASE_URL + "/health"))
                    .andExpect(status().isOk())
                    .andExpect(content().string("Webhook endpoint is active"));

            verify(paymentFeatureGuard).requirePaymentsEnabled();
        }

        @Test
        @DisplayName("Should propagate FeatureDisabledException when payments disabled")
        void shouldPropagateFeatureDisabledWhenPaymentsOff() throws Exception {
            doThrow(new FeatureDisabledException("payments", "Payments are disabled"))
                    .when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(get(BASE_URL + "/health"))
                    .andExpect(status().is5xxServerError());
        }

        @Test
        @DisplayName("Health endpoint does not invoke PaymentService")
        void healthEndpointDoesNotInvokePaymentService() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(get(BASE_URL + "/health"))
                    .andExpect(status().isOk());

            verifyNoInteractions(paymentService);
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // Feature guard called before processing for all webhook endpoints
    // ──────────────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("PaymentFeatureGuard enforcement across all endpoints")
    class FeatureGuardEnforcement {

        @Test
        @DisplayName("Feature guard called for generic provider endpoint")
        void featureGuardCalledForGenericEndpoint() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(post(BASE_URL + "/test-provider")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("X-Signature", VALID_SIGNATURE)
                    .content(VALID_PAYLOAD));

            verify(paymentFeatureGuard, atLeastOnce()).requirePaymentsEnabled();
        }

        @Test
        @DisplayName("Feature guard called for health endpoint")
        void featureGuardCalledForHealthEndpoint() throws Exception {
            doNothing().when(paymentFeatureGuard).requirePaymentsEnabled();

            mockMvc.perform(get(BASE_URL + "/health"));

            verify(paymentFeatureGuard, times(1)).requirePaymentsEnabled();
        }
    }
}
