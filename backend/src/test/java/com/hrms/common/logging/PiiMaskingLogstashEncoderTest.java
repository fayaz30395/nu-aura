package com.hrms.common.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for PiiMaskingLogstashEncoder.
 *
 * <p>Verifies that the JSON output produced by LogstashEncoder is masked for
 * email / phone / PAN / Aadhaar values, and that the masked payload remains
 * valid JSON (no unescaped quotes / broken structure).</p>
 */
class PiiMaskingLogstashEncoderTest {

    private PiiMaskingLogstashEncoder encoder;
    private Logger logger;

    @BeforeEach
    void setUp() {
        LoggerContext ctx = (LoggerContext) LoggerFactory.getILoggerFactory();
        encoder = new PiiMaskingLogstashEncoder();
        encoder.setContext(ctx);
        encoder.start();
        logger = ctx.getLogger(PiiMaskingLogstashEncoderTest.class);
    }

    private String encodeMessage(String msg) {
        LoggingEvent event = new LoggingEvent(
                Logger.class.getName(), logger, Level.INFO, msg, null, null);
        byte[] out = encoder.encode(event);
        return new String(out, StandardCharsets.UTF_8);
    }

    @Test
    void masksEmailAddressInJsonMessage() {
        String json = encodeMessage("User signed up: jane.doe@example.com");
        assertThat(json).doesNotContain("jane.doe@example.com");
        assertThat(json).contains("ja***@example.com");
    }

    @Test
    void masksIndianPanInJsonMessage() {
        String json = encodeMessage("PAN on file: ABCDE1234F");
        assertThat(json).doesNotContain("ABCDE1234F");
        assertThat(json).contains("***PAN***");
    }

    @Test
    void masksAadhaarInJsonMessage() {
        String json = encodeMessage("Aadhaar: 1234 5678 9012");
        assertThat(json).doesNotContain("1234 5678 9012");
        assertThat(json).contains("****-****-****");
    }

    @Test
    void masksPhoneNumberInJsonMessage() {
        String json = encodeMessage("Call +91-98765-43210 for support");
        assertThat(json).doesNotContain("98765-43210");
        // last 4 digits preserved by design
        assertThat(json).contains("3210");
    }

    @Test
    void preservesJsonStructureAfterMasking() {
        String json = encodeMessage("contact: jane@example.com PAN ABCDE1234F");
        // Must still be a single-line JSON object terminated with newline.
        assertThat(json).startsWith("{").contains("}");
        // No stray unescaped quotes were introduced by replacements.
        long quoteCount = json.chars().filter(c -> c == '"').count();
        assertThat(quoteCount % 2).isEqualTo(0);
    }
}
