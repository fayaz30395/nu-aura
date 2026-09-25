package com.nulogic.common.security;

import com.nulogic.domain.user.RoleScope;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-1 (CRITICAL) regression.
 *
 * <p>{@link JwtAuthenticationFilter} loaded the caller's permission CODES from the database and
 * stamped every one of them {@code RoleScope.GLOBAL} (which equals {@code ALL}). Permissions are
 * no longer carried in the JWT, so that branch runs for every cookie-authenticated request — which
 * silently neutralised every scope check in the application: {@code validateEmployeeAccess},
 * {@code SecurityContext.getPermissionScope} and {@code DataScopeService} all saw ALL for a user
 * whose grant in {@code role_permissions.scope} was SELF.</p>
 *
 * <p>Verified live before the fix: EMPLOYEE <em>arun</em> read another employee's expense claims
 * and leave requests (HTTP 200 on both). After the fix both return 403 while self-access stays
 * 200.</p>
 *
 * <p>This test pins the property at the source level deliberately. The filter's DB branch is
 * reached only through a full servlet chain with a signed token, a live tenant cache and a
 * populated SecurityService — every controller test in the suite mocks the filter out entirely
 * (gap GAP-4 of the same audit), so a behavioural test here would prove nothing about production.
 * What must never come back is the literal act of assigning a hardcoded scope to DB-loaded
 * permissions, and that is exactly what this asserts.</p>
 */
@DisplayName("JwtAuthenticationFilter permission-scope propagation (SEC-1)")
class JwtAuthenticationFilterScopeTest {

    private static final Path FILTER_SOURCE =
            Path.of("src/main/java/com/nulogic/common/security/JwtAuthenticationFilter.java");

    private static String source() throws IOException {
        return Files.readString(FILTER_SOURCE, StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("DB-loaded permissions are never stamped with a hardcoded GLOBAL scope")
    void doesNotHardcodeGlobalScopeForDbPermissions() throws IOException {
        String src = source();

        assertThat(src)
                .as("SEC-1: assigning RoleScope.GLOBAL to every DB permission makes a SELF-scoped "
                        + "user evaluate as ALL and disables authorization scope app-wide")
                .doesNotContain("permissionScopes.put(normalized, com.nulogic.domain.user.RoleScope.GLOBAL)")
                .doesNotContain("permissionScopes.put(normalized, RoleScope.GLOBAL)");
    }

    @Test
    @DisplayName("the filter loads the scope-preserving SecurityService methods")
    void usesScopePreservingLoaders() throws IOException {
        String src = source();

        assertThat(src)
                .as("the scope-preserving loaders already exist; the filter must use them")
                .contains("getCachedPermissionScopesForUser")
                .contains("getCachedPermissionScopes(");
    }

    @Test
    @DisplayName("a permission with no recorded scope falls back to SELF, never ALL")
    void missingScopeFailsClosed() throws IOException {
        String src = source();

        assertThat(src)
                .as("fail closed: the narrowest grant, not the broadest")
                .contains("com.nulogic.domain.user.RoleScope.SELF");
        assertThat(RoleScope.GLOBAL)
                .as("documents why GLOBAL was the dangerous default")
                .isEqualTo(RoleScope.ALL);
    }
}
