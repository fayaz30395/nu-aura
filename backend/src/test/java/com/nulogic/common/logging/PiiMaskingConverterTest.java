package com.nulogic.common.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PiiMaskingConverterTest {

    private PiiMaskingConverter converter;
    private ILoggingEvent event;

    @BeforeEach
    void setUp() {
        converter = new PiiMaskingConverter();
        event = mock(ILoggingEvent.class);
    }

    @Test
    void convertReturnsEmptyStringForNullMessage() {
        when(event.getFormattedMessage()).thenReturn(null);

        assertThat(converter.convert(event)).isEmpty();
    }

    @Test
    void convertMasksEmailPhonePanAndAadhaar() {
        when(event.getFormattedMessage()).thenReturn(
                "email jane.doe@example.com phone +91-98765-43210 pan ABCDE1234F aadhaar 1234 5678 9012");

        String masked = converter.convert(event);

        assertThat(masked)
                .doesNotContain("jane.doe@example.com")
                .doesNotContain("+91-98765-43210")
                .doesNotContain("ABCDE1234F")
                .doesNotContain("1234 5678 9012")
                .contains("ja***@example.com")
                .contains("***3210")
                .contains("***PAN***")
                .contains("****-****-****");
    }

    @Test
    void convertPreservesShortEmailLocalPartPrefix() {
        when(event.getFormattedMessage()).thenReturn("contact ab@example.com");

        assertThat(converter.convert(event)).contains("ab***@example.com");
    }

    @Test
    void convertLeavesNonPiiMessageReadable() {
        when(event.getFormattedMessage()).thenReturn("request completed successfully");

        assertThat(converter.convert(event)).isEqualTo("request completed successfully");
    }
}
