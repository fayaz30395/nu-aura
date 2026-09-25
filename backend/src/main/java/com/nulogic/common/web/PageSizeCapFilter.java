package com.nulogic.common.web;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * IV-2: caps the requested page size on every request.
 *
 * <p>21 controllers build their own {@code PageRequest.of(page, size)} from a raw
 * {@code @RequestParam int size}, so {@code spring.data.web.pageable.max-page-size}
 * never applied and {@code app.pagination.max-page-size} was read by no Java code at
 * all — {@code ?size=100000} loaded 100,000 rows into memory in one query.</p>
 *
 * <p>Clamping the query parameter itself fixes every call site at once, including the
 * Pageable-bound ones and any controller added later, instead of 38 separate edits.</p>
 */
@Component
@Order(0)
public class PageSizeCapFilter implements Filter {

    /** Query parameters that carry a page size. */
    private static final String[] SIZE_PARAMS = {"size", "pageSize", "limit"};

    private final int maxPageSize;

    public PageSizeCapFilter(@Value("${app.pagination.max-page-size:100}") int maxPageSize) {
        this.maxPageSize = maxPageSize;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (request instanceof HttpServletRequest http && needsCapping(http)) {
            chain.doFilter(new CappedRequest(http, maxPageSize), response);
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean needsCapping(HttpServletRequest request) {
        for (String param : SIZE_PARAMS) {
            String value = request.getParameter(param);
            if (value != null && exceedsCap(value, maxPageSize)) {
                return true;
            }
        }
        return false;
    }

    private static boolean exceedsCap(String value, int cap) {
        try {
            return Integer.parseInt(value.trim()) > cap;
        } catch (NumberFormatException ex) {
            // Not a number — leave it alone so the controller's own binding reports it.
            return false;
        }
    }

    private static class CappedRequest extends HttpServletRequestWrapper {

        private final Map<String, String[]> parameters;

        CappedRequest(HttpServletRequest request, int cap) {
            super(request);
            Map<String, String[]> capped = new LinkedHashMap<>(request.getParameterMap());
            for (String param : SIZE_PARAMS) {
                String[] values = capped.get(param);
                if (values == null) {
                    continue;
                }
                String[] replacement = new String[values.length];
                for (int i = 0; i < values.length; i++) {
                    replacement[i] = exceedsCap(values[i], cap) ? String.valueOf(cap) : values[i];
                }
                capped.put(param, replacement);
            }
            this.parameters = Collections.unmodifiableMap(capped);
        }

        @Override
        public String getParameter(String name) {
            String[] values = parameters.get(name);
            return values == null || values.length == 0 ? null : values[0];
        }

        @Override
        public Map<String, String[]> getParameterMap() {
            return parameters;
        }

        @Override
        public java.util.Enumeration<String> getParameterNames() {
            return Collections.enumeration(parameters.keySet());
        }

        @Override
        public String[] getParameterValues(String name) {
            String[] values = parameters.get(name);
            return values == null ? null : values.clone();
        }
    }
}
