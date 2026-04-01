package com.hrms.common.security;

import java.lang.annotation.*;

/**
 * Annotation to enforce webhook scope requirements for API key authentication.
 *
 * <p>When a request is authenticated via API key, this annotation ensures
 * the key has the required scope(s). For JWT-authenticated requests with
 * SYSTEM:ADMIN permission, the scope check is bypassed.</p>
 *
 * <p>Usage:</p>
 * <pre>
 * &#64;RequiresWebhookScope(WebhookScopes.WEBHOOK_READ)
 * public ResponseEntity&lt;List&lt;WebhookResponse&gt;&gt; listWebhooks() { ... }
 *
 * &#64;RequiresWebhookScope({WebhookScopes.WEBHOOK_WRITE, WebhookScopes.WEBHOOK_MANAGE})
 * public ResponseEntity&lt;Void&gt; updateAndActivate(...) { ... }
 * </pre>
 *
 * @see WebhookScopes
 * @see WebhookScopeAspect
 */
@Target({ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequiresWebhookScope {

    /**
     * The webhook scope(s) required to access the annotated method.
     * If multiple scopes are specified, ANY of them grants access (OR logic).
     *
     * @return array of required scope strings
     */
    String[] value();
}
