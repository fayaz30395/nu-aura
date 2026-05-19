package com.nulogic.common.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Startup canary that verifies the strict tenant RLS policies installed by
 * {@code V177__strict_tenant_rls_policies.sql} are actually in force.
 *
 * <p>The probe acquires a fresh JDBC connection from the primary
 * {@link DataSource}, deliberately does <em>not</em> set
 * {@code app.current_tenant_id}, and runs
 * {@code SELECT COUNT(*) FROM employees}. With the strict policies in place
 * the {@code RESTRICTIVE} predicate evaluates to {@code NULL} and zero rows
 * are visible. If the count is non-zero a {@link IllegalStateException} is
 * thrown and the application fails fast — better a boot failure than a
 * silent cross-tenant data leak.</p>
 *
 * <p>The probe is skipped under the {@code test} profile (test fixtures
 * often run without RLS) and when the environment variable
 * {@code RLS_PROBE_SKIP=true} is set (escape hatch for local Flyway
 * bootstrap on a fresh database).</p>
 *
 * <p>Backlog reference: T1-01 in
 * {@code docs/architecture/improvement-backlog.md}.</p>
 */
@Component
@Profile("!test")
@Order(Integer.MIN_VALUE + 100)
@Slf4j
public class RlsStartupProbe implements ApplicationRunner {

    private static final String SKIP_ENV_VAR = "RLS_PROBE_SKIP";
    private static final String SKIP_SYS_PROP = "rls.probe.skip";
    private static final String PROBE_TABLE = "employees";

    private final DataSource dataSource;

    public RlsStartupProbe(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (isSkipRequested()) {
            log.warn("RLS startup probe skipped (RLS_PROBE_SKIP set). "
                    + "Strict-policy regressions will NOT be caught at boot.");
            return;
        }

        long visibleRows;
        try (Connection conn = dataSource.getConnection()) {
            // Make absolutely sure no inherited session var is in play.
            try (PreparedStatement reset = conn.prepareStatement(
                    "SELECT set_config('app.current_tenant_id', '', false)")) {
                reset.execute();
            }

            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT COUNT(*) FROM " + PROBE_TABLE);
                 ResultSet rs = ps.executeQuery()) {
                if (!rs.next()) {
                    throw new IllegalStateException(
                            "RLS startup probe failed: empty result from COUNT(*) on " + PROBE_TABLE);
                }
                visibleRows = rs.getLong(1);
            }
        } catch (SQLException ex) {
            // A SQL error here usually means the table does not exist yet
            // (truly empty DB on first boot). Treat as a warning, not a
            // hard failure, so initial provisioning can proceed.
            log.warn("RLS startup probe could not query {} ({}). "
                    + "Skipping canary — re-run after first migration completes.",
                    PROBE_TABLE, ex.getMessage());
            return;
        }

        if (visibleRows > 0) {
            String msg = String.format(
                    "RLS bypass detected — strict policy not active. "
                            + "Connection without app.current_tenant_id saw %d rows in %s. "
                            + "Verify V177__strict_tenant_rls_policies.sql ran and the app DB "
                            + "user does NOT have BYPASSRLS.",
                    visibleRows, PROBE_TABLE);
            log.error(msg);
            throw new IllegalStateException(msg);
        }

        log.info("RLS startup probe passed: 0 rows visible in {} without tenant context.", PROBE_TABLE);
    }

    private boolean isSkipRequested() {
        String env = System.getenv(SKIP_ENV_VAR);
        if (env != null && "true".equalsIgnoreCase(env.trim())) {
            return true;
        }
        String prop = System.getProperty(SKIP_SYS_PROP);
        return prop != null && "true".equalsIgnoreCase(prop.trim());
    }
}
