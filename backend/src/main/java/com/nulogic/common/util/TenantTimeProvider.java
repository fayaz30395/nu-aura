package com.nulogic.common.util;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Static-accessor facade over {@link TenantTimeService} for domain code that cannot accept
 * constructor/field injection — primarily entity domain-predicate methods (e.g.
 * {@code isExpired()}, {@code isActive()}, {@code shouldSendReminder()}) that are called
 * inside JPA entity bodies, not Spring-managed beans.
 *
 * <h3>Why a static holder instead of injected calls</h3>
 * <p>JPA entity instances are constructed by Hibernate, not by Spring, so
 * {@code @Autowired} / {@code @Inject} on entity fields is unsupported by JPA spec and
 * unreliable in practice. {@code @EntityListeners} beans <em>can</em> reach Spring via
 * {@code SpringBeanContainer} (as {@link TimeAuditingEntityListener} does for persist-time
 * stamping), but listener callbacks fire only on lifecycle events — not when application
 * code directly calls a predicate method on a hydrated entity.
 * The static-holder pattern is the established fallback for this gap
 * (see {@code backend/docs/architecture/timeprovider-seam-design.md} §3).</p>
 *
 * <h3>Initialisation contract</h3>
 * <p>Spring calls {@link #init()} via {@code @PostConstruct} once the bean is constructed.
 * This sets {@link #INSTANCE} before any HTTP request or scheduled job can access entity
 * predicates, because Spring refreshes the application context before Tomcat opens the
 * acceptor socket and before any {@code @Scheduled} trigger fires.
 * The only window where {@code INSTANCE} is {@code null} is the narrow slice between JVM
 * start and first bean post-construction — typically a few hundred milliseconds and covered
 * by the null guard in every public method.</p>
 *
 * <h3>Fallback policy (INSTANCE not yet set)</h3>
 * <p>If any public method is called before {@link #init()} has run (only possible in unit
 * tests that construct entities directly or in exotic early-startup scenarios), the methods
 * fall back to the JVM-local {@code LocalDate(Time).now()} and log at {@code WARN}. This
 * preserves correctness for single-zone deployments and prevents a {@code NullPointerException}
 * from crashing entity predicate evaluation before the context is fully ready.</p>
 *
 * <h3>Thread safety</h3>
 * <p>{@link #INSTANCE} is {@code volatile}; the write in {@link #init()} happens-before
 * every subsequent read in the public methods per JMM §17.4.5. No lock is needed because
 * {@link TenantTimeService} itself is thread-safe (see its Javadoc).</p>
 *
 * <h3>Test isolation</h3>
 * <p>Unit tests can override the provider by calling {@link #setForTest(TenantTimeService)}
 * and MUST call {@link #clearForTest()} in {@code @AfterEach} to avoid leaking state to
 * subsequent tests. The {@code ForTest} suffix signals test-only use; production code must
 * never call these methods.</p>
 *
 * <h3>Wiring sequence</h3>
 * <p>Spring satisfies {@code @Autowired} on this bean's constructor (through the two-arg
 * {@link TenantTimeService} constructor) before {@link #init()} fires. If this bean is
 * somehow instantiated twice (unlikely but theoretically possible in a refresh scenario),
 * the second {@code @PostConstruct} simply overwrites the static field with the same
 * service reference — idempotent and safe.</p>
 *
 * @see TenantTimeService
 * @see TimeAuditingEntityListener
 */
@Component
@Slf4j
public class TenantTimeProvider {

    /**
     * The singleton {@link TenantTimeService} reference. {@code volatile} guarantees
     * visibility across threads. {@code null} only before {@link #init()} has fired
     * (i.e., before Spring context is fully started).
     *
     * <p><strong>Fallback contract:</strong> when {@code null}, every public method falls
     * back to the JVM-local zone and logs at WARN. This is intentional — crashing at
     * entity-predicate call time is worse than returning a server-zone date during the
     * narrow startup window or in an uninitialised unit-test environment.</p>
     */
    private static volatile TenantTimeService INSTANCE;

    /**
     * Spring-managed {@link TenantTimeService} injected via constructor; wired before
     * {@link #init()} fires. Kept as an instance field so {@link #init()} can assign it
     * to the static holder.
     */
    private final TenantTimeService timeService;

    @Autowired
    public TenantTimeProvider(TenantTimeService timeService) {
        this.timeService = timeService;
    }

    /**
     * Wires the static holder after Spring constructs this bean. Called automatically by
     * Spring via {@code @PostConstruct}; must not be called from production application code.
     */
    @PostConstruct
    void init() {
        INSTANCE = this.timeService;
        log.info("[TenantTimeProvider] Static holder wired — entity predicates will use "
                + "tenant-zone time resolution (fallback zone: {}).", TenantTimeService.DEFAULT_ZONE);
    }

    // -------------------------------------------------------------------------
    // Public static API — called from entity domain-predicate methods
    // -------------------------------------------------------------------------

    /**
     * Return the current date in the tenant's configured IANA timezone.
     *
     * <p>Falls back to {@code LocalDate.now()} (JVM default zone) when the static holder
     * has not been initialised (unit tests that do not bootstrap Spring, or early-startup
     * edge cases). The fallback is logged at WARN so it is visible in CI output.</p>
     *
     * @param tenantId the tenant whose configured timezone should be used;
     *                 {@code null} causes {@link TenantTimeService} to fall back to
     *                 {@link TenantTimeService#DEFAULT_ZONE}
     * @return today's date in the tenant's zone, or in the JVM-local zone on fallback
     */
    public static LocalDate today(UUID tenantId) {
        TenantTimeService svc = INSTANCE;
        if (svc == null) {
            log.warn("[TenantTimeProvider] today() called before Spring context is ready "
                    + "(tenantId={}). Falling back to JVM-local LocalDate.now(). "
                    + "If this appears in production logs, check bean initialisation order.", tenantId);
            // JVM-local fallback: documented startup/test fallback — see class Javadoc §Fallback policy.
            return LocalDate.now();
        }
        return svc.today(tenantId);
    }

    /**
     * Return the current datetime in the tenant's configured IANA timezone.
     *
     * <p>Falls back to {@code LocalDateTime.now()} (JVM default zone) when uninitialised.
     * See {@link #today(UUID)} for the full fallback contract.</p>
     *
     * @param tenantId the tenant whose configured timezone should be used;
     *                 {@code null} uses {@link TenantTimeService#DEFAULT_ZONE}
     * @return current datetime in the tenant's zone, or in the JVM-local zone on fallback
     */
    public static LocalDateTime now(UUID tenantId) {
        TenantTimeService svc = INSTANCE;
        if (svc == null) {
            log.warn("[TenantTimeProvider] now() called before Spring context is ready "
                    + "(tenantId={}). Falling back to JVM-local LocalDateTime.now(). "
                    + "If this appears in production logs, check bean initialisation order.", tenantId);
            // JVM-local fallback: documented startup/test fallback — see class Javadoc §Fallback policy.
            return LocalDateTime.now();
        }
        return svc.now(tenantId);
    }

    // -------------------------------------------------------------------------
    // Test-support hooks — test code only; NEVER call from production code
    // -------------------------------------------------------------------------

    /**
     * Override the static holder with a test double for unit testing entity predicates.
     *
     * <p>Call this in {@code @BeforeEach} to inject a controlled {@link TenantTimeService},
     * and call {@link #clearForTest()} in {@code @AfterEach} to restore {@code null} so
     * subsequent tests in the same JVM run start from a clean state.</p>
     *
     * <p>This method is package-private intentionally — only tests in the same package (or
     * the test module) should call it. Production callers must go through the Spring context.</p>
     *
     * @param service the test-controlled {@link TenantTimeService}; must not be {@code null}
     */
    static void setForTest(TenantTimeService service) {
        INSTANCE = service;
    }

    /**
     * Clear the static holder after a test so other tests see an uninitialised provider.
     * Pair every {@link #setForTest(TenantTimeService)} call with a {@code @AfterEach}
     * call to this method.
     */
    static void clearForTest() {
        INSTANCE = null;
    }
}
