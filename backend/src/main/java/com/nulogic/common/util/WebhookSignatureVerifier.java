package com.nulogic.common.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;

/**
 * HMAC-SHA256 webhook signature verification for payment providers (SEC / RBAC-01).
 *
 * <p>All comparisons are constant-time ({@link MessageDigest#isEqual}) to avoid timing
 * oracles. Every method fails secure: a null/blank secret, malformed header, or any
 * computation error yields {@code false} (reject the webhook).
 */
public final class WebhookSignatureVerifier {

    private WebhookSignatureVerifier() {
    }

    /**
     * Razorpay scheme: {@code HMAC-SHA256(payload, secret)} hex-encoded, compared
     * constant-time to the {@code X-Razorpay-Signature} header.
     */
    public static boolean verifyHmacSha256Hex(String payload, String hexSignature, String secret) {
        if (payload == null || hexSignature == null || secret == null || secret.isBlank()) {
            return false;
        }
        String expected = hmacSha256Hex(payload, secret);
        if (expected == null) {
            return false;
        }
        return constantTimeEquals(expected, hexSignature.trim());
    }

    /**
     * Stripe scheme: the {@code Stripe-Signature} header is {@code t=<ts>,v1=<sig>[,v1=...]}.
     * The signed payload is {@code "<t>.<payload>"}; the expected signature is
     * {@code HMAC-SHA256(signedPayload, secret)} hex, compared constant-time to any {@code v1}.
     * Rejects if the timestamp is outside {@code toleranceSeconds} (replay protection).
     *
     * @param nowEpochSeconds current time (injected for testability)
     */
    public static boolean verifyStripe(String payload, String sigHeader, String secret,
                                       long toleranceSeconds, long nowEpochSeconds) {
        if (payload == null || sigHeader == null || secret == null || secret.isBlank()) {
            return false;
        }
        String timestamp = null;
        List<String> v1Signatures = new ArrayList<>();
        for (String part : sigHeader.split(",")) {
            String[] kv = part.trim().split("=", 2);
            if (kv.length != 2) {
                continue;
            }
            if ("t".equals(kv[0])) {
                timestamp = kv[1].trim();
            } else if ("v1".equals(kv[0])) {
                v1Signatures.add(kv[1].trim());
            }
        }
        if (timestamp == null || v1Signatures.isEmpty()) {
            return false;
        }
        if (toleranceSeconds > 0) {
            try {
                long ts = Long.parseLong(timestamp);
                if (Math.abs(nowEpochSeconds - ts) > toleranceSeconds) {
                    return false;
                }
            } catch (NumberFormatException e) {
                return false;
            }
        }
        String expected = hmacSha256Hex(timestamp + "." + payload, secret);
        if (expected == null) {
            return false;
        }
        for (String v1 : v1Signatures) {
            if (constantTimeEquals(expected, v1)) {
                return true;
            }
        }
        return false;
    }

    private static String hmacSha256Hex(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (GeneralSecurityException e) {
            return null;
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
