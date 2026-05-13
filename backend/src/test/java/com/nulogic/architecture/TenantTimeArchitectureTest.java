package com.nulogic.architecture;

import com.nulogic.HrmsApplication;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaAccess;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

/**
 * ArchUnit guards against regressions of the "unzoned now()" anti-pattern.
 *
 * <p>NU-AURA is country-aware (V155 added the {@code country} column on tenants) and the
 * Wave-10 audit P0-3 follow-up (S11-M) swept ~785 raw {@code LocalDate(Time).now()} call
 * sites onto {@link com.nulogic.common.util.TenantTimeService}. These rules exist so that
 * the next contributor to land on this codebase cannot accidentally re-introduce a server-zone
 * dependent date/time read into production code.
 *
 * <p><strong>Scope.</strong> Tests, configuration classes, and JPA {@code @PrePersist} /
 * {@code @PreUpdate} entity callbacks are intentionally excluded — those run inside JPA
 * lifecycle and don't drive business decisions (auditing columns can stay UTC-ish, the row
 * is being persisted regardless of which calendar day the wall clock says it is).
 *
 * <p><strong>What we deliberately don't flag.</strong> {@code Instant.now()} is fine —
 * an {@code Instant} carries no zone, and the conversion to a wall-clock {@code LocalDate}
 * has to go through a {@code ZoneId} explicitly. Only the zero-arg {@code LocalDate.now()}
 * and {@code LocalDateTime.now()} overloads silently consume the JVM default zone.
 */
@AnalyzeClasses(
        packagesOf = HrmsApplication.class,
        importOptions = ImportOption.DoNotIncludeTests.class
)
public class TenantTimeArchitectureTest {

    /**
     * Rule 1 — No production code may call the zero-arg {@code LocalDate.now()} or
     * {@code LocalDateTime.now()}.
     *
     * <p>Exemptions:
     * <ul>
     *   <li>{@code TenantTimeService} itself — it's the single resolver and falls back to
     *       the JVM default when a tenant is missing.</li>
     *   <li>Anything under {@code ..config..} — Spring config beans occasionally stamp
     *       startup timestamps that don't drive business logic.</li>
     *   <li>JPA lifecycle callbacks annotated {@code @PrePersist} / {@code @PreUpdate} — these
     *       set audit columns; the row's wall-clock day is not a tenant-time concern.</li>
     * </ul>
     */
    @ArchTest
    public static final ArchRule production_code_should_not_call_unzoned_now =
            noClasses()
                    .that()
                    .resideInAPackage("com.nulogic..")
                    .and()
                    .resideOutsideOfPackage("..config..")
                    .and()
                    .doNotHaveFullyQualifiedName("com.nulogic.common.util.TenantTimeService")
                    .should(callUnzonedNow())
                    .because(
                            "LocalDate.now() / LocalDateTime.now() silently consume the JVM "
                                    + "default zone. Production code must route through "
                                    + "TenantTimeService so each tenant's IANA zone is honoured. "
                                    + "See common/util/TenantTimeService.java and the Wave-10 "
                                    + "audit P0-3 follow-up."
                    );

    /**
     * Rule 2 — No production code may hard-code a zone-id (e.g. {@code ZoneId.of("Asia/Kolkata")}).
     *
     * <p>The tenant's zone lives on the tenants row and is resolved by {@link
     * com.nulogic.common.util.TenantTimeService}. The service is allowed to carry a single
     * fallback constant; everything else must read the zone from the tenant.
     */
    @ArchTest
    public static final ArchRule production_code_should_not_hardcode_zone_ids =
            noClasses()
                    .that()
                    .resideInAPackage("com.nulogic..")
                    .and()
                    .resideOutsideOfPackage("..config..")
                    .and()
                    .doNotHaveFullyQualifiedName("com.nulogic.common.util.TenantTimeService")
                    .should(callZoneIdOfWithStringLiteral())
                    .because(
                            "Hard-coded zone IDs (e.g. ZoneId.of(\"Asia/Kolkata\")) shortcut the "
                                    + "tenant-time pipeline. Resolve the zone from TenantTimeService."
                    );

    // ---------- conditions ----------

    /**
     * Condition that fires when a class calls {@code LocalDate.now()} or
     * {@code LocalDateTime.now()} with zero arguments.
     *
     * <p>We match by owner type + method name + parameter count rather than the full signature
     * string so that ArchUnit's import model (which strips the {@code "()"} from
     * {@code rawParameterTypes}) does the right thing.
     */
    private static ArchCondition<JavaClass> callUnzonedNow() {
        return new ArchCondition<JavaClass>("call LocalDate.now() or LocalDateTime.now() with no arguments") {
            @Override
            public void check(JavaClass clazz, ConditionEvents events) {
                for (JavaMethodCall call : clazz.getMethodCallsFromSelf()) {
                    if (isUnzonedNowCall(call)) {
                        events.add(SimpleConditionEvent.violated(
                                call,
                                describe(clazz, call)
                        ));
                    }
                }
            }
        };
    }

    /**
     * Condition that fires when a class calls {@link ZoneId#of(String)} (or its overloads).
     *
     * <p>ArchUnit can't read the actual string literal passed at the call site without bytecode
     * decompilation, so the rule is structural: any reference to {@code ZoneId.of} from
     * production code (outside the allowed list) is suspicious by definition because the only
     * legitimate caller is {@code TenantTimeService}.
     */
    private static ArchCondition<JavaClass> callZoneIdOfWithStringLiteral() {
        return new ArchCondition<JavaClass>("call ZoneId.of(...) outside TenantTimeService") {
            @Override
            public void check(JavaClass clazz, ConditionEvents events) {
                for (JavaMethodCall call : clazz.getMethodCallsFromSelf()) {
                    if (isZoneIdOfCall(call)) {
                        events.add(SimpleConditionEvent.violated(
                                call,
                                describe(clazz, call)
                        ));
                    }
                }
            }
        };
    }

    // ---------- predicates ----------

    private static boolean isUnzonedNowCall(JavaMethodCall call) {
        if (!"now".equals(call.getTarget().getName())) {
            return false;
        }
        if (!call.getTarget().getRawParameterTypes().isEmpty()) {
            return false; // overloads taking ZoneId / Clock are fine
        }
        String owner = call.getTargetOwner().getFullName();
        return LocalDate.class.getName().equals(owner)
                || LocalDateTime.class.getName().equals(owner);
    }

    private static boolean isZoneIdOfCall(JavaMethodCall call) {
        if (!"of".equals(call.getTarget().getName())) {
            return false;
        }
        return ZoneId.class.getName().equals(call.getTargetOwner().getFullName());
    }

    private static String describe(JavaClass clazz, JavaAccess<?> access) {
        return String.format(
                "%s calls %s.%s in %s",
                clazz.getName(),
                access.getTargetOwner().getSimpleName(),
                access.getTarget().getName(),
                access.getSourceCodeLocation()
        );
    }

    /**
     * Reserved predicate hook for callers that want to combine these rules with their own
     * exemption list (kept here so consumers don't have to re-implement the owner check).
     */
    @SuppressWarnings("unused")
    private static DescribedPredicate<JavaClass> notTenantTimeService() {
        return new DescribedPredicate<JavaClass>("not TenantTimeService") {
            @Override
            public boolean test(JavaClass clazz) {
                return !"com.nulogic.common.util.TenantTimeService".equals(clazz.getFullName());
            }
        };
    }
}
