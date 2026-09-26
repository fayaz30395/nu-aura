package com.nulogic.common.security;

import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contract for {@link SecurityContext#hasPermissionAtLeast(String, RoleScope)}, the scope-aware
 * companion added so target-id guards stop early-returning on the mere presence of a permission
 * code.
 *
 * <p>The defect it exists to prevent: {@code V107__repopulate_role_permissions.sql:103} grants
 * {@code %:VIEW_ALL} codes to MANAGER/TEAM_LEAD at {@code scope='TEAM'}, so a code literally
 * named VIEW_ALL is routinely held at TEAM scope. A guard written as
 * {@code if (hasPermission(EMPLOYEE_VIEW_ALL)) return;} therefore grants a team-scoped role
 * tenant-wide reach. Every assertion below is about that gap.</p>
 *
 * <p>This suite also pins that {@link SecurityContext#hasPermission(String)} is UNCHANGED —
 * {@code PermissionAspect} and the DataScopeService branch selectors depend on its loose
 * behaviour, so a future "fix" that makes it scope-aware must fail here.</p>
 */
@DisplayName("SecurityContext.hasPermissionAtLeast (scope-aware authorization primitive)")
class HasPermissionAtLeastTest {

    private static final String PERM = "EMPLOYEE:VIEW_ALL";

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    private void loginHolding(String permission, RoleScope scope) {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(),
                Set.of("MANAGER"), Map.of(permission, scope));
    }

    // ── the ordering itself ────────────────────────────────────────────────────────

    /**
     * Full ordering matrix. ALL > LOCATION > DEPARTMENT > TEAM > SELF > CUSTOM, per
     * {@link RoleScope#getRank()} — CUSTOM sits below SELF deliberately, because it is an
     * explicit allow-list rather than a containing set.
     */
    @ParameterizedTest(name = "held {0} satisfies required {1} -> {2}")
    @CsvSource({
            // held,      required,    expected
            "ALL,          ALL,         true",
            "ALL,          TEAM,        true",
            "ALL,          SELF,        true",
            "LOCATION,     ALL,         false",
            "LOCATION,     DEPARTMENT,  true",
            "DEPARTMENT,   ALL,         false",
            "DEPARTMENT,   TEAM,        true",
            "TEAM,         ALL,         false",
            "TEAM,         DEPARTMENT,  false",
            "TEAM,         TEAM,        true",
            "TEAM,         SELF,        true",
            "SELF,         ALL,         false",
            "SELF,         TEAM,        false",
            "SELF,         SELF,        true",
            "CUSTOM,       SELF,        false",
            "CUSTOM,       ALL,         false",
            "CUSTOM,       CUSTOM,      true",
    })
    void scopeOrderingIsEnforced(String held, String required, boolean expected) {
        loginHolding(PERM, RoleScope.valueOf(held));

        assertThat(SecurityContext.hasPermissionAtLeast(PERM, RoleScope.valueOf(required)))
                .isEqualTo(expected);
    }

    // ── the actual exploit this closes ────────────────────────────────────────────

    @Nested
    @DisplayName("the V107 TEAM-scoped VIEW_ALL gap")
    class TeamScopedViewAllGap {

        @Test
        @DisplayName("a TEAM-scoped EMPLOYEE:VIEW_ALL holder does NOT satisfy a required ALL scope")
        void teamScopedViewAllDoesNotSatisfyAll() {
            // Exactly what V107:103 seeds for MANAGER / TEAM_LEAD.
            loginHolding(PERM, RoleScope.TEAM);

            assertThat(SecurityContext.hasPermission(PERM))
                    .as("the code IS present — this is why the old guards let them through")
                    .isTrue();
            assertThat(SecurityContext.hasPermissionAtLeast(PERM, RoleScope.ALL))
                    .as("but it is held at TEAM, so it must not authorize a tenant-wide target")
                    .isFalse();
        }

        @Test
        @DisplayName("a SELF-scoped write permission never satisfies a tenant-wide requirement")
        void selfScopedWritePermissionNeverSatisfiesAll() {
            // EMPLOYEE:UPDATE is granted to the baseline EMPLOYEE role at SELF (V107:46).
            loginHolding("EMPLOYEE:UPDATE", RoleScope.SELF);

            assertThat(SecurityContext.hasPermission("EMPLOYEE:UPDATE")).isTrue();
            assertThat(SecurityContext.hasPermissionAtLeast("EMPLOYEE:UPDATE", RoleScope.ALL))
                    .as("a baseline employee must not clear an elevated guard by holding a "
                            + "self-scoped write permission")
                    .isFalse();
        }

        @Test
        @DisplayName("an ALL-scoped holder (HR) still satisfies the requirement")
        void allScopedHolderStillPasses() {
            loginHolding(PERM, RoleScope.ALL);

            assertThat(SecurityContext.hasPermissionAtLeast(PERM, RoleScope.ALL)).isTrue();
        }
    }

    // ── denial / edge cases ───────────────────────────────────────────────────────

    @Test
    @DisplayName("not holding the permission at all is a denial, not a pass")
    void missingPermissionIsDenied() {
        loginHolding("SOMETHING:ELSE", RoleScope.ALL);

        assertThat(SecurityContext.hasPermissionAtLeast(PERM, RoleScope.ALL)).isFalse();
        assertThat(SecurityContext.hasPermissionAtLeast(PERM, RoleScope.SELF)).isFalse();
    }

    @Test
    @DisplayName("no security context at all is a denial")
    void noContextIsDenied() {
        SecurityContext.clear();

        assertThat(SecurityContext.hasPermissionAtLeast(PERM, RoleScope.SELF)).isFalse();
    }

    @Test
    @DisplayName("null arguments are denials, never passes")
    void nullArgumentsAreDenied() {
        loginHolding(PERM, RoleScope.ALL);

        assertThat(SecurityContext.hasPermissionAtLeast(null, RoleScope.ALL)).isFalse();
        assertThat(SecurityContext.hasPermissionAtLeast(PERM, null)).isFalse();
    }

    @Test
    @DisplayName("the app-prefixed form resolves, matching getPermissionScope")
    void appPrefixedPermissionResolves() {
        SecurityContext.setCurrentUser(UUID.randomUUID(), UUID.randomUUID(), Set.of("MANAGER"),
                Map.of("HRMS:EMPLOYEE:VIEW_ALL", RoleScope.ALL));
        SecurityContext.setCurrentApp("HRMS");

        assertThat(SecurityContext.hasPermissionAtLeast("EMPLOYEE:VIEW_ALL", RoleScope.ALL))
                .as("an unprefixed code must resolve against the app-prefixed grant")
                .isTrue();
    }

    // ── the primitive it must NOT change ─────────────────────────────────────────

    @Test
    @DisplayName("hasPermission stays scope-blind — PermissionAspect and the scope selectors need it")
    void hasPermissionRemainsScopeBlind() {
        loginHolding(PERM, RoleScope.SELF);

        assertThat(SecurityContext.hasPermission(PERM))
                .as("hasPermission must keep answering possession only. PermissionAspect gates "
                        + "endpoint admission on it and lets DataScopeService narrow rows; making "
                        + "it scope-aware would 403 a manager at the door on endpoints they "
                        + "legitimately reach for their team.")
                .isTrue();
    }
}
