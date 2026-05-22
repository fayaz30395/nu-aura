package com.nulogic.common.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.UUID;

/**
 * Syncs the PostgreSQL RLS tenant variable after TenantContext changes inside
 * an already-open transaction.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TenantRlsSessionSync {

    private static final String SET_TENANT_SQL = "SELECT set_config('app.current_tenant_id', ?, true)";

    private final JdbcTemplate jdbcTemplate;

    public void syncCurrentTenant(UUID tenantId) {
        if (tenantId == null || !TransactionSynchronizationManager.isActualTransactionActive()) {
            return;
        }

        try {
            jdbcTemplate.queryForObject(SET_TENANT_SQL, String.class, tenantId.toString());
        } catch (DataAccessException e) {
            log.warn("Failed to sync app.current_tenant_id={} on active transaction: {}",
                    tenantId, e.getMessage());
        }
    }
}
