package com.nulogic.common.util;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a {@link java.time.LocalDate} or {@link java.time.LocalDateTime} entity field that
 * should be defaulted by {@link TimeAuditingEntityListener} using
 * {@link TenantTimeService} on JPA lifecycle callbacks.
 *
 * <p>The listener inspects every {@code @TenantTimestamp}-annotated field on the entity at
 * {@code @PrePersist} (and optionally {@code @PreUpdate}) and stamps it from the tenant's
 * zone — closing the unzoned-{@code LocalDate(Time).now()} gap audited in
 * {@code backend/docs/audit/prepersist-now-audit.md} (34 callbacks across 26 entities).</p>
 *
 * <h3>Semantics</h3>
 * <ul>
 *   <li><strong>Persist</strong>: if the field value is {@code null}, the listener stamps
 *       {@code tenantTimeService.now(tenantId)} (for {@code LocalDateTime}) or
 *       {@code tenantTimeService.today(tenantId)} (for {@code LocalDate}). Non-null values
 *       are preserved — this mirrors the null-guarded callback pattern from the audit.</li>
 *   <li><strong>Update</strong>: when {@link #updateOnChange()} is {@code true}, the listener
 *       unconditionally stamps the field on every {@code @PreUpdate}. Use this for fields
 *       that track "last modified" semantics in business terms. Defaults to {@code false}
 *       so the listener is safe to add without changing the value of create-only fields.</li>
 * </ul>
 *
 * <h3>Supported field types</h3>
 * <ul>
 *   <li>{@link java.time.LocalDateTime}</li>
 *   <li>{@link java.time.LocalDate}</li>
 * </ul>
 * Any other field type triggers a startup-time {@link IllegalStateException} via reflection
 * the first time the listener processes that entity class.
 *
 * <h3>Pilot &amp; rollout pattern</h3>
 * <p>Pilot entity: {@code RecognitionReaction.reactedAt}. To extend this listener to one of
 * the remaining 33 audited callbacks:</p>
 * <ol>
 *   <li>Annotate the offending field(s) with {@code @TenantTimestamp} (set
 *       {@code updateOnChange=true} only for fields the in-entity {@code @PreUpdate} was
 *       unconditionally restamping — see audit table).</li>
 *   <li>Add {@code @EntityListeners(TimeAuditingEntityListener.class)} to the entity class
 *       (in addition to any existing listeners — JPA permits multiple).</li>
 *   <li>Delete the corresponding {@code @PrePersist} / {@code @PreUpdate} method that called
 *       {@code LocalDate(Time).now()}.</li>
 *   <li>If the entity's class-level listener list also includes
 *       {@code TenantEntityListener}, place {@code TimeAuditingEntityListener} <em>after</em>
 *       it so the {@code tenantId} is populated before the timestamp listener reads it.</li>
 *   <li>Run {@code mvn -pl backend test -Dtest=TenantTimeArchitectureTest} after the final
 *       entity is migrated and drop the {@code @PrePersist} exemption documented in that
 *       test (see {@code backend/docs/architecture/timeprovider-seam-design.md} §6).</li>
 * </ol>
 *
 * @see TimeAuditingEntityListener
 * @see TenantTimeService
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.FIELD)
public @interface TenantTimestamp {

    /**
     * When {@code true}, the listener restamps the field on every {@code @PreUpdate}
     * (matching the legacy {@code updatedAt = LocalDateTime.now()} pattern).
     * When {@code false} (the default), the field is only stamped on {@code @PrePersist}
     * and only if it is currently {@code null}.
     *
     * @return whether the listener should overwrite the field on update
     */
    boolean updateOnChange() default false;
}
