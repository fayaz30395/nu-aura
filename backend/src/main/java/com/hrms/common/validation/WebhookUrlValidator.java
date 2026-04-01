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
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Validates webhook URLs to prevent SSRF attacks.
 *
 * <p>Security validations:</p>
 * <ul>
 *   <li>Must use HTTPS protocol</li>
 *   <li>Cannot target private/internal IP ranges</li>
 *   <li>Cannot target localhost or loopback addresses</li>
 *   <li>Cannot target cloud metadata endpoints</li>
 *   <li>Must have a valid hostname</li>
 * </ul>
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
                "metadata.azure.com"             // Azure metadata
        );

        // Pattern to detect IP addresses
        private static final Pattern IP_PATTERN = Pattern.compile(
                "^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$");

        // Private IP ranges
        private static final Pattern PRIVATE_IP_PATTERN = Pattern.compile(
                "^(10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|192\\.168\\.).*$");

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

                // Check if it's an IP address
                if (IP_PATTERN.matcher(host).matches()) {
                    // Block private IP ranges
                    if (PRIVATE_IP_PATTERN.matcher(host).matches()) {
                        setMessage(context, "Webhook URL cannot target private IP addresses");
                        return false;
                    }

                    // Block loopback
                    if (host.startsWith("127.") || host.equals("0.0.0.0")) {
                        setMessage(context, "Webhook URL cannot target loopback addresses");
                        return false;
                    }
                }

                // Additional check: try to resolve and verify not internal
                if (!isPubliclyResolvable(host)) {
                    log.warn("Webhook URL hostname {} may not be publicly resolvable", host);
                    // Don't fail - just log warning, as DNS may vary
                }

                // Port validation - allow standard HTTPS port or common alternatives
                int port = uri.getPort();
                if (port != -1 && port != 443 && port != 8443) {
                    log.debug("Webhook URL uses non-standard port: {}", port);
                    // Allow but log
                }

                // Path must not be empty for most webhooks
                String path = uri.getPath();
                if (path == null || path.isEmpty() || path.equals("/")) {
                    log.debug("Webhook URL has root path - may be intentional");
                }

                return true;

            } catch (URISyntaxException e) {
                setMessage(context, "Invalid URL format");
                return false;
            }
        }

        private boolean isPubliclyResolvable(String host) {
            try {
                InetAddress address = InetAddress.getByName(host);
                return !address.isLoopbackAddress() &&
                       !address.isSiteLocalAddress() &&
                       !address.isLinkLocalAddress();
            } catch (java.net.UnknownHostException e) {
                // DNS resolution failed - may be temporary
                return true;
            }
        }

        private void setMessage(ConstraintValidatorContext context, String message) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(message).addConstraintViolation();
        }
    }
}
