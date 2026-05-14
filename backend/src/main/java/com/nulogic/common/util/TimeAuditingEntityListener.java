package com.nulogic.common.util;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tenant-aware JPA {@code @PrePersist} / {@code @PreUpdate} listener that stamps fields
 * annotated with {@link TenantTimestamp} from {@link TenantTimeService}.
 *
 * <h3>Why this exists</h3>
 * <p>The audit at {@code backend/docs/audit/prepersist-now-audit.md} catalogued 34 entity
 * callbacks across 26 classes that read {@code LocalDate.now()} / {@code LocalDateTime.now()}
 * from a server-default-zone wall clock. That drifts the moment a tenant lives outside the
 * server's zone. The architecture design at
 * {@code backend/docs/architecture/timeprovider-seam-design.md} (Option B) recommends a
 * Spring-managed JPA listener as the seam that closes this gap while preserving entity
 * invariants. This is that listener.</p>
 *
 * <h3>How it reaches the {@link TenantTimeService}</h3>
 * <p>JPA spec lets Hibernate construct entity-listener instances either directly
 * ({@code new TimeAuditingEntityListener()}) or via a {@code BeanContainer}. Spring Boot's
 * {@code HibernateJpaConfiguration} auto-installs {@code SpringBeanContainer} on the
 * Hibernate {@code EntityManagerFactory}, so this {@link Component} is wired by Spring —
 * BUT we deliberately use a setter-based {@code @Autowired} on a {@code static}
 * field as defence-in-depth: even if Hibernate fell back to direct instantiation in some
 * test harness or future configuration, the static reference (initialised once when Spring
 * builds the bean during application startup) remains reachable. This matches the
 * "Spring-managed JPA listener with static-setter injection" pattern from the design doc §3.
 * </p>
 *
 * <h3>Ordering with other listeners</h3>
 * <p>Entities migrated to this listener must list it <em>after</em> {@code TenantEntityListener}
 * in their {@code @EntityListeners} array (or inherit {@code TenantEntityListener} via the
 * {@code TenantAware} mapped superclass and add this listener at the entity level — JPA runs
 * superclass listeners before entity-level listeners per spec §3.5.4). This guarantees the
 * {@code tenantId} is populated when we read it here.</p>
 *
 * <h3>Failure modes</h3>
 * <ul>
 *   <li><strong>Listener not yet wired</strong> (e.g. an entity is persisted during a bean's
 *       {@code @PostConstruct} before this bean's {@code @Autowired} setter has fired): the
 *       listener logs at WARN and falls back to {@code LocalDate(Time).now()} so the write
 *       does not crash. This preserves the existing behaviour for that narrow edge case.</li>
 *   <li><strong>Missing tenant context</strong>: if {@code tenantId} is {@code null} when the
 *       callback fires (SuperAdmin / system jobs), {@link TenantTimeService} itself falls back
 *       to {@code Asia/Kolkata}; we do not duplicate that logging here.</li>
 *   <li><strong>Unsupported field type</strong>: an {@code @TenantTimestamp} on a field that
 *       is neither {@link LocalDateTime} nor {@link LocalDate} throws
 *       {@link IllegalStateException} on the first persist of that entity class — surfaces
 *       the misuse immediately rather than silently skipping the field.</li>
 * </ul>
 *
 * @see TenantTimestamp
 * @see TenantTimeService
 * @see com.nulogic.common.entity.TenantEntityListener
 */
@Component
@Slf4j
public class TimeAuditingEntityListener {

    /**
     * Cache of {@code Class → annotated Field[]}. Reflection is done once per entity class
     * the first time an instance of it is persisted; subsequent flushes are array iteration.
     */
    private static final Map<Class<?>, List<Field>> FIELD_CACHE = new ConcurrentHashMap<>();

    /**
     * Sentinel for classes with no {@code @TenantTimestamp} fields, so we don't re-scan
     * an entity class on every flush after determining it has nothing to stamp.
     */
    private static final List<Field> EMPTY = List.of();

    /**
     * Singleton {@link TenantTimeService}. Set by Spring via the {@code @Autowired} setter
     * below during application startup. {@code volatile} so the read inside the JPA
     * callback sees the assignment regardless of thread.
     */
    private static volatile TenantTimeService timeService;

    /**
     * Setter-based injection so the static field is populated when Spring instantiates
     * this {@code @Component}. Hibernate may also instantiate listeners directly (no DI),
     * in which case this setter never fires on that instance — but Spring will have already
     * set the static field on the bean instance it created during context refresh, so the
     * static reference is live by the time any JPA flush occurs.
     *
     * @param service the Spring-managed {@link TenantTimeService} bean
     */
    @Autowired
    public void setTimeService(TenantTimeService service) {
        TimeAuditingEntityListener.timeService = service;
    }

    /**
     * Stamp every {@code @TenantTimestamp} field that is currently {@code null} with the
     * tenant-zone "now". Non-null fields are preserved (caller-supplied values win).
     *
     * @param entity the entity about to be persisted
     */
    @PrePersist
    public void onPrePersist(Object entity) {
        List<Field> fields = annotatedFields(entity.getClass());
        if (fields.isEmpty()) {
            return;
        }
        UUID tenantId = tenantIdOf(entity);
        for (Field field : fields) {
            try {
                if (field.get(entity) == null) {
                    field.set(entity, resolveNow(field, tenantId));
                }
            } catch (IllegalAccessException e) {
                // Field was made accessible during cache build, so this should never fire.
                log.error("[TimeAuditingEntityListener] Cannot stamp {}#{} on persist",
                        entity.getClass().getSimpleName(), field.getName(), e);
            }
        }
    }

    /**
     * Stamp every {@code @TenantTimestamp(updateOnChange=true)} field with the current
     * tenant-zone "now" — matching the legacy {@code updatedAt = LocalDateTime.now()}
     * pattern. Fields with {@code updateOnChange=false} (the default) are not touched.
     *
     * @param entity the entity about to be updated
     */
    @PreUpdate
    public void onPreUpdate(Object entity) {
        List<Field> fields = annotatedFields(entity.getClass());
        if (fields.isEmpty()) {
            return;
        }
        UUID tenantId = tenantIdOf(entity);
        for (Field field : fields) {
            TenantTimestamp meta = field.getAnnotation(TenantTimestamp.class);
            if (meta == null || !meta.updateOnChange()) {
                continue;
            }
            try {
                field.set(entity, resolveNow(field, tenantId));
            } catch (IllegalAccessException e) {
                log.error("[TimeAuditingEntityListener] Cannot stamp {}#{} on update",
                        entity.getClass().getSimpleName(), field.getName(), e);
            }
        }
    }

    /**
     * Resolve the tenant-zone "now" for the field's declared type. Falls back to the
     * JVM default zone with a WARN log if the {@link TenantTimeService} bean has not yet
     * been wired (only possible in early-startup edge cases or untested harnesses).
     *
     * @param field    the annotated field; its declared type determines whether we return
     *                 a {@link LocalDate} or {@link LocalDateTime}
     * @param tenantId the tenant id to resolve the zone for; may be {@code null}
     * @return the resolved value to assign to the field
     */
    private Object resolveNow(Field field, UUID tenantId) {
        TenantTimeService svc = timeService;
        Class<?> type = field.getType();
        if (svc == null) {
            log.warn("[TimeAuditingEntityListener] TenantTimeService not yet wired when "
                    + "stamping {}#{} — falling back to JVM default zone. This is only "
                    + "expected during very early application startup.",
                    field.getDeclaringClass().getSimpleName(), field.getName());
            return type == LocalDate.class ? LocalDate.now() : LocalDateTime.now();
        }
        return type == LocalDate.class ? svc.today(tenantId) : svc.now(tenantId);
    }

    /**
     * Extract the tenant id from a {@link TenantAware} entity. Returns {@code null} for
     * non-tenant-aware entities or when the tenant id has not been populated yet (in
     * which case {@link TenantTimeService} falls back to its default zone).
     *
     * @param entity the entity being persisted or updated
     * @return the tenant id, or {@code null} if not available
     */
    private UUID tenantIdOf(Object entity) {
        if (entity instanceof TenantAware tenantAware) {
            return tenantAware.getTenantId();
        }
        return null;
    }

    /**
     * Resolve and cache the list of {@code @TenantTimestamp} fields for an entity class,
     * walking the superclass chain so inherited annotated fields are included. Validates
     * field types eagerly so misuse surfaces on the first persist rather than silently.
     *
     * @param type the entity class
     * @return the list of annotated fields, or {@link #EMPTY} if none
     */
    private List<Field> annotatedFields(Class<?> type) {
        List<Field> cached = FIELD_CACHE.get(type);
        if (cached != null) {
            return cached;
        }
        List<Field> found = new ArrayList<>();
        Class<?> current = type;
        while (current != null && current != Object.class) {
            for (Field field : current.getDeclaredFields()) {
                if (!field.isAnnotationPresent(TenantTimestamp.class)) {
                    continue;
                }
                Class<?> ft = field.getType();
                if (ft != LocalDate.class && ft != LocalDateTime.class) {
                    throw new IllegalStateException(
                            "@TenantTimestamp on " + current.getSimpleName() + "#" + field.getName()
                                    + " applied to unsupported type " + ft.getName()
                                    + " — only LocalDate and LocalDateTime are supported.");
                }
                field.setAccessible(true);
                found.add(field);
            }
            current = current.getSuperclass();
        }
        List<Field> result = found.isEmpty() ? EMPTY : List.copyOf(found);
        FIELD_CACHE.put(type, result);
        return result;
    }
}
