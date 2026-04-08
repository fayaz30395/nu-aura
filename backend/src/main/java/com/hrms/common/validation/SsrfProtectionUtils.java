package com.hrms.common.validation;

import com.hrms.common.exception.BusinessException;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Set;

/**
 * Utility to validate URLs against SSRF attacks before making outbound HTTP requests.
 *
 * <p>Rejects URLs targeting private/loopback/link-local IP ranges,
 * cloud metadata endpoints, and non-HTTPS schemes.</p>
 */
public final class SsrfProtectionUtils {

    private static final Set<String> BLOCKED_HOSTNAMES = Set.of(
            "metadata.google.internal",
            "metadata.google",
            "metadata.azure.com",
            "kubernetes.default.svc",
            "169.254.169.254"
    );

    private SsrfProtectionUtils() {
    }

    /**
     * Validates that the given URL is safe to fetch (not targeting internal networks).
     *
     * @param url the URL to validate
     * @throws BusinessException if the URL is null, non-HTTPS, or points to a restricted address
     */
    public static void validateUrlSafety(String url) {
        if (url == null || url.isBlank()) {
            throw new BusinessException("URL must not be empty");
        }

        URI uri;
        try {
            uri = URI.create(url);
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid URL format");
        }

        String scheme = uri.getScheme();
        if (scheme == null || !scheme.equalsIgnoreCase("https")) {
            throw new BusinessException("Only HTTPS URLs are allowed");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new BusinessException("URL must have a valid hostname");
        }

        if (BLOCKED_HOSTNAMES.contains(host.toLowerCase())) {
            throw new BusinessException("URL points to a restricted hostname");
        }

        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress addr : addresses) {
                if (addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                        || addr.isSiteLocalAddress() || addr.isAnyLocalAddress()) {
                    throw new BusinessException("URL points to a restricted network address");
                }
            }
        } catch (UnknownHostException e) {
            throw new BusinessException("Unable to resolve hostname: " + host);
        }
    }
}
