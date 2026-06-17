package com.nulogic.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link WebhookSignatureVerifier} (RBAC-01 fix). No Spring / no Docker.
 */
class WebhookSignatureVerifierTest {

    private static final String SECRET = "whsec_test_0123456789abcdef0123456789abcdef";
    private static final String PAYLOAD = "{\"id\":\"evt_123\",\"type\":\"payment.captured\"}";

    private static String hmacHex(String data, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder(raw.length * 2);
        for (byte b : raw) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }

    @Nested
    @DisplayName("Razorpay (HMAC-SHA256 hex)")
    class Razorpay {
        @Test
        @DisplayName("accepts a correctly signed payload")
        void acceptsValid() throws Exception {
            String sig = hmacHex(PAYLOAD, SECRET);
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(PAYLOAD, sig, SECRET)).isTrue();
        }

        @Test
        @DisplayName("rejects a tampered payload")
        void rejectsTampered() throws Exception {
            String sig = hmacHex(PAYLOAD, SECRET);
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(PAYLOAD + "x", sig, SECRET)).isFalse();
        }

        @Test
        @DisplayName("rejects a signature made with the wrong secret")
        void rejectsWrongSecret() throws Exception {
            String sig = hmacHex(PAYLOAD, "other-secret");
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(PAYLOAD, sig, SECRET)).isFalse();
        }

        @Test
        @DisplayName("fails secure on null/blank inputs")
        void failsSecure() throws Exception {
            String sig = hmacHex(PAYLOAD, SECRET);
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(PAYLOAD, sig, "")).isFalse();
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(PAYLOAD, sig, null)).isFalse();
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(PAYLOAD, null, SECRET)).isFalse();
            assertThat(WebhookSignatureVerifier.verifyHmacSha256Hex(null, sig, SECRET)).isFalse();
        }
    }

    @Nested
    @DisplayName("Stripe (t=...,v1=... with replay tolerance)")
    class Stripe {
        @Test
        @DisplayName("accepts a correctly signed, recent payload")
        void acceptsValidRecent() throws Exception {
            long now = 1_700_000_000L;
            String sig = hmacHex(now + "." + PAYLOAD, SECRET);
            String header = "t=" + now + ",v1=" + sig;
            assertThat(WebhookSignatureVerifier.verifyStripe(PAYLOAD, header, SECRET, 300L, now)).isTrue();
        }

        @Test
        @DisplayName("rejects an expired timestamp outside tolerance")
        void rejectsExpired() throws Exception {
            long signedAt = 1_700_000_000L;
            long now = signedAt + 10_000L; // far beyond 300s tolerance
            String sig = hmacHex(signedAt + "." + PAYLOAD, SECRET);
            String header = "t=" + signedAt + ",v1=" + sig;
            assertThat(WebhookSignatureVerifier.verifyStripe(PAYLOAD, header, SECRET, 300L, now)).isFalse();
        }

        @Test
        @DisplayName("rejects a tampered payload")
        void rejectsTampered() throws Exception {
            long now = 1_700_000_000L;
            String sig = hmacHex(now + "." + PAYLOAD, SECRET);
            String header = "t=" + now + ",v1=" + sig;
            assertThat(WebhookSignatureVerifier.verifyStripe(PAYLOAD + "x", header, SECRET, 300L, now)).isFalse();
        }

        @Test
        @DisplayName("rejects a malformed header (no v1)")
        void rejectsMalformed() {
            assertThat(WebhookSignatureVerifier.verifyStripe(PAYLOAD, "t=1700000000", SECRET, 300L, 1_700_000_000L)).isFalse();
        }

        @Test
        @DisplayName("fails secure on blank secret")
        void failsSecure() throws Exception {
            long now = 1_700_000_000L;
            String sig = hmacHex(now + "." + PAYLOAD, SECRET);
            assertThat(WebhookSignatureVerifier.verifyStripe(PAYLOAD, "t=" + now + ",v1=" + sig, "", 300L, now)).isFalse();
        }
    }
}
