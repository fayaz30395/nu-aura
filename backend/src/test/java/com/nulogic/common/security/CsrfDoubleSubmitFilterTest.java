package com.nulogic.common.security;

import com.nulogic.common.config.CookieConfig;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GAP-3 repair: real coverage for the production CSRF contract.
 *
 * <p>Before this, the only tests naming CSRF were {@code SecurityUseCaseTest} UC-SEC-003 and
 * UC-SEC-006, and both asserted that CSRF was <em>disabled</em> — the opposite of production.
 * They could never fail: that class runs {@code @AutoConfigureMockMvc(addFilters = false)}, so
 * {@link CsrfDoubleSubmitFilter} was not in the chain at all, making "status is not 403" vacuous.
 * ({@code SecurityConfig:274} disables only Spring's built-in CSRF; {@code SecurityConfig:269}
 * installs this custom double-submit filter, and a live probe confirms a POST without
 * {@code X-XSRF-TOKEN} is rejected with 403.)</p>
 *
 * <p>These tests exercise the filter itself, so they fail if the protection is weakened.</p>
 */
@DisplayName("CsrfDoubleSubmitFilter — production double-submit contract (GAP-3)")
class CsrfDoubleSubmitFilterTest {

    private static final String TOKEN = "test-csrf-token-value";
    private static final String HEADER = "X-XSRF-TOKEN";

    private final CsrfDoubleSubmitFilter filter = new CsrfDoubleSubmitFilter(new CookieConfig());

    private MockHttpServletRequest request(String method, String uri) {
        MockHttpServletRequest req = new MockHttpServletRequest(method, uri);
        req.setRequestURI(uri);
        return req;
    }

    private MockHttpServletRequest statefulRequest(String uri) {
        MockHttpServletRequest req = request("POST", uri);
        req.setCookies(new Cookie(CookieConfig.CSRF_TOKEN_COOKIE, TOKEN));
        return req;
    }

    @Test
    @DisplayName("UC-SEC-003: a state-changing request with no CSRF header is rejected with 403")
    void statefulRequestWithoutHeaderIsRejected() throws Exception {
        MockHttpServletRequest req = statefulRequest("/api/v1/employees");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(res.getContentAsString()).contains("CSRF token validation failed");
        assertThat(chain.getRequest()).as("the request must never reach the controller").isNull();
    }

    @Test
    @DisplayName("a header that does not match the cookie is rejected")
    void mismatchedTokenIsRejected() throws Exception {
        MockHttpServletRequest req = statefulRequest("/api/v1/employees");
        req.addHeader(HEADER, "some-other-token");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    @DisplayName("a request with no CSRF cookie at all is rejected")
    void missingCookieIsRejected() throws Exception {
        MockHttpServletRequest req = request("POST", "/api/v1/employees");
        req.addHeader(HEADER, TOKEN);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    @DisplayName("UC-SEC-006: a header matching the cookie is accepted and reaches the chain")
    void matchingTokenIsAccepted() throws Exception {
        MockHttpServletRequest req = statefulRequest("/api/v1/employees");
        req.addHeader(HEADER, TOKEN);
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(200);
        assertThat(chain.getRequest()).as("a valid request must pass through").isNotNull();
    }

    @Test
    @DisplayName("safe methods are not required to carry a token")
    void safeMethodsAreNotChallenged() throws Exception {
        for (String method : new String[]{"GET", "HEAD", "OPTIONS"}) {
            MockHttpServletRequest req = request(method, "/api/v1/employees");
            req.setCookies(new Cookie(CookieConfig.CSRF_TOKEN_COOKIE, TOKEN));
            MockHttpServletResponse res = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();

            filter.doFilter(req, res, chain);

            assertThat(res.getStatus()).as("%s must not be challenged", method).isEqualTo(200);
            assertThat(chain.getRequest()).as("%s must pass through", method).isNotNull();
        }
    }

    @Test
    @DisplayName("the X-API-Key bypass is gone: a header alone does not exempt a browser path")
    void apiKeyHeaderDoesNotBypassValidation() throws Exception {
        // A previous version skipped CSRF whenever X-API-Key was present, which a cross-origin
        // attacker could simply add. Exemption is URI-scoped now; this pins that.
        MockHttpServletRequest req = statefulRequest("/api/v1/employees");
        req.addHeader("X-API-Key", "attacker-supplied");
        MockHttpServletResponse res = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, res, chain);

        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(chain.getRequest()).isNull();
    }
}
