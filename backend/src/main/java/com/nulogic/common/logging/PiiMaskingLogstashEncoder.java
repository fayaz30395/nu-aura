package com.nulogic.common.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import net.logstash.logback.encoder.LogstashEncoder;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * LogstashEncoder wrapper that applies the same PII masking rules as
 * {@link PiiMaskingConverter} to the serialized JSON output, so structured
 * (JSON / ELK) log shipping is scrubbed just like the pattern-layout path.
 *
 * <p>Both pattern and JSON paths now mask PII — resolves the S7-D follow-up
 * where the LogstashEncoder JsonProvider chain bypassed the {@code %maskedMsg}
 * conversion word and emitted raw email / phone / PAN / Aadhaar values.</p>
 *
 * <p>Masking is applied to the fully-serialized JSON string. Replacement
 * tokens are intentionally quote-free so JSON validity is preserved.</p>
 *
 * <p>Wave-3 compliance #8 — keeps personal data out of production log sinks
 * (stdout JSON, JSON file, downstream Cloud Logging / Logstash / Elasticsearch).</p>
 */
public class PiiMaskingLogstashEncoder extends LogstashEncoder {

    // Email: keep first 2 chars + domain TLD only. Mirrors PiiMaskingConverter.
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");

    // Phone (E.164 + Indian +91 patterns, including 5-5 mobile grouping)
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(?<!\\d)(\\+?\\d{1,3}[-.\\s]?)?(?:\\(?\\d{3,5}\\)?[-.\\s]?\\d{3,5}[-.\\s]?\\d{4,6}|\\d{5}[-.\\s]?\\d{5})(?!\\d)");

    // Indian PAN: 5 letters + 4 digits + 1 letter
    private static final Pattern PAN_PATTERN = Pattern.compile(
            "\\b[A-Z]{5}[0-9]{4}[A-Z]\\b");

    // Aadhaar: 12 digits with optional single spaces between 4-digit groups
    private static final Pattern AADHAAR_PATTERN = Pattern.compile(
            "\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b");

    /**
     * Apply masking regexes to the full JSON byte payload. Replacement tokens
     * contain no double-quotes / backslashes, so JSON structure is preserved.
     */
    private static byte[] maskJson(byte[] raw) {
        String json = new String(raw, StandardCharsets.UTF_8);

        // Mask Aadhaar first so its 12-digit shape is not consumed by PHONE_PATTERN.
        json = AADHAAR_PATTERN.matcher(json).replaceAll("****-****-****");

        json = EMAIL_PATTERN.matcher(json).replaceAll(m -> {
            String local = m.group(1);
            String domain = m.group(2);
            String prefix = local.length() > 2 ? local.substring(0, 2) : local;
            return prefix + "***@" + domain;
        });

        json = PHONE_PATTERN.matcher(json).replaceAll(m -> {
            String matched = m.group();
            return matched.length() > 4
                    ? "***" + matched.substring(matched.length() - 4)
                    : "****";
        });

        json = PAN_PATTERN.matcher(json).replaceAll("***PAN***");

        return json.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    public byte[] encode(ILoggingEvent event) {
        byte[] raw = super.encode(event);
        if (raw == null || raw.length == 0) {
            return raw;
        }
        return maskJson(raw);
    }

    @Override
    public void encode(ILoggingEvent event, OutputStream outputStream) throws IOException {
        // Some appender paths call the streaming overload directly. Capture
        // super's output, mask it, then write — keeps both paths in sync.
        ByteArrayOutputStream buffer = new ByteArrayOutputStream(512);
        super.encode(event, buffer);
        byte[] raw = buffer.toByteArray();
        if (raw.length == 0) {
            return;
        }
        outputStream.write(maskJson(raw));
    }
}
