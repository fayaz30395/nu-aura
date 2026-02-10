package com.hrms.common.security;

/**
 * Defines the available scopes for webhook API key authentication.
 *
 * <p>These scopes control what operations an API key can perform
 * on webhook resources when using X-API-Key authentication.</p>
 *
 * <p>Usage in API key creation:</p>
 * <pre>
 * Set&lt;String&gt; scopes = Set.of(
 *     WebhookScopes.WEBHOOK_READ,
 *     WebhookScopes.WEBHOOK_WRITE
 * );
 * </pre>
 */
public final class WebhookScopes {

    private WebhookScopes() {
        // Prevent instantiation
    }

    /**
     * Scope for reading webhook configurations.
     * Allows: GET /api/webhooks, GET /api/webhooks/{id}
     */
    public static final String WEBHOOK_READ = "webhook:read";

    /**
     * Scope for creating and updating webhooks.
     * Allows: POST /api/webhooks, PUT /api/webhooks/{id}
     */
    public static final String WEBHOOK_WRITE = "webhook:write";

    /**
     * Scope for deleting webhooks.
     * Allows: DELETE /api/webhooks/{id}
     */
    public static final String WEBHOOK_DELETE = "webhook:delete";

    /**
     * Scope for managing webhook status (activate/deactivate).
     * Allows: POST /api/webhooks/{id}/activate, POST /api/webhooks/{id}/deactivate
     */
    public static final String WEBHOOK_MANAGE = "webhook:manage";

    /**
     * Scope for viewing webhook delivery history.
     * Allows: GET /api/webhooks/{id}/deliveries
     */
    public static final String WEBHOOK_DELIVERIES_READ = "webhook:deliveries:read";

    /**
     * Scope for retrying failed webhook deliveries.
     * Allows: POST /api/webhooks/deliveries/{id}/retry
     */
    public static final String WEBHOOK_DELIVERIES_RETRY = "webhook:deliveries:retry";

    /**
     * Full admin scope - grants all webhook permissions.
     * Equivalent to having all individual scopes.
     */
    public static final String WEBHOOK_ADMIN = "webhook:admin";

    /**
     * Check if the given scope grants access to the specified operation scope.
     *
     * @param grantedScope The scope the API key has
     * @param requiredScope The scope required for the operation
     * @return true if access is granted
     */
    public static boolean hasScope(String grantedScope, String requiredScope) {
        // Admin scope grants everything
        if (WEBHOOK_ADMIN.equals(grantedScope)) {
            return true;
        }
        // Exact match
        return grantedScope.equals(requiredScope);
    }

    /**
     * Check if any of the granted scopes satisfy the required scope.
     *
     * @param grantedScopes The scopes the API key has
     * @param requiredScope The scope required for the operation
     * @return true if access is granted
     */
    public static boolean hasAnyScope(java.util.Set<String> grantedScopes, String requiredScope) {
        if (grantedScopes == null || grantedScopes.isEmpty()) {
            return false;
        }
        return grantedScopes.stream().anyMatch(scope -> hasScope(scope, requiredScope));
    }
}
