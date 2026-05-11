package com.hrms.common.validation;

import jakarta.validation.Constraint;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import jakarta.validation.Payload;
import lombok.extern.slf4j.Slf4j;

import java.lang.annotation.*;
import java.net.InetAddress;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates webhook URLs to prevent SSRF attacks.
 *
 * <p>Security validations:</p>
 * <ul>
 *   <li>Must use HTTPS protocol</li>
 *   <li>Cannot target private/internal IP ranges (any resolved address)</li>
 *   <li>Cannot target localhost or loopback addresses</li>
 *   <li>Cannot target cloud metadata endpoints</li>
 *   <li>Cannot target obfuscated IP literals (decimal, octal, hex)</li>
 *   <li>Cannot target carrier-grade NAT (100.64/10) or IPv6 ULA (fc00::/7)</li>
 *   <li>Must have a valid hostname (UnknownHost = reject)</li>
 *   <li>Hostname must NOT be supplied as a numeric IP literal — DNS hostnames only</li>
 * </ul>
 *
 * <p>DNS-rebinding hardened: enumerates ALL addresses returned by
 * {@link InetAddress#getAllByName(String)} and rejects if ANY is unsafe.</p>
 */
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Constraint(validatedBy = WebhookUrlValidator.Validator.class)
public @interface WebhookUrlValidator {

    String message() default "Invalid webhook URL: must be a secure, publicly accessible HTTPS URL";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};

    @Slf4j
    class Validator implements ConstraintValidator<WebhookUrlValidator, String> {

        // Blocked hostnames for security
        private static final Set<String> BLOCKED_HOSTNAMES = Set.of(
                "localhost",
                "127.0.0.1",
                "0.0.0.0",
                "::1",
                "[::1]",
                "metadata.google.internal",     // GCP metadata
                "169.254.169.254",              // AWS/Azure/GCP metadata
                "metadata.azure.com",            // Azure metadata
                "kubernetes.default.svc"
        );

        // Dotted-quad IPv4
        private static final Pattern IP_PATTERN = Pattern.compile(
                "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");

        // Decimal IPv4 (e.g., 2130706433 = 127.0.0.1)
        private static final Pattern IPV4_DECIMAL = Pattern.compile("^\\d{1,10}$");

        // Hex IPv4 (e.g., 0x7f000001)
        private static final Pattern IPV4_HEX = Pattern.compile("^0x[0-9a-fA-F]+$");

        // Octal IPv4 (e.g., 0177.0.0.1)
        private static final Pattern IPV4_OCTAL_COMPONENT = Pattern.compile("^0[0-7]+(\\.[0-7]+){3}$");

        @Override
        public boolean isValid(String url, ConstraintValidatorContext context) {
            if (url == null || url.isBlank()) {
                return false;
            }

            try {
                URI uri = new URI(url);

                // Must use HTTPS
                if (!"https".equalsIgnoreCase(uri.getScheme())) {
                    setMessage(context, "Webhook URL must use HTTPS protocol");
                    return false;
                }

                String host = uri.getHost();
                if (host == null || host.isBlank()) {
                    setMessage(context, "Webhook URL must have a valid hostname");
                    return false;
                }

                String hostLower = host.toLowerCase();

                // Check blocked hostnames
                if (BLOCKED_HOSTNAMES.contains(hostLower)) {
                    setMessage(context, "Webhook URL cannot target localhost or internal services");
                    return false;
                }

                // SECURITY: reject ALL IP-literal hosts. Webhooks must use DNS names so
                // we can re-resolve and enforce policy at delivery time.
                if (isIpLiteralForm(host)) {
                    setMessage(context, "Webhook URL must use a DNS hostname, not an IP literal");
                    return false;
                }

                // Defense in depth: also block dotted-quad private ranges if somehow allowed earlier.
                if (IP_PATTERN.matcher(host).matches()) {
                    setMessage(context, "Webhook URL must use a DNS hostname, not an IP literal");
                    return false;
                }

                // Must resolve to public address(es). UnknownHost / private = reject.
                if (!isPubliclyResolvable(host)) {
                    setMessage(context, "Webhook URL hostname cannot be resolved or resolves to an internal address");
                    return false;
                }

                // Port validation - allow standard HTTPS port or common alternatives
                int port = uri.getPort();
                if (port != -1 && port != 443 && port != 8443) {
                    log.debug("Webhook URL uses non-standard port: {}", port);
                    // Allow but log
                }

                return true;

            } catch (URISyntaxException e) {
                setMessage(context, "Invalid URL format");
                return false;
            }
        }

        /**
         * DNS-rebinding hardened resolution check.
         *
         * <p>Enumerates ALL addresses returned by {@link InetAddress#getAllByName(String)}.
         * Rejects if ANY resolved address is loopback, link-local, site-local,
         * any-local, multicast, CG-NAT (100.64/10), 0.0.0.0/8, IPv6 ULA (fc00::/7),
         * or IPv4-mapped IPv6 of a blocked range.</p>
         *
         * <p>On {@link UnknownHostException}, returns false (reject). The old behavior
         * of allowing on DNS failure was a DNS-rebinding bypass.</p>
         */
        private boolean isPubliclyResolvable(String host) {
            try {
                InetAddress[] addresses = InetAddress.getAllByName(host);
                if (addresses == null || addresses.length == 0) {
                    return false;
                }
                for (InetAddress address : addresses) {
                    if (isBlocked(address)) {
                        return false;
                    }
                }
                return true;
            } catch (UnknownHostException e) {
                // SECURITY: DNS failure now rejects (was: return true). Without this,
                // an attacker controlling DNS could return private IPs at delivery time.
                log.warn("Webhook URL hostname could not be resolved: {}", host);
                return false;
            }
        }

        /**
         * Strict address classifier — see SsrfProtectionUtils for full rationale.
         */
        private boolean isBlocked(InetAddress a) {
            if (a.isLoopbackAddress() || a.isLinkLocalAddress() || a.isAnyLocalAddress()
                    || a.isMulticastAddress() || a.isSiteLocalAddress()) {
                return true;
            }
            byte[] b = a.getAddress();
            if (b.length == 4) {
                int o0 = b[0] & 0xFF;
                if (o0 == 0) return true;
                if (o0 == 100 && (b[1] & 0xC0) == 0x40) return true; // CG-NAT
                if (o0 == 169 && (b[1] & 0xFF) == 254) return true;
                if (o0 >= 224) return true;
            } else if (b.length == 16) {
                if ((b[0] & 0xFE) == 0xFC) return true; // ULA
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
         * Detect IP literals in any form: dotted-quad, decimal, hex, octal, IPv6.
         */
        private boolean isIpLiteralForm(String host) {
            if (host == null || host.isBlank()) return false;
            if (host.contains(":") || host.startsWith("[")) return true; // IPv6
            if (IP_PATTERN.matcher(host).matches()) return true;
            if (IPV4_DECIMAL.matcher(host).matches()) return true;
            if (IPV4_HEX.matcher(host).matches()) return true;
            if (IPV4_OCTAL_COMPONENT.matcher(host).matches()) return true;
            return false;
        }

        private void setMessage(ConstraintValidatorContext context, String message) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        }
    }
}
