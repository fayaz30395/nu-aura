package com.nulogic.integration;

import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Guards the Arun -> Sumit manager_id correction across the whole Flyway chain
 * (US-2G9W1P18V8BT / V332).
 *
 * <p>V316 shipped to prod in a form that pointed at Sumit's USER id, so its EXISTS
 * guard never matched and the UPDATE affected 0 rows while still recording
 * success = true. `flyway repair` realigns the checksum but never re-runs a recorded
 * migration, so only a forward migration (V332) actually fixes the row. This test
 * asserts the post-chain end state rather than any single migration's text, so it
 * keeps holding whether the fix lands via V316 (fresh DB) or V332 (prod-shaped DB),
 * and fails loudly if a later migration ever regresses the manager.
 *
 * <p>Idempotency is asserted directly: re-executing V332's UPDATE against an
 * already-correct row must affect 0 rows.
 */
@SpringBootTest
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
@Transactional
@DisplayName("V332 Arun->Sumit manager correction — real Postgres, full Flyway chain")
class ArunManagerMigrationTest extends AbstractPostgresIntegrationTest {

    private static final UUID TENANT_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");
    private static final UUID ARUN_EMPLOYEE_ID = UUID.fromString("48000000-e001-0000-0000-000000000009");
    private static final UUID SUMIT_EMPLOYEE_ID = UUID.fromString("48000000-e001-0000-0000-000000000001");

    @Autowired
    JdbcTemplate jdbcTemplate;

    /** RLS policies are fail-closed; reads and writes on employees need the tenant GUC. */
    private void setTenantGuc() {
        jdbcTemplate.execute("SELECT set_config('app.current_tenant_id', '" + TENANT_ID + "', true)");
    }

    @Test
    @DisplayName("V332 is present in the migration chain and recorded successfully")
    void v332IsAppliedSuccessfully() {
        Boolean success = jdbcTemplate.queryForObject(
                "SELECT success FROM flyway_schema_history WHERE version = '332'", Boolean.class);

        assertThat(success)
                .as("V332 must be applied by the chain, not skipped")
                .isTrue();
    }

    @Test
    @DisplayName("After the full chain, Arun's manager is Sumit's EMPLOYEE id (not his user id)")
    void arunManagerIsSumitEmployeeId() {
        setTenantGuc();

        UUID managerId = jdbcTemplate.queryForObject(
                "SELECT manager_id FROM employees WHERE id = ? AND tenant_id = ?",
                UUID.class, ARUN_EMPLOYEE_ID, TENANT_ID);

        assertThat(managerId).isEqualTo(SUMIT_EMPLOYEE_ID);
    }

    @Test
    @DisplayName("Re-running V332's UPDATE on a corrected row is a no-op (0 rows)")
    void v332IsIdempotent() {
        setTenantGuc();

        int affected = jdbcTemplate.update("""
                UPDATE employees
                   SET manager_id = ?, updated_at = NOW()
                 WHERE id = ?
                   AND tenant_id = ?
                   AND manager_id IS DISTINCT FROM ?
                   AND EXISTS (SELECT 1 FROM employees m WHERE m.id = ? AND m.tenant_id = ?)
                """,
                SUMIT_EMPLOYEE_ID, ARUN_EMPLOYEE_ID, TENANT_ID,
                SUMIT_EMPLOYEE_ID, SUMIT_EMPLOYEE_ID, TENANT_ID);

        assertThat(affected).isZero();
    }
}
