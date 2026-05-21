package com.nulogic.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

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
    private PreparedStatement countStatement;
    private ResultSet resultSet;

    @BeforeEach
    void setUp() throws Exception {
        dataSource = mock(DataSource.class);
        connection = mock(Connection.class);
        resetStatement = mock(PreparedStatement.class);
        countStatement = mock(PreparedStatement.class);
        resultSet = mock(ResultSet.class);

        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(contains("RESET"))).thenReturn(resetStatement);
        when(connection.prepareStatement(contains("COUNT(*)"))).thenReturn(countStatement);
        when(countStatement.executeQuery()).thenReturn(resultSet);
        when(resultSet.next()).thenReturn(true);
    }

    @Test
    @DisplayName("fails closed when rows are visible without tenant context")
    void failsClosedWhenRowsAreVisibleWithoutTenantContext() throws Exception {
        when(resultSet.getLong(1)).thenReturn(38L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true);

        assertThatThrownBy(() -> probe.run(null))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RLS bypass detected");
    }

    @Test
    @DisplayName("continues in fail-open dev mode when rows are visible")
    void continuesInFailOpenDevModeWhenRowsAreVisible() throws Exception {
        when(resultSet.getLong(1)).thenReturn(38L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, false);

        assertThatCode(() -> probe.run(null)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("passes when no rows are visible without tenant context")
    void passesWhenNoRowsAreVisibleWithoutTenantContext() throws Exception {
        when(resultSet.getLong(1)).thenReturn(0L);

        RlsStartupProbe probe = new RlsStartupProbe(dataSource, true);

        assertThatCode(() -> probe.run(null)).doesNotThrowAnyException();
    }
}
