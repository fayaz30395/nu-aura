package com.nulogic.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A migration that writes to a FORCE ROW LEVEL SECURITY table without first setting
 * {@code app.current_tenant_id} is a <em>silent</em> no-op for any role that is not
 * BYPASSRLS: the RESTRICTIVE {@code rls_ctx_required_*} policy matches nothing, the
 * INSERT's WITH CHECK cannot pass, and Flyway still records {@code success = true}.
 *
 * <p>V334 shipped with exactly that defect. Production happened to be immune because
 * {@code FLYWAY_USER=postgres} is BYPASSRLS, but local, CI and any future
 * least-privilege migration role are not. V337 is the forward-only correction.</p>
 *
 * <p>Scope: {@link #FIRST_GUARDED_VERSION} onwards. Earlier migrations are already
 * applied in production and are immutable, so failing the build on them would be
 * unactionable — they are counted and reported, never asserted.</p>
 */
@DisplayName("Migrations must set the tenant GUC before writing to forced-RLS tables")
class MigrationRlsGuardTest {

    /** V337 is the first migration authored after the defect was understood. */
    private static final int FIRST_GUARDED_VERSION = 337;

    private static final Path MIGRATIONS = Path.of("src/main/resources/db/migration");

    private static final Pattern VERSION = Pattern.compile("^V(\\d+)__");
    /** Tables given the restrictive fail-closed overlay, e.g. rls_ctx_required_roles. */
    private static final Pattern RESTRICTIVE_POLICY =
            Pattern.compile("CREATE\\s+POLICY\\s+(?:\"|')?rls_ctx_required_(\\w+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern WRITE =
            Pattern.compile("\\b(?:INSERT\\s+INTO|UPDATE|DELETE\\s+FROM)\\s+(?:public\\.)?(\\w+)",
                    Pattern.CASE_INSENSITIVE);
    private static final Pattern TENANT_GUC =
            Pattern.compile("set_config\\s*\\(\\s*'app\\.current_tenant_id'", Pattern.CASE_INSENSITIVE);

    private static List<Path> migrations() throws IOException {
        try (Stream<Path> files = Files.list(MIGRATIONS)) {
            return files.filter(p -> p.getFileName().toString().endsWith(".sql")).sorted().toList();
        }
    }

    private static int versionOf(Path p) {
        Matcher m = VERSION.matcher(p.getFileName().toString());
        return m.find() ? Integer.parseInt(m.group(1)) : -1;
    }

    /** Every table anywhere in the chain that carries the restrictive tenant-context policy. */
    private static Set<String> rlsProtectedTables() throws IOException {
        Set<String> tables = new TreeSet<>();
        for (Path p : migrations()) {
            Matcher m = RESTRICTIVE_POLICY.matcher(Files.readString(p, StandardCharsets.UTF_8));
            while (m.find()) {
                tables.add(m.group(1).toLowerCase());
            }
        }
        return tables;
    }

    @Test
    @DisplayName("V337+ migrations that write to an RLS-forced table also set the tenant GUC")
    void guardedMigrationsSetTenantContext() throws IOException {
        Set<String> protectedTables = rlsProtectedTables();
        assertThat(protectedTables)
                .as("the scan must actually find the rls_ctx_required_* overlay; an empty set "
                        + "would make this test vacuous")
                .isNotEmpty();

        List<String> violations = new ArrayList<>();
        for (Path p : migrations()) {
            if (versionOf(p) < FIRST_GUARDED_VERSION) {
                continue;
            }
            String sql = Files.readString(p, StandardCharsets.UTF_8);
            if (TENANT_GUC.matcher(sql).find()) {
                continue;
            }
            Matcher w = WRITE.matcher(sql);
            Set<String> written = new TreeSet<>();
            while (w.find()) {
                String table = w.group(1).toLowerCase();
                if (protectedTables.contains(table)) {
                    written.add(table);
                }
            }
            if (!written.isEmpty()) {
                violations.add(p.getFileName() + " writes to " + written
                        + " without set_config('app.current_tenant_id', ...)");
            }
        }

        assertThat(violations)
                .as("a write to a FORCE RLS table without the tenant GUC is a silent no-op for a "
                        + "NOBYPASSRLS role, and Flyway still records success")
                .isEmpty();
    }

    @Test
    @DisplayName("V337 covers every tenant rather than hardcoding one")
    void v337IsTenantAgnostic() throws IOException {
        Path v337 = migrations().stream()
                .filter(p -> versionOf(p) == 337)
                .findFirst()
                .orElseThrow(() -> new AssertionError("V337 is missing"));
        String sql = Files.readString(v337, StandardCharsets.UTF_8);
        // Strip -- comments: the file explains WHY ON CONFLICT is wrong here, and the
        // explanation must not itself trip the assertion below.
        String code = sql.replaceAll("(?m)--.*$", "");

        assertThat(code)
                .as("V334's defect was a hardcoded tenant; the correction must iterate tenants")
                .contains("FROM tenants")
                .contains("set_config('app.current_tenant_id'");
        assertThat(code)
                .as("ON CONFLICT DO NOTHING cannot work here: role_permissions has no unique "
                        + "index on (role_id, permission_id), which is how V325 created 136 duplicates")
                .doesNotContain("ON CONFLICT");
        assertThat(code)
                .as("idempotency must come from NOT EXISTS")
                .contains("NOT EXISTS");
    }

    @Test
    @DisplayName("V331 and V334 remain byte-identical to the versions applied in production")
    void appliedMigrationsAreImmutable() throws IOException {
        // Flyway stores a CRC32 of each applied file. Editing one after it has been applied
        // makes the next deploy fail validation — the V316 incident. These two were rewritten
        // in a shared working tree by a concurrent session on 2026-09-25; the checksums below
        // pin the versions that production actually ran (Flyway head 336).
        assertThat(sha256("V331__refresh_demo_password_expiry.sql"))
                .as("V331 is applied in production and must never be edited; "
                        + "corrections belong in a new V33x+ migration")
                .isEqualTo("b15710f205b4409c");
        assertThat(sha256("V334__restore_employee_lms_enroll_and_certificate_grants.sql"))
                .as("V334 is applied in production and must never be edited; V337 is its correction")
                .isEqualTo("265cf97f543fdb00");
    }

    private static String sha256(String fileName) throws IOException {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(Files.readAllBytes(MIGRATIONS.resolve(fileName)));
            StringBuilder hex = new StringBuilder();
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.substring(0, 16);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
