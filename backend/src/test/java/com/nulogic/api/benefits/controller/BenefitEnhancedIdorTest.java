package com.nulogic.api.benefits.controller;

import com.nulogic.api.benefits.dto.ClaimResponse;
import com.nulogic.application.benefits.service.BenefitEnhancedService;
import com.nulogic.application.benefits.service.BenefitStatementPdfService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.function.ThrowingConsumer;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * SEC-B1 regression (Option A): {@code enforceBenefitViewScope} must actually fire.
 *
 * <p>As shipped, the tenant-wide branch was {@code hasPermission(BENEFIT_VIEW)} — scope-blind —
 * while {@code V107__repopulate_role_permissions.sql:88} grants {@code BENEFIT:VIEW} to the
 * baseline EMPLOYEE role inside the {@code scope='SELF'} block. The guard therefore returned for
 * every authenticated employee and the self-check below it was dead code, leaking all eight
 * guarded endpoint families cross-employee.
 *
 * <p>Option A requires the SCOPE: {@code BENEFIT:VIEW} at {@link RoleScope#ALL}, or
 * {@code BENEFIT:MANAGE} at ALL for benefits administrators such as FINANCE_ADMIN (V286:81).
 * EMPLOYEE's existing {@code BENEFIT:VIEW@SELF} grant is deliberately left in place — the
 * re-seed to {@code BENEFIT:VIEW_SELF} is deferred to the separate security/RBAC release, so
 * these tests assert the guard's behaviour against the seed as it actually is today.</p>
 *
 * <p>Every test drives the real controller method, so the guard under test is the production one.
 * Each of the eight families is exercised for both the denial and the self-service path — the
 * point of the parameterisation is that no family is left behind, which is exactly how this class
 * of bug survived the first fix.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("SEC-B1: benefits cross-employee IDOR (Option A)")
class BenefitEnhancedIdorTest {

    @Mock private BenefitEnhancedService benefitService;
    @Mock private BenefitStatementPdfService benefitStatementPdfService;

    @InjectMocks private BenefitEnhancedController controller;

    private UUID ownerEmployeeId;
    private UUID otherEmployeeId;
    private UUID claimId;

    /** One invocation per guarded endpoint family, keyed by the employeeId it is asked about. */
    private record Family(String name, ThrowingConsumer<UUID> call) {}

    private Stream<Family> allEightFamilies() {
        return Stream.of(
                new Family("GET /enrollments/employee/{id}",
                        id -> controller.getEmployeeEnrollments(id)),
                new Family("GET /enrollments/employee/{id}/active",
                        id -> controller.getActiveEnrollments(id)),
                new Family("GET /claims/{claimId}",
                        id -> controller.getClaim(claimId)),
                new Family("GET /claims/employee/{id}",
                        id -> controller.getEmployeeClaims(id, PageRequest.of(0, 20))),
                new Family("GET /flex/allocations/employee/{id}/active",
                        id -> controller.getActiveFlexAllocation(id)),
                new Family("GET /flex/allocations/employee/{id}/history",
                        id -> controller.getFlexAllocationHistory(id)),
                new Family("GET /summary/employee/{id}",
                        id -> controller.getEmployeeBenefitsSummary(id)),
                new Family("GET /statement/employee/{id}",
                        id -> controller.getTotalBenefitsStatement(id)));
    }

    @BeforeEach
    void setUp() {
        ownerEmployeeId = UUID.randomUUID();
        otherEmployeeId = UUID.randomUUID();
        claimId = UUID.randomUUID();

        // The claim read derives its target from the claim itself, so it must resolve to the owner.
        ClaimResponse claim = ClaimResponse.builder()
                .id(claimId)
                .employeeId(ownerEmployeeId)
                .build();
        lenient().when(benefitService.getClaim(claimId)).thenReturn(claim);

        lenient().when(benefitService.getEmployeeEnrollments(any())).thenReturn(List.of());
        lenient().when(benefitService.getActiveEnrollmentsForEmployee(any())).thenReturn(List.of());
        lenient().when(benefitService.getEmployeeClaims(any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        lenient().when(benefitService.getActiveFlexAllocation(any())).thenReturn(null);
        lenient().when(benefitService.getFlexAllocationHistory(any())).thenReturn(List.of());
        lenient().when(benefitService.getEmployeeBenefitsSummary(any())).thenReturn(Map.of());
        lenient().when(benefitStatementPdfService.generateStatement(any()))
                .thenReturn(new byte[]{1, 2, 3});
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    /** Baseline EMPLOYEE exactly as V107:88 seeds them: BENEFIT:VIEW at SELF scope. */
    private void loginAsBaselineEmployee(UUID employeeId) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"),
                Map.of(Permission.BENEFIT_VIEW, RoleScope.SELF));
    }

    /** MANAGER / TEAM_LEAD: the SAME code, but V107:155/:97 grant it at TEAM via CASE. */
    private void loginAsTeamScopedManager() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("MANAGER"),
                Map.of(Permission.BENEFIT_VIEW, RoleScope.TEAM));
    }

    /** HR_MANAGER: BENEFIT:VIEW at ALL (V107:215). */
    private void loginAsHrManager() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("HR_MANAGER"),
                Map.of(Permission.BENEFIT_VIEW, RoleScope.ALL));
    }

    /** FINANCE_ADMIN: BENEFIT:MANAGE at ALL (V286:81), without BENEFIT:VIEW at ALL. */
    private void loginAsBenefitsAdministrator() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("FINANCE_ADMIN"),
                Map.of(Permission.BENEFIT_MANAGE, RoleScope.ALL));
    }

    // ── (1) EMPLOYEE cannot read another employee's benefits — all eight families ──

    @Test
    @DisplayName("(1) a baseline EMPLOYEE is denied on all eight endpoint families for another employee")
    void employeeDeniedOnEveryFamilyForAnotherEmployee() {
        loginAsBaselineEmployee(otherEmployeeId);

        allEightFamilies().forEach(family ->
                assertThatThrownBy(() -> family.call().accept(ownerEmployeeId))
                        .as("%s must deny a baseline EMPLOYEE reading another employee's data",
                                family.name())
                        .isInstanceOf(AccessDeniedException.class));
    }

    // ── (2) EMPLOYEE can still read their own benefits — all eight families ────────

    @Test
    @DisplayName("(2) a baseline EMPLOYEE can still read their OWN data on all eight families")
    void employeeCanStillReadOwnDataOnEveryFamily() {
        loginAsBaselineEmployee(ownerEmployeeId);

        allEightFamilies().forEach(family ->
                assertThatCode(() -> family.call().accept(ownerEmployeeId))
                        .as("%s must remain available for self-service", family.name())
                        .doesNotThrowAnyException());
    }

    // ── (3) TEAM-scoped MANAGER cannot read another employee's benefits ────────────

    @Test
    @DisplayName("(3) a TEAM-scoped MANAGER is denied on all eight families — the code alone is not enough")
    void teamScopedManagerDeniedOnEveryFamily() {
        loginAsTeamScopedManager();

        allEightFamilies().forEach(family ->
                assertThatThrownBy(() -> family.call().accept(ownerEmployeeId))
                        .as("%s: V107 grants MANAGER BENEFIT:VIEW at TEAM, which must not reach "
                                + "an arbitrary employee", family.name())
                        .isInstanceOf(AccessDeniedException.class));
    }

    // ── (4)(5) administrative access retained ─────────────────────────────────────

    @Test
    @DisplayName("(4) HR_MANAGER with BENEFIT:VIEW at ALL reads any employee on all eight families")
    void hrManagerRetainsCrossEmployeeAccess() {
        loginAsHrManager();

        allEightFamilies().forEach(family ->
                assertThatCode(() -> family.call().accept(ownerEmployeeId))
                        .as("%s must remain available to an ALL-scoped administrator", family.name())
                        .doesNotThrowAnyException());
    }

    @Test
    @DisplayName("(5) a BENEFIT:MANAGE administrator keeps cross-employee access without BENEFIT:VIEW@ALL")
    void benefitsAdministratorRetainsAccess() {
        // FINANCE_ADMIN holds MANAGE but not VIEW at ALL; dropping the MANAGE branch would have
        // silently broken benefits administration for that role.
        loginAsBenefitsAdministrator();

        allEightFamilies().forEach(family ->
                assertThatCode(() -> family.call().accept(ownerEmployeeId))
                        .doesNotThrowAnyException());
    }

    @Nested
    @DisplayName("(5) existing admin bypasses are untouched")
    class AdminBypasses {

        @Test
        @DisplayName("SUPER_ADMIN still reads any employee")
        void superAdminRetainsAccess() {
            SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(),
                    Set.of("SUPER_ADMIN"), Map.of("SYSTEM:ADMIN", RoleScope.ALL));

            assertThatCode(() -> controller.getEmployeeEnrollments(ownerEmployeeId))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("TENANT_ADMIN still reads any employee")
        void tenantAdminRetainsAccess() {
            SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(),
                    Set.of("TENANT_ADMIN"), Map.of(Permission.BENEFIT_VIEW, RoleScope.ALL));

            assertThatCode(() -> controller.getEmployeeEnrollments(ownerEmployeeId))
                    .doesNotThrowAnyException();
        }
    }

    // ── the exact defect shape ─────────────────────────────────────────────────────

    @Test
    @DisplayName("holding BENEFIT:VIEW at SELF no longer satisfies the tenant-wide branch")
    void selfScopedBenefitViewNoLongerShortCircuits() {
        loginAsBaselineEmployee(otherEmployeeId);

        assertThat(SecurityContext.hasPermission(Permission.BENEFIT_VIEW))
                .as("the code IS present — this is why the old guard returned at line 53")
                .isTrue();
        assertThat(SecurityContext.hasPermissionAtLeast(Permission.BENEFIT_VIEW, RoleScope.ALL))
                .as("but it is held at SELF, so it must not authorize a cross-employee read")
                .isFalse();
        assertThatThrownBy(() -> controller.getTotalBenefitsStatement(ownerEmployeeId))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("the claim read is gated on the CLAIM's owner, not on a caller-supplied id")
    void claimReadUsesTheClaimsOwnEmployeeId() {
        loginAsBaselineEmployee(otherEmployeeId);

        assertThatThrownBy(() -> controller.getClaim(claimId))
                .as("the claim belongs to ownerEmployeeId; the caller is someone else")
                .isInstanceOf(AccessDeniedException.class);
    }
}
