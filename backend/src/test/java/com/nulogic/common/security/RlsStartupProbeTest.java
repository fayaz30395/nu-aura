package com.nulogic.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("RlsStartupProbe")
class RlsStartupProbeTest {

    private DataSource dataSource;
    private Connection connection;
    private PreparedStatement resetStatement;
    private PreparedStatement roleStatement;
    private PreparedStatement tableStatement;
    private PreparedStatement viewStatement;
    private PreparedStatement countStatement;
    private ResultSet roleResultSet;
    private ResultSet tableResultSet;
    private ResultSet viewResultSet;
    private ResultSet resultSet;

    @BeforeEach
    void setUp() throws Exception {
        dataSource = mock(DataSource.class);
        connection = mock(Connection.class);
        resetStatement = mock(PreparedStatement.class);
        roleStatement = mock(PreparedStatement.class);
        tableStatement = mock(PreparedStatement.class);
        viewStatement = mock(PreparedStatement.class);
        countStatement = mock(PreparedStatement.class);
        roleResultSet = mock(ResultSet.class);
        tableResultSet = mock(ResultSet.class);
        viewResultSet = mock(ResultSet.class);
        resultSet = mock(ResultSet.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(contains("RESET"))).thenReturn(resetStatement);
        when(connection.prepareStatement(contains("pg_roles"))).thenReturn(roleStatement);
        when(connection.prepareStatement(contains("c.relkind IN ('r', 'p')"))).thenReturn(tableStatement);
        when(connection.prepareStatement(contains("c.relkind = 'v'"))).thenReturn(viewStatement);
        when(connection.prepareStatement(contains("COUNT(*)"))).thenReturn(countStatement);
        when(roleStatement.executeQuery()).thenReturn(roleResultSet);
        when(tableStatement.executeQuery()).thenReturn(tableResultSet);
        when(viewStatement.executeQuery()).thenReturn(viewResultSet);
        when(countStatement.executeQuery()).thenReturn(resultSet);
        when(roleResultSet.next()).thenReturn(true);
        when(roleResultSet.getString(1)).thenReturn("nu_app_rls");
        when(roleResultSet.getBoolean(2)).thenReturn(false);
        when(roleResultSet.getBoolean(3)).thenReturn(false);
        when(tableResultSet.next()).thenReturn(true, false);
        when(tableResultSet.getString(1)).thenReturn("public");
        when(tableResultSet.getString(2)).thenReturn("employees");
        when(tableResultSet.getBoolean(3)).thenReturn(true);
        when(tableResultSet.getBoolean(4)).thenReturn(true);
        when(tableResultSet.getBoolean(5)).thenReturn(false);
        when(tableResultSet.getBoolean(6)).thenReturn(true);
        when(viewResultSet.next()).thenReturn(false);
        when(resultSet.next()).thenReturn(true);
    }

    @AfterEach
    void clearSkipProperty() {
        System.clearProperty("rls.probe.skip");
    }

    @Test
    @DisplayName("fails closed when rows are visible without tenant context")
    void failsClosedWhenRowsAreVisibleWithoutTenantContext() throws Exception {
        when(resultSet.getLong(1)).thenReturn(38L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RLS bypass detected");
    }

    @Test
    @DisplayName("continues in fail-open dev mode when rows are visible")
    void continuesInFailOpenDevModeWhenRowsAreVisible() throws Exception {
        when(resultSet.getLong(1)).thenReturn(38L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, false, false);

        assertThatCode(() -> probe.run(null)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("passes when no rows are visible without tenant context")
    void passesWhenNoRowsAreVisibleWithoutTenantContext() throws Exception {
        when(resultSet.getLong(1)).thenReturn(0L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatCode(() -> probe.run(null)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("fails closed when runtime role has BYPASSRLS")
    void failsClosedWhenRuntimeRoleHasBypassRls() throws Exception {
        when(roleResultSet.getBoolean(3)).thenReturn(true);
        when(resultSet.getLong(1)).thenReturn(0L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("database user 'nu_app_rls'")
                .hasMessageContaining("BYPASSRLS");
    }

    @Test
    @DisplayName("fails closed when runtime role owns probe table without FORCE RLS")
    void failsClosedWhenRuntimeRoleOwnsTableWithoutForceRls() throws Exception {
        when(tableResultSet.getBoolean(4)).thenReturn(false);
        when(tableResultSet.getBoolean(5)).thenReturn(true);
        when(resultSet.getLong(1)).thenReturn(0L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("owns this table")
                .hasMessageContaining("public.employees")
                .hasMessageContaining("FORCE ROW LEVEL SECURITY");
    }

    @Test
    @DisplayName("fails closed when a tenant table is missing context-required policy")
    void failsClosedWhenTenantTableMissingContextRequiredPolicy() throws Exception {
        when(tableResultSet.getBoolean(6)).thenReturn(false);
        when(resultSet.getLong(1)).thenReturn(0L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("strict-policy gaps")
                .hasMessageContaining("public.employees")
                .hasMessageContaining("app.current_tenant_id");
    }

    @Test
    @DisplayName("fails closed when a tenant view is not security invoker")
    void failsClosedWhenTenantViewIsNotSecurityInvoker() throws Exception {
        when(viewResultSet.next()).thenReturn(true, false);
        when(viewResultSet.getString(1)).thenReturn("public");
        when(viewResultSet.getString(2)).thenReturn("project_employees");
        when(viewResultSet.getBoolean(3)).thenReturn(false);
        when(resultSet.getLong(1)).thenReturn(0L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tenant views")
                .hasMessageContaining("public.project_employees")
                .hasMessageContaining("SECURITY INVOKER");
    }

    @Test
    @DisplayName("fails closed when a tenant view exposes rows without tenant context")
    void failsClosedWhenTenantViewExposesRowsWithoutTenantContext() throws Exception {
        when(viewResultSet.next()).thenReturn(true, false);
        when(viewResultSet.getString(1)).thenReturn("public");
        when(viewResultSet.getString(2)).thenReturn("project_employees");
        when(viewResultSet.getBoolean(3)).thenReturn(true);
        when(resultSet.getLong(1)).thenReturn(0L, 14L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RLS bypass detected")
                .hasMessageContaining("public.project_employees");
    }

    @Test
    @DisplayName("fails closed when SQL error prevents tenant isolation verification")
    void failsClosedWhenSqlErrorPreventsTenantIsolationVerification() throws Exception {
        when(countStatement.executeQuery()).thenThrow(new SQLException("permission denied", "42501"));

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("tenant isolation could be verified")
                .hasMessageContaining("SQLState=42501");
    }

    @Test
    @DisplayName("allows first boot when probe table does not exist yet")
    void allowsFirstBootWhenProbeTableDoesNotExistYet() throws Exception {
        when(tableResultSet.next()).thenReturn(false);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, false, true);

        assertThatCode(() -> probe.run(null)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("fails closed when no tenant tables are found and bootstrap skips are disabled")
    void failsClosedWhenNoTenantTablesFoundAndBootstrapSkipsDisabled() throws Exception {
        when(tableResultSet.next()).thenReturn(false);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("found no public UUID tenant_id tables");
    }

    @Test
    @DisplayName("fails closed when skip is requested and bootstrap skips are disabled")
    void failsClosedWhenSkipRequestedAndBootstrapSkipsDisabled() {
        System.setProperty("rls.probe.skip", "true");

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("skip requested")
                .hasMessageContaining("bootstrap skips are disabled");
    }

    @Test
    @DisplayName("fails closed when skip is requested with fail-open but bootstrap skips disabled")
    void failsClosedWhenSkipRequestedFailOpenButBootstrapSkipsDisabled() {
        System.setProperty("rls.probe.skip", "true");

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, false, false);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("skip requested")
                .hasMessageContaining("bootstrap skips are disabled");
    }

    @Test
    @DisplayName("allows skip when bootstrap skips are enabled")
    void allowsSkipWhenBootstrapSkipsEnabled() {
        System.setProperty("rls.probe.skip", "true");

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, false, true);

        assertThatCode(() -> probe.run(null)).doesNotThrowAnyException();
    }
}
