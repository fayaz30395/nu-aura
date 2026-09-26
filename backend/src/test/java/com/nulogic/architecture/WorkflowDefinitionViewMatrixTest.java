package com.nulogic.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the approved WORKFLOW:DEFINITION_VIEW role matrix across the migration chain.
 *
 * <p>Why a test and not a code review: V338 shipped the permission and granted it to six
 * roles, but the approved matrix names seven — DEPARTMENT_MANAGER was omitted. Nothing
 * failed, because a missing grant is invisible until someone in that role opens the
 * Workflow Builder. V339 is the forward-only correction. This test makes the matrix an
 * asserted contract so the next omission fails the build instead of shipping.</p>
 *
 * <p>Approved matrix (writes stay MANAGE-only, asserted by
 * {@code WorkflowDefinitionAuthorizationTest}):</p>
 * <pre>
 *   SUPER_ADMIN         DEFINITION_VIEW + MANAGE
 *   TENANT_ADMIN        DEFINITION_VIEW + MANAGE
 *   HR_ADMIN            DEFINITION_VIEW + MANAGE
 *   HR_MANAGER          DEFINITION_VIEW
 *   MANAGER             DEFINITION_VIEW
 *   DEPARTMENT_MANAGER  DEFINITION_VIEW   &lt;- added by V339
 *   RECRUITMENT_ADMIN   DEFINITION_VIEW
 *   TEAM_LEAD           none
 *   EMPLOYEE            none              &lt;- the point of the fix
 * </pre>
 *
 * <p>This reads the migration SQL rather than a live database, so it runs without Docker
 * and guards the chain as authored. The runtime behaviour is covered separately by
 * {@code WorkflowDefinitionAuthorizationTest} against real Postgres.</p>
 */
@DisplayName("WORKFLOW:DEFINITION_VIEW grants must match the approved role matrix")
class WorkflowDefinitionViewMatrixTest {

    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");

    /** Roles the approved matrix grants DEFINITION_VIEW to, read-only or alongside MANAGE. */
    private static final Set<String> APPROVED_VIEW_ROLES = new TreeSet<>(Set.of(
            "SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN",
            "HR_MANAGER", "MANAGER", "DEPARTMENT_MANAGER", "RECRUITMENT_ADMIN"));

    /** Roles that must never receive it. EMPLOYEE is the vulnerability this release closes. */
    private static final Set<String> EXCLUDED_ROLES = Set.of("TEAM_LEAD", "EMPLOYEE");

    /** A role code inside a JOIN (VALUES ('X'), ('Y')) grant list. */
    private static final Pattern ROLE_LITERAL = Pattern.compile("\\('([A-Z_]+)'\\)");

    /**
     * Every migration whose body mentions WORKFLOW:DEFINITION_VIEW, i.e. the ones that can
     * grant it. Discovered rather than hardcoded, so a later V34x grant is picked up too.
     */
    private static List<Path> definitionViewMigrations() throws IOException {
        try (Stream<Path> files = Files.list(MIGRATIONS)) {
            return files
                    .filter(p -> p.getFileName().toString().endsWith(".sql"))
                    .filter(p -> {
                        try {
                            return Files.readString(p, StandardCharsets.UTF_8)
                                    .contains("WORKFLOW:DEFINITION_VIEW");
                        } catch (IOException e) {
                            throw new IllegalStateException("unreadable migration: " + p, e);
                        }
                    })
                    .sorted()
                    .toList();
        }
    }

    /** Role codes appearing in a grant VALUES list in any DEFINITION_VIEW migration. */
    private static Set<String> grantedRoles() throws IOException {
        Set<String> roles = new TreeSet<>();
        for (Path p : definitionViewMigrations()) {
            String sql = Files.readString(p, StandardCharsets.UTF_8);
            // Only scan the grant statements, not the explanatory header, so a role named
            // in a comment (e.g. "TEAM_LEAD deliberately excluded") is not counted as granted.
            int firstInsert = sql.indexOf("INSERT INTO role_permissions");
            if (firstInsert < 0) {
                continue;
            }
            Matcher m = ROLE_LITERAL.matcher(sql.substring(firstInsert));
            while (m.find()) {
                roles.add(m.group(1));
            }
        }
        return roles;
    }

    @Test
    @DisplayName("the migration chain grants DEFINITION_VIEW to exactly the approved roles")
    void grantsMatchTheApprovedMatrix() throws IOException {
        assertThat(definitionViewMigrations())
                .as("the scan must find the migrations that introduce and grant the permission; "
                        + "an empty list would make every assertion below vacuous")
                .isNotEmpty();

        assertThat(grantedRoles())
                .as("DEFINITION_VIEW grants across the migration chain must equal the approved "
                        + "matrix exactly — a missing role silently denies it the Workflow "
                        + "Builder, an extra role silently reopens the exposure")
                .isEqualTo(APPROVED_VIEW_ROLES);
    }

    @Test
    @DisplayName("TEAM_LEAD and EMPLOYEE are never granted DEFINITION_VIEW")
    void excludedRolesAreNeverGranted() throws IOException {
        assertThat(grantedRoles())
                .as("EMPLOYEE holding DEFINITION_VIEW is the exact exposure this release closes: "
                        + "approval-routing configuration (approvers, SLA hours, escalation "
                        + "targets) is not inbox data")
                .doesNotContainAnyElementsOf(EXCLUDED_ROLES);
    }

    @Test
    @DisplayName("DEPARTMENT_MANAGER is granted — the omission V339 corrects")
    void departmentManagerIsGranted() throws IOException {
        assertThat(grantedRoles())
                .as("V338 granted six roles; the approved matrix names seven. DEPARTMENT_MANAGER "
                        + "is a distinct seeded role (RoleHierarchy:18,48,76), not a synonym for "
                        + "MANAGER, and V339 adds it forward-only.")
                .contains("DEPARTMENT_MANAGER");
    }

    @Test
    @DisplayName("V338 is not edited in place — DEPARTMENT_MANAGER arrives via a later migration")
    void v338IsNotRewritten() throws IOException {
        Path v338 = MIGRATIONS.resolve("V338__add_workflow_definition_view_permission.sql");
        assertThat(v338).exists();

        String sql = Files.readString(v338, StandardCharsets.UTF_8);
        int firstInsert = sql.indexOf("INSERT INTO role_permissions");
        assertThat(sql.substring(firstInsert))
                .as("V338 may already be applied in a preproduction environment, so correcting "
                        + "it in place would change an applied checksum. The fix must be forward-only.")
                .doesNotContain("('DEPARTMENT_MANAGER')");
    }
}
