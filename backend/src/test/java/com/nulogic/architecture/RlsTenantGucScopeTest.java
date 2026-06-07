package com.nulogic.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression guard for the cross-tenant RLS leak found in the 2026-06-07 completeness sweep.
 *
 * <p><strong>The bug.</strong> {@code EmployeeService}, {@code ExpenseClaimService}, and
 * {@code MileageService} each open a raw JDBC {@code ConnectionCallback} to allocate a
 * monthly sequence number, and set the RLS GUC with
 * {@code set_config('app.current_tenant_id', ?, false)}. The third argument {@code false}
 * makes the setting <em>session-scoped</em>: it is NOT reset when the transaction ends, so the
 * tenant id persists on the HikariCP/pgbouncer connection after the request returns. A later
 * request that reuses that pooled connection before establishing its own tenant context can read
 * another tenant's rows — defeating RLS. The correct path,
 * {@code TenantRlsTransactionManager}, uses {@code set_config(..., true)} (transaction-local,
 * auto-reset on commit/rollback).
 *
 * <p>The 2026-06-04 security audit asserted RLS was uniformly {@code SET LOCAL}; these three
 * services were missed. This test scans production source so the session-scoped form can never be
 * reintroduced for the tenant GUC. It deliberately reads source text (not bytecode) because the
 * offending value lives in a compile-time-inlined {@code String} constant that ArchUnit cannot see.
 */
@DisplayName("RLS tenant GUC must always be transaction-local (set_config ... , true)")
public class RlsTenantGucScopeTest {

    /** Matches a session-scoped set of the tenant GUC: set_config('app.current_tenant_id', ?, false). */
    private static final Pattern SESSION_SCOPED_TENANT_GUC = Pattern.compile(
            "set_config\\s*\\(\\s*'app\\.current_tenant_id'\\s*,[^)]*,\\s*false\\s*\\)",
            Pattern.CASE_INSENSITIVE);

    /**
     * The one legitimate session-scoped use. {@code TenantAwareDataSource} sets the GUC
     * session-scoped on purpose — it covers JDBC connections obtained OUTSIDE a JPA transaction
     * (where transaction-local would not persist across statements) — and it is leak-safe because
     * it RESETs the GUC on every {@code getConnection()} checkout before re-setting it. Any OTHER
     * session-scoped set is a leak (set-and-forget on a pooled connection).
     */
    private static final List<String> ALLOWED = List.of("TenantAwareDataSourceConfig.java");

    @Test
    @DisplayName("no production Java source sets app.current_tenant_id session-scoped (third arg false)")
    void noSessionScopedTenantGuc() {
        Path sourceRoot = Path.of("src", "main", "java");
        assertThat(Files.isDirectory(sourceRoot))
                .as("expected to run from the backend module root with %s present", sourceRoot.toAbsolutePath())
                .isTrue();

        List<String> offenders;
        try (Stream<Path> javaFiles = Files.walk(sourceRoot)) {
            offenders = javaFiles
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> !ALLOWED.contains(p.getFileName().toString()))
                    .filter(RlsTenantGucScopeTest::containsSessionScopedTenantGuc)
                    .map(p -> sourceRoot.relativize(p).toString())
                    .sorted()
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to scan production source for RLS GUC scope", e);
        }

        assertThat(offenders)
                .as("Found session-scoped set_config('app.current_tenant_id', ?, false) — this leaks the "
                        + "tenant id onto the pooled connection (cross-tenant RLS leak). Use the "
                        + "transaction-local form set_config('app.current_tenant_id', ?, true), matching "
                        + "TenantRlsTransactionManager. Offending files: %s", offenders)
                .isEmpty();
    }

    private static boolean containsSessionScopedTenantGuc(Path file) {
        try {
            return SESSION_SCOPED_TENANT_GUC.matcher(Files.readString(file)).find();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read " + file, e);
        }
    }
}
