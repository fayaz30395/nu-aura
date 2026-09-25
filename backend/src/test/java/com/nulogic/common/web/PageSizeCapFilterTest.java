package com.nulogic.common.web;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import jakarta.servlet.http.HttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * IV-2 regression: an unbounded {@code ?size=} loaded an arbitrary number of rows in
 * one query. 21 controllers build {@code PageRequest.of(page, size)} by hand, so
 * {@code spring.data.web.pageable.max-page-size} never applied and
 * {@code app.pagination.max-page-size} was read by no Java code at all.
 */
@DisplayName("PageSizeCapFilter — page size is capped for every endpoint (IV-2)")
class PageSizeCapFilterTest {

    private static final int CAP = 100;

    private final PageSizeCapFilter filter = new PageSizeCapFilter(CAP);

    private HttpServletRequest filtered(MockHttpServletRequest request) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(request, new MockHttpServletResponse(), chain);
        return (HttpServletRequest) chain.getRequest();
    }

    @Test
    @DisplayName("a size above the cap is clamped to the cap")
    void oversizedRequestIsClamped() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/employees");
        request.setParameter("page", "0");
        request.setParameter("size", "100000");

        HttpServletRequest result = filtered(request);

        assertThat(result.getParameter("size")).isEqualTo("100");
        assertThat(result.getParameter("page")).as("other params untouched").isEqualTo("0");
        assertThat(result.getParameterMap().get("size")).containsExactly("100");
    }

    @Test
    @DisplayName("pageSize and limit are capped too")
    void alternativeParameterNamesAreCapped() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/wall/posts");
        request.setParameter("pageSize", "5000");
        request.setParameter("limit", "9999");

        HttpServletRequest result = filtered(request);

        assertThat(result.getParameter("pageSize")).isEqualTo("100");
        assertThat(result.getParameter("limit")).isEqualTo("100");
    }

    @Test
    @DisplayName("a size at or below the cap passes through unchanged")
    void legitimateSizeIsUntouched() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/employees");
        request.setParameter("size", "20");

        HttpServletRequest result = filtered(request);

        assertThat(result.getParameter("size")).isEqualTo("20");
        assertThat(result).as("no wrapper needed when nothing exceeds the cap").isSameAs(request);
    }

    @Test
    @DisplayName("a non-numeric size is left for the controller's own binding to reject")
    void nonNumericSizeIsNotRewritten() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/employees");
        request.setParameter("size", "abc");

        HttpServletRequest result = filtered(request);

        assertThat(result.getParameter("size")).isEqualTo("abc");
    }

    @Test
    @DisplayName("requests with no size parameter are not wrapped")
    void requestWithoutSizeIsPassedThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/auth/me");

        assertThat(filtered(request)).isSameAs(request);
    }
}
