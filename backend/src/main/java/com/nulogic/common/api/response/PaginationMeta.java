package com.nulogic.common.api.response;

import org.springframework.data.domain.Page;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Helper that converts a Spring {@link Page} into the {@code meta} map used by
 * {@link ApiResponse}.
 *
 * <p>Controllers returning paged content should return {@code data: List<T>}
 * and pass the page through {@link #from(Page)} for {@code meta}:
 * <pre>
 * Page&lt;FooDto&gt; page = service.list(pageable);
 * return ApiResponse.of(page.getContent(), PaginationMeta.from(page), MDC.get("requestId"));
 * </pre>
 *
 * <p>Keys (stable, in this order):
 * <ul>
 *   <li>{@code page} — current page number (0-based)</li>
 *   <li>{@code size} — page size</li>
 *   <li>{@code totalElements} — total records across all pages</li>
 *   <li>{@code totalPages} — total page count</li>
 * </ul>
 */
public final class PaginationMeta {

    private PaginationMeta() {
    }

    public static Map<String, Object> from(Page<?> page) {
        Map<String, Object> meta = new LinkedHashMap<>(4);
        meta.put("page", page.getNumber());
        meta.put("size", page.getSize());
        meta.put("totalElements", page.getTotalElements());
        meta.put("totalPages", page.getTotalPages());
        return meta;
    }
}
