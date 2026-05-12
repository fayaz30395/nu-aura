package com.nulogic.common.validation;

import com.nulogic.common.exception.BusinessException;

import java.io.IOException;
import java.net.*;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Utility to validate URLs against SSRF attacks before making outbound HTTP requests.
 *
 * <p>Rejects URLs targeting private/loopback/link-local IP ranges,
 * cloud metadata endpoints, IPv4-mapped IPv6 traps, ULA IPv6 ranges,
 * carrier-grade NAT, and non-HTTPS schemes.</p>
 *
 * <p>DNS-rebinding hardened: resolves ALL addresses for the host and rejects
 * if ANY resolved address is unsafe. {@link UnknownHostException} is treated
 * as a validation failure (reject), not success.</p>
 *
 * <p>IP-literal hosts are parsed and run through {@link #isBlocked} before
 * any DNS resolution to defeat decimal/octal/hex obfuscated literals.</p>
 */
public final class SsrfProtectionUtils {

    private static final Set<String> BLOCKED_HOSTNAMES = Set.of(
            "metadata.google.internal",
            "metadata.google",
            "metadata.azure.com",
            "kubernetes.default.svc",
            "169.254.169.254"
    );

    // Matches dotted-quad IPv4 literals. Octal/decimal/hex tricks are caught by InetAddress.getByName.
    private static final Pattern IPV4_DOTTED = Pattern.compile(
            "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");

    // Matches decimal IPv4 (e.g., 2130706433 = 127.0.0.1).
    private static final Pattern IPV4_DECIMAL = Pattern.compile("^\\d{1,10}$");

    // Matches hex IPv4 (e.g., 0x7f000001).
    private static final Pattern IPV4_HEX = Pattern.compile("^0x[0-9a-fA-F]+$");

    // Matches octal IPv4 component (e.g., 0177.0.0.1).
    private static final Pattern IPV4_OCTAL_COMPONENT = Pattern.compile("^0[0-7]+(\\.[0-7]+){3}$");

    // Matches bracketed or bare IPv6 literals (any string with a colon is treated as IPv6 attempt).
    private static final Pattern IPV6_LIKE = Pattern.compile("^\\[?[0-9a-fA-F:.]+\\]?$");

    private SsrfProtectionUtils() {
    }

    /**
     * Validates that the given URL is safe to fetch (not targeting internal networks).
     *
     * <p>Throws {@link BusinessException} on rejection so existing callers using
     * exception-based control flow keep working.</p>
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

        String hostLower = host.toLowerCase();
        if (BLOCKED_HOSTNAMES.contains(hostLower)) {
            throw new BusinessException("URL points to a restricted hostname");
        }

        // 1. If host is an IP literal (any form), parse and check BEFORE DNS.
        //    This defeats obfuscated literals like 2130706433, 0x7f000001, 0177.0.0.1.
        if (isIpLiteralForm(host)) {
            try {
                InetAddress ip = InetAddress.getByName(host);
                if (isBlocked(ip)) {
                    throw new BusinessException("URL points to a restricted network address");
                }
            } catch (UnknownHostException e) {
                throw new BusinessException("Invalid IP literal in URL");
            }
        }

        // 2. Resolve ALL addresses (defeats DNS rebinding where one address is public, another private).
        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            if (addresses.length == 0) {
                throw new BusinessException("Unable to resolve hostname: " + host);
            }
            for (InetAddress addr : addresses) {
                if (isBlocked(addr)) {
                    throw new BusinessException("URL points to a restricted network address");
                }
            }
        } catch (UnknownHostException e) {
            // SECURITY: unknown host MUST reject (not pass). Old code allowed pass-through here.
            throw new BusinessException("Unable to resolve hostname: " + host);
        }
    }

    /**
     * Boolean-returning variant for callers that prefer non-exceptional flow.
     *
     * @return true if the URL passes SSRF validation, false otherwise
     */
    public static boolean isUrlSafe(String url) {
        try {
            validateUrlSafety(url);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }

    /**
     * Strict address classifier — blocks all loopback, link-local, site-local,
     * any-local, multicast, CG-NAT (100.64/10), 0.0.0.0/8, IPv6 ULA (fc00::/7),
     * IPv4-mapped IPv6, and reserved IPv4 ranges (224+).
     */
    private static boolean isBlocked(InetAddress a) {
        if (a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress()
                || a.isMulticastAddress() || a.isSiteLocalAddress()) {
            return true;
        }
        byte[] b = a.getAddress();
        if (b.length == 4) {
            int o0 = b[0] & 0xFF;
            if (o0 == 0) return true;                            // 0.0.0.0/8
            if (o0 == 100 && (b[1] & 0xC0) == 0x40) return true; // 100.64/10 CG-NAT
            if (o0 == 169 && (b[1] & 0xFF) == 254) return true;  // 169.254/16 (also covered by isLinkLocal)
            if (o0 >= 224) return true;                          // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
        } else if (b.length == 16) {
            if ((b[0] & 0xFE) == 0xFC) return true;              // fc00::/7 IPv6 ULA
            // IPv4-mapped IPv6: ::ffff:0:0/96 — unwrap and re-check the embedded IPv4
            boolean mapped = true;
            for (int i = 0; i < 10; i++) {
                if (b[i] != 0) {
                    mapped = false;
                    break;
                }
            }
            if (mapped && (b[10] & 0xFF) == 0xFF && (b[11] & 0xFF) == 0xFF) {
                byte[] inner = new byte[]{b[12], b[13], b[14], b[15]};
                try {
                    return isBlocked(InetAddress.getByAddress(inner));
                } catch (Exception e) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Detect whether the host string looks like an IP literal in ANY form
     * (dotted-quad, decimal, hex, octal, IPv6). Used to force IP parsing
     * BEFORE DNS so we don't accept obfuscated literals.
     */
    private static boolean isIpLiteralForm(String host) {
        if (host == null || host.isBlank()) return false;
        // IPv6 bracketed or anything with colons is IPv6-like
        if (host.contains(":") || host.startsWith("[")) return true;
        if (IPV4_DOTTED.matcher(host).matches()) return true;
        if (IPV4_DECIMAL.matcher(host).matches()) return true;
        if (IPV4_HEX.matcher(host).matches()) return true;
        if (IPV4_OCTAL_COMPONENT.matcher(host).matches()) return true;
        return false;
    }

    /**
     * Open an {@link HttpURLConnection} to the given URL after re-validating SSRF safety.
     *
     * <p>Note: a fully TOCTOU-safe implementation would bind the socket to a
     * pre-resolved IP address, but Java's URL/HttpURLConnection do not natively
     * support that. As a best-effort mitigation we:</p>
     * <ol>
     *   <li>re-run {@link #validateUrlSafety} immediately before opening the connection</li>
     *   <li>disable redirect-following so callers must re-validate any 3xx Location</li>
     * </ol>
     *
     * @param url              the URL to fetch (must pass SSRF validation)
     * @param connectTimeoutMs connect timeout in milliseconds
     * @return an unconnected {@link HttpURLConnection} with redirects disabled
     * @throws BusinessException if URL fails SSRF validation
     * @throws IOException       on connection setup failure
     */
    public static HttpURLConnection connectIfSafe(URL url, int connectTimeoutMs) throws IOException {
        if (url == null) {
            throw new BusinessException("URL must not be null");
        }
        validateUrlSafety(url.toString());
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setInstanceFollowRedirects(false);
        conn.setConnectTimeout(connectTimeoutMs);
        return conn;
    }
}
