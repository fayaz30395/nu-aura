package com.nulogic.application.payroll.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class PayrollPeriodLockTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private PayrollPeriodLock payrollPeriodLock;

    @Test
    void lockPeriod_issuesAdvisoryLockKeyedOnTenantYearMonth() {
        UUID tenantId = UUID.fromString("11111111-2222-3333-4444-555555555555");

        payrollPeriodLock.lockPeriod(tenantId, 2026, 5);

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(sqlCaptor.capture(), eq(Object.class), keyCaptor.capture());

        assertThat(sqlCaptor.getValue()).contains("pg_advisory_xact_lock", "hashtextextended");
        // Key composition is part of the contract — same (tenant, year, month) ⇒ same key.
        assertThat(keyCaptor.getValue()).isEqualTo(tenantId + "|2026|5");
    }

    @Test
    void lockPeriod_keysDifferentlyAcrossPeriods() {
        UUID tenantId = UUID.randomUUID();

        payrollPeriodLock.lockPeriod(tenantId, 2026, 4);
        payrollPeriodLock.lockPeriod(tenantId, 2026, 5);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate, org.mockito.Mockito.times(2))
                .queryForObject(anyString(), eq(Object.class), keyCaptor.capture());

        assertThat(keyCaptor.getAllValues())
                .containsExactly(tenantId + "|2026|4", tenantId + "|2026|5");
    }

    @Test
    void lockPeriod_rejectsNullArguments() {
        UUID tenantId = UUID.randomUUID();

        assertThatThrownBy(() -> payrollPeriodLock.lockPeriod(null, 2026, 5))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> payrollPeriodLock.lockPeriod(tenantId, null, 5))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> payrollPeriodLock.lockPeriod(tenantId, 2026, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
