package com.nulogic.common.api.response;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Opt-in marker: when present on a {@code @RestController} class or handler
 * method, {@link ApiResponseBodyAdvice} wraps the response body into
 * {@link ApiResponse} before serialization.
 *
 * <p>Unmarked controllers are left untouched so the migration to the standard
 * envelope can be staged.</p>
 *
 * <p><strong>Migration play:</strong>
 * <pre>
 * &#64;RestController
 * &#64;WrapResponse                              // 1. annotate
 * public class FooController {
 *
 *   &#64;GetMapping("/{id}")
 *   public FooDto get(@PathVariable UUID id) { // 2. return T, not ResponseEntity&lt;T&gt;
 *     return service.find(id);                 // 3. drop ResponseEntity.ok(...)
 *   }
 * }
 * </pre>
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface WrapResponse {
}
