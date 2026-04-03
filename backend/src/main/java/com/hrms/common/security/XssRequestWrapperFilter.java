package com.hrms.common.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.Arrays;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Servlet filter that sanitizes query parameters and form values against XSS.
 *
 * <p>Only scrubs GET/form parameters (path variables and JSON bodies are protected
 * by Jackson + Bean Validation). For JSON body sanitization, use
 * {@link com.hrms.common.validation.InputSanitizer} inside service methods.</p>
 */
@Component
@Order(1)
public class XssRequestWrapperFilter implements Filter {

    // Patterns that indicate XSS intent in parameter values
    private static final Pattern XSS_PATTERN = Pattern.compile(
            "(?i)<script[^>]*>.*?</script>" +
                    "|<[^>]+on\\w+\\s*=" +
                    "|javascript\\s*:" +
                    "|vbscript\\s*:" +
                    "|expression\\s*\\(" +
                    "|<\\s*iframe" +
                    "|<\\s*object" +
                    "|<\\s*embed",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (request instanceof HttpServletRequest httpRequest) {
            // Skip WebSocket upgrade and multipart (binary data)
            String contentType = httpRequest.getContentType();
            boolean isMultipart = contentType != null && contentType.startsWith("multipart/");
            String upgrade = httpRequest.getHeader("Upgrade");
            boolean isWebSocket = "websocket".equalsIgnoreCase(upgrade);

            if (!isMultipart && !isWebSocket) {
                chain.doFilter(new XssRequestWrapper(httpRequest), response);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    // ─── Inner wrapper ────────────────────────────────────────────────────────

    private static class XssRequestWrapper extends HttpServletRequestWrapper {

        XssRequestWrapper(HttpServletRequest request) {
            super(request);
        }

        private static String sanitize(String value) {
            if (value == null || value.isEmpty()) return value;
            // Strip matches — don't encode, just remove the attack vector
            return XSS_PATTERN.matcher(value).replaceAll("");
        }

        @Override
        public String getParameter(String name) {
            return sanitize(super.getParameter(name));
        }

        @Override
        public String[] getParameterValues(String name) {
            String[] values = super.getParameterValues(name);
            if (values == null) return null;
            return Arrays.stream(values).map(XssRequestWrapper::sanitize).toArray(String[]::new);
        }

        @Override
        public String getHeader(String name) {
            // Sanitize non-standard headers but skip standard HTTP headers
            String value = super.getHeader(name);
            if (isUserSuppliedHeader(name)) {
                return sanitize(value);
            }
            return value;
        }

        private boolean isUserSuppliedHeader(String name) {
            if (!StringUtils.hasText(name)) return false;
            String lower = name.toLowerCase();
            // Skip standard HTTP headers; only scrub custom/app-level headers
            return lower.startsWith("x-custom-") || lower.startsWith("x-app-");
        }
    }
}
