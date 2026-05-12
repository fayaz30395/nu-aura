package com.nulogic.common.util;

import com.nulogic.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Strict allowlist-based URL validator for outbound HTTP from user-supplied inputs.
 *
 * <p>Complements {@link com.nulogic.common.validation.SsrfProtectionUtils} but enforces
 * an explicit port allowlist and supports an opt-in HTTP escape hatch
 * ({@code app.outbound.allow-http=true}) for non-prod profiles that need to talk to
 * internal CI fixtures over plain HTTP.</p>
 *
 * <p><strong>Hard rules (always enforced):</strong></p>
 * <ul>
 *   <li>scheme must be {@code https} (or {@code http} if the allow-http flag is on)</li>
 *   <li>port must be in {80, 443, 8080, 8443} unless extended via
 *       {@code app.outbound.extra-ports}</li>
 *   <li>hostname must NOT be in the cloud-metadata deny-list
 *       (169.254.169.254, metadata.google.internal, metadata.azure.com,
 *       100.100.100.200 [Alibaba], metadata.google)</li>
 *   <li>every resolved {@link InetAddress} for the host must be a public IP —
 *       RFC 1918 (10/8, 172.16/12, 192.168/16), link-local (169.254/16),
 *       IPv6 ULA (fc00::/7), multicast, loopback, any-local, CG-NAT (100.64/10),
 *       and 0.0.0.0/8 are all rejected</li>
 *   <li>IP-literal hosts are parsed BEFORE DNS so decimal/octal/hex tricks
 *       (e.g. {@code 2130706433}, {@code 0x7f000001}) cannot bypass the check</li>
 *   <li>{@link UnknownHostException} = reject (never pass) — closes DNS-rebind
 *       race where attacker DNS goes "private" between create and delivery</li>
 * </ul>
 *
 * <p>Two entry points are provided:</p>
 * <ul>
 *   <li>{@link #validate(String)} — throws {@link BusinessException} on rejection,
 *       useful at service-layer entry where we want exception-based flow</li>
 *   <li>{@link #isAllowed(String)} — boolean variant for tight inner loops</li>
 * </ul>
 */
@Component
@Slf4j
public class UrlAllowlistValidator {

    /**
     * Default port allowlist. Most outbound integrations talk on 443.
     * 80 is included to support the opt-in HTTP escape hatch; 8080/8443 cover
     * common dev-fixture / k8s ingress ports.
     */
    private static final Set<Integer> DEFAULT_ALLOWED_PORTS = Set.of(80, 443, 8080, 8443);

    /**
     * Metadata service hostnames + IPs that MUST never be reachable from this app.
     * These resolve to link-local addresses in the cloud and are the primary SSRF
     * exfiltration target for credential theft.
     */
    private static final Set<String> METADATA_DENY_LIST = Set.of(
            "169.254.169.254",            // AWS / Azure / GCP metadata
            "metadata.google.internal",   // GCP
            "metadata.google",            // GCP (short form)
            "metadata.azure.com",         // Azure IMDS
            "100.100.100.200",            // Alibaba Cloud metadata
            "kubernetes.default.svc"      // Kubernetes API from inside the cluster
    );

    /**
     * Dotted-quad IPv4 literal.
     */
    private static final Pattern IPV4_DOTTED = Pattern.compile(
            "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");

    /**
     * Decimal IPv4 literal (e.g. 2130706433 = 127.0.0.1).
     */
    private static final Pattern IPV4_DECIMAL = Pattern.compile("^\\d{1,10}$");

    /**
     * Hex IPv4 literal (e.g. 0x7f000001 = 127.0.0.1).
     */
    private static final Pattern IPV4_HEX = Pattern.compile("^0x[0-9a-fA-F]+$");

    /**
     * Octal IPv4 literal (e.g. 0177.0.0.1).
     */
    private static final Pattern IPV4_OCTAL_COMPONENT = Pattern.compile("^0[0-7]+(\\.[0-7]+){3}$");

    private final boolean allowHttp;
    private final Set<Integer> allowedPorts;

    public UrlAllowlistValidator(
            @Value("${app.outbound.allow-http:false}") boolean allowHttp,
            @Value("${app.outbound.extra-ports:}") String extraPortsCsv) {
        this.allowHttp = allowHttp;
        this.allowedPorts = buildAllowedPorts(extraPortsCsv);
        log.info("UrlAllowlistValidator initialized: allowHttp={} allowedPorts={}",
                allowHttp, allowedPorts);
    }

    /**
     * Validate the URL, throwing {@link BusinessException} on rejection.
     *
     * @param url candidate URL to be fetched
     * @throws BusinessException if the URL fails any allowlist rule
     */
    public void validate(String url) {
        if (url == null || url.isBlank()) {
            throw new BusinessException("URL must not be empty");
        }

        URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("Invalid URL format");
        }

        // 1. Scheme: https always allowed; http only with explicit opt-in.
        String scheme = uri.getScheme();
        if (scheme == null) {
            throw new BusinessException("URL must include a scheme");
        }
        String schemeLower = scheme.toLowerCase();
        if (!"https".equals(schemeLower) && !(allowHttp && "http".equals(schemeLower))) {
            throw new BusinessException("URL scheme not allowed: " + scheme);
        }

        // 2. Host: required, non-blank, not in the metadata deny-list.
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new BusinessException("URL must have a valid hostname");
        }
        String hostLower = host.toLowerCase();
        // Strip surrounding [] from IPv6 literal for deny-list comparison.
        String hostForDenyCheck = hostLower.startsWith("[") && hostLower.endsWith("]")
                ? hostLower.substring(1, hostLower.length() - 1)
                : hostLower;
        if (METADATA_DENY_LIST.contains(hostForDenyCheck)) {
            throw new BusinessException("URL points to a denied metadata endpoint");
        }

        // 3. Port: must be in the allowlist. -1 means default-for-scheme (443 for https, 80 for http).
        int port = uri.getPort();
        int effectivePort = port == -1
                ? ("https".equals(schemeLower) ? 443 : 80)
                : port;
        if (!allowedPorts.contains(effectivePort)) {
            throw new BusinessException("URL port not in allowlist: " + effectivePort);
        }

        // 4. IP-literal hosts: parse and check BEFORE DNS so obfuscated literals
        //    (decimal/octal/hex) are caught regardless of DNS state.
        if (isIpLiteralForm(host)) {
            try {
                InetAddress ip = InetAddress.getByName(host);
                if (isPrivateOrReserved(ip)) {
                    throw new BusinessException("URL points to a private or reserved address");
                }
            } catch (UnknownHostException e) {
                throw new BusinessException("Invalid IP literal in URL");
            }
        }

        // 5. Resolve ALL addresses and check each. UnknownHost rejects.
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException e) {
            throw new BusinessException("Hostname could not be resolved: " + host);
        }
        if (addresses == null || addresses.length == 0) {
            throw new BusinessException("Hostname could not be resolved: " + host);
        }
        for (InetAddress addr : addresses) {
            if (isPrivateOrReserved(addr)) {
                throw new BusinessException("URL resolves to a private or reserved address");
            }
        }
    }

    /**
     * Non-throwing variant. Returns true if {@link #validate(String)} would succeed.
     *
     * @param url candidate URL
     * @return true iff the URL passes every allowlist rule
     */
    public boolean isAllowed(String url) {
        try {
            validate(url);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }

    /**
     * Block all RFC 1918, link-local, multicast, loopback, any-local, CG-NAT,
     * 0.0.0.0/8, ULA, and IPv4-mapped IPv6 of any of the above.
     *
     * <p>Spring's {@link InetAddress#isSiteLocalAddress()} already covers
     * 10/8, 172.16/12, 192.168/16. We add explicit checks for the ranges
     * NOT covered by the standard helpers (CG-NAT, 0.0.0.0/8, ULA) and a
     * defensive 224+ check that catches both multicast (224/4) and reserved
     * (240/4) ranges in one go.</p>
     */
    private boolean isPrivateOrReserved(InetAddress a) {
        if (a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress()
                || a.isMulticastAddress() || a.isSiteLocalAddress()) {
            return true;
        }
        byte[] b = a.getAddress();
        if (b.length == 4) {
            int o0 = b[0] & 0xFF;
            if (o0 == 0) return true;                            // 0.0.0.0/8
            if (o0 == 100 && (b[1] & 0xC0) == 0x40) return true; // 100.64/10 CG-NAT
            if (o0 == 169 && (b[1] & 0xFF) == 254) return true;  // 169.254/16
            if (o0 >= 224) return true;                          // 224/4 + 240/4
            return false;
        }
        if (b.length == 16) {
            // fc00::/7 — IPv6 ULA. First byte high 7 bits == 1111 110.
            if ((b[0] & 0xFE) == 0xFC) return true;
            // IPv4-mapped IPv6 (::ffff:0:0/96): unwrap and re-check the embedded v4.
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
                    return isPrivateOrReserved(InetAddress.getByAddress(inner));
                } catch (UnknownHostException e) {
                    return true; // unwrap failed — reject defensively
                }
            }
        }
        return false;
    }

    /**
     * Detect whether the host string looks like an IP literal in ANY form.
     * Used to force pre-DNS parsing so obfuscated literals can't bypass the policy.
     */
    private boolean isIpLiteralForm(String host) {
        if (host == null || host.isBlank()) return false;
        if (host.contains(":") || host.startsWith("[")) return true;     // IPv6
        if (IPV4_DOTTED.matcher(host).matches()) return true;
        if (IPV4_DECIMAL.matcher(host).matches()) return true;
        if (IPV4_HEX.matcher(host).matches()) return true;
        if (IPV4_OCTAL_COMPONENT.matcher(host).matches()) return true;
        return false;
    }

    /**
     * Merge the default allowlist with the comma-separated extra-ports config.
     * Invalid entries are silently skipped (with a warning log) so a typo in
     * deployment config cannot brick all outbound HTTP.
     */
    private Set<Integer> buildAllowedPorts(String extraPortsCsv) {
        Set<Integer> ports = new HashSet<>(DEFAULT_ALLOWED_PORTS);
        if (extraPortsCsv == null || extraPortsCsv.isBlank()) {
            return Collections.unmodifiableSet(ports);
        }
        Arrays.stream(extraPortsCsv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .forEach(s -> {
                    try {
                        int port = Integer.parseInt(s);
                        if (port < 1 || port > 65535) {
                            log.warn("UrlAllowlistValidator: ignoring out-of-range extra port {}", port);
                            return;
                        }
                        ports.add(port);
                    } catch (NumberFormatException nfe) {
                        log.warn("UrlAllowlistValidator: ignoring non-numeric extra port '{}'", s);
                    }
                });
        return Collections.unmodifiableSet(ports);
    }
}
