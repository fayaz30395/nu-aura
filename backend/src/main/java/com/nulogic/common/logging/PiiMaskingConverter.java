package com.nulogic.common.logging;

import ch.qos.logback.classic.pattern.ClassicConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

import java.util.regex.Pattern;

/**
 * Logback ClassicConverter that masks PII (emails, phone numbers, PANs,
 * Aadhaar fragments) in the formatted log message before it reaches the
 * appender output. Wired into the production logging pattern via the
 * {@code maskedMsg} conversion word in {@code logback-spring.xml}.
 *
 * <p>Wave-3 compliance #8 — keeps personal data out of production log
 * sinks (stdout, JSON file, downstream Cloud Logging / Logstash).</p>
 *
 * <p>Patterns intentionally err on the side of masking. Known caveat:
 * the phone pattern can over-mask long sequences of digits that resemble
 * a phone number (timestamps embedded in messages, large IDs, etc.).
 * If false positives surface in real traffic, tighten the phone regex
 * to require a known country-code prefix.</p>
 */
public class PiiMaskingConverter extends ClassicConverter {

    // Email: keep first 2 chars + domain TLD only
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})");

    // Phone (E.164 + Indian +91 patterns)
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(\\+?\\d{1,3}[-.\\s]?)?(?:\\d{5}[-.\\s]?\\d{5}|\\(?\\d{3,5}\\)?[-.\\s]?\\d{3,5}[-.\\s]?\\d{4,6})");

    // Indian PAN: 5 letters + 4 digits + 1 letter
    private static final Pattern PAN_PATTERN = Pattern.compile(
            "\\b[A-Z]{5}[0-9]{4}[A-Z]\\b");

    // Aadhaar: 12 digits (avoid masking other long numbers — risky; keep tight)
    private static final Pattern AADHAAR_PATTERN = Pattern.compile(
            "\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b");

    @Override
    public String convert(ILoggingEvent event) {
        String msg = event.getFormattedMessage();
        if (msg == null) {
            return "";
        }

        // Mask Aadhaar first so its 12-digit shape is not consumed by PHONE_PATTERN.
        msg = AADHAAR_PATTERN.matcher(msg).replaceAll("****-****-****");

        msg = EMAIL_PATTERN.matcher(msg).replaceAll(m -> {
            String local = m.group(1);
            String domain = m.group(2);
            String prefix = local.length() > 2 ? local.substring(0, 2) : local;
            return prefix + "***@" + domain;
        });

        msg = PHONE_PATTERN.matcher(msg).replaceAll(m -> {
            String matched = m.group();
            // Keep last 4 digits, mask rest
            return matched.length() > 4
                    ? "***" + matched.substring(matched.length() - 4)
                    : "****";
        });

        msg = PAN_PATTERN.matcher(msg).replaceAll("***PAN***");

        return msg;
    }
}
