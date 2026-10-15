package com.nulogic.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitingFilterTest {

    private RateLimitingFilter filter;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter();
        ReflectionTestUtils.setField(filter, "rateLimitEnabled", true);
        ReflectionTestUtils.setField(filter, "useRedis", false);
        ReflectionTestUtils.setField(filter, "requestsPerMinute", 60);
        ReflectionTestUtils.setField(filter, "jwtSecret", "unit-test-secret-unit-test-secret-0123");
    }

    private int call(String uri, String ip, String bearer) throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", uri);
        req.setRemoteAddr(ip);
        if (bearer != null) {
            req.addHeader("Authorization", "Bearer " + bearer);
        }
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        return res.getStatus();
    }

    @Test
    void preboardingPortal_usesStrictPublicBucket() throws Exception {
        for (int i = 0; i < 20; i++) {
            assertThat(call("/api/v1/preboarding/portal/abc", "10.0.0.1", null)).isEqualTo(200);
        }
        assertThat(call("/api/v1/preboarding/portal/abc", "10.0.0.1", null)).isEqualTo(429);
        // other IP unaffected
        assertThat(call("/api/v1/preboarding/portal/abc", "10.0.0.2", null)).isEqualTo(200);
    }

    @Test
    void publicCareers_usesStrictPublicBucket() throws Exception {
        for (int i = 0; i < 20; i++) {
            call("/api/v1/public/careers/apply", "10.0.0.3", null);
        }
        assertThat(call("/api/v1/public/careers/apply", "10.0.0.3", null)).isEqualTo(429);
    }

    @Test
    void authRoute_rotatingGarbageBearerCannotEvadeLimit() throws Exception {
        for (int i = 0; i < 5; i++) {
            assertThat(call("/api/v1/auth/login", "10.0.0.4", "garbage-" + i)).isEqualTo(200);
        }
        assertThat(call("/api/v1/auth/login", "10.0.0.4", "garbage-new")).isEqualTo(429);
    }

    @Test
    void genericApi_stillUsesGenericBucket() throws Exception {
        for (int i = 0; i < 30; i++) {
            assertThat(call("/api/v1/employees", "10.0.0.5", null)).isEqualTo(200);
        }
    }
}
