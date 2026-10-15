package com.nulogic.application.integration.service;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("SlackCommandService signature verification (fail-closed)")
class SlackSignatureVerificationTest {

    private SlackCommandService service(String secret, String profile) {
        SlackCommandService s = new SlackCommandService(null, null, null, null, null, null);
        ReflectionTestUtils.setField(s, "signingSecret", secret);
        ReflectionTestUtils.setField(s, "activeProfile", profile);
        return s;
    }

    @Test
    void missingSecretOnNonLocalProfileRejects() {
        assertThat(service("", "render").verifySlackSignature(mock(HttpServletRequest.class))).isFalse();
    }

    @Test
    void missingSecretOnDevProfileAllowed() {
        assertThat(service("", "dev").verifySlackSignature(mock(HttpServletRequest.class))).isTrue();
    }

    @Test
    void nonNumericTimestampRejectsWithoutException() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Slack-Request-Timestamp")).thenReturn("abc");
        when(req.getHeader("X-Slack-Signature")).thenReturn("v0=x");
        assertThat(service("secret", "prod").verifySlackSignature(req)).isFalse();
    }

    @Test
    void staleTimestampRejects() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Slack-Request-Timestamp")).thenReturn("1000");
        when(req.getHeader("X-Slack-Signature")).thenReturn("v0=x");
        assertThat(service("secret", "prod").verifySlackSignature(req)).isFalse();
    }
}
