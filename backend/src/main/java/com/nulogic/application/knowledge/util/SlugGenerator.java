package com.nulogic.application.knowledge.util;

import java.util.Locale;
import java.util.function.Predicate;

/** Builds a URL slug from a title and appends -2, -3... until {@code exists} says it is free. */
public final class SlugGenerator {

    private static final int MAX_BASE_LENGTH = 200;

    private SlugGenerator() {
    }

    public static String unique(String title, String fallback, Predicate<String> exists) {
        String base = title == null ? "" : title.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
        if (base.length() > MAX_BASE_LENGTH) {
            base = base.substring(0, MAX_BASE_LENGTH).replaceAll("-+$", "");
        }
        if (base.isEmpty()) {
            base = fallback;
        }
        String candidate = base;
        for (int n = 2; exists.test(candidate); n++) {
            candidate = base + "-" + n;
        }
        return candidate;
    }
}
