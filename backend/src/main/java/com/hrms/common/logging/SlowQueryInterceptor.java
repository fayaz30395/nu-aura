package com.hrms.common.logging;

import com.hrms.common.security.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Hibernate statement interceptor for detecting and logging slow queries.
 *
 * <p>This interceptor is called before each SQL statement is executed,
 * allowing us to track query execution and log slow queries with context.</p>
 *
 * <p><strong>Metrics captured:</strong></p>
 * <ul>
 *   <li>Query text (truncated for security)</li>
 *   <li>Tenant context</li>
 *   <li>Execution time (logged after execution via aspect)</li>
 * </ul>
 *
 * <p>Note: This interceptor only inspects queries. Timing is done via AOP.</p>
 */
@Component
@Slf4j
public class SlowQueryInterceptor implements StatementInspector {

    private static final int MAX_QUERY_LENGTH = 500;

    @Override
    public String inspect(String sql) {
        // Add query to MDC for correlation in logs
        UUID tenantId = TenantContext.getCurrentTenant();
        if (tenantId != null) {
            MDC.put("queryTenant", tenantId.toString());
        }

        // Truncate and sanitize SQL for logging
        String sanitizedSql = sanitizeSql(sql);
        MDC.put("sql", sanitizedSql);

        // Log all queries at trace level for debugging
        if (log.isTraceEnabled()) {
            log.trace("SQL: {}", sanitizedSql);
        }

        // Return original SQL unchanged
        return sql;
    }

    /**
     * Sanitize SQL for logging - truncate and remove sensitive data.
     */
    private String sanitizeSql(String sql) {
        if (sql == null) {
            return "";
        }

        // Truncate long queries
        String result = sql.length() > MAX_QUERY_LENGTH
                ? sql.substring(0, MAX_QUERY_LENGTH) + "..."
                : sql;

        // Remove potential sensitive data patterns
        result = result.replaceAll("'[^']*password[^']*'", "'[REDACTED]'");
        result = result.replaceAll("'[^']*token[^']*'", "'[REDACTED]'");
        result = result.replaceAll("'[^']*secret[^']*'", "'[REDACTED]'");

        return result;
    }
}
