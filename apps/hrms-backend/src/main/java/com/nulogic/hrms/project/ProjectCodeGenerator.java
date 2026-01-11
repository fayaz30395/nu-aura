package com.nulogic.hrms.project;

import com.nulogic.hrms.config.HrmsProperties;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ProjectCodeGenerator {
    private static final int PAD_LENGTH = 4;
    private static final String DEFAULT_PREFIX = "NLG-PRJ-";

    private final NamedParameterJdbcTemplate jdbcTemplate;
    private final HrmsProperties properties;

    public ProjectCodeGenerator(NamedParameterJdbcTemplate jdbcTemplate, HrmsProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;
    }

    public String nextCode(UUID orgId) {
        String prefix = resolvePrefix();
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("orgId", orgId)
                .addValue("prefix", prefix);

        Map<String, Object> row = jdbcTemplate.queryForMap("""
                INSERT INTO project_code_sequences (org_id, prefix, next_value)
                VALUES (:orgId, :prefix, 1)
                ON CONFLICT (org_id)
                DO UPDATE SET next_value = project_code_sequences.next_value + 1,
                              prefix = EXCLUDED.prefix
                RETURNING prefix, next_value
                """, params);

        String rowPrefix = String.valueOf(row.get("prefix"));
        int nextValue = ((Number) row.get("next_value")).intValue();
        return formatCode(rowPrefix, nextValue);
    }

    static String formatCode(String prefix, int value) {
        String safePrefix = (prefix == null || prefix.isBlank()) ? DEFAULT_PREFIX : prefix;
        String padded = String.format("%0" + PAD_LENGTH + "d", value);
        return safePrefix + padded;
    }

    private String resolvePrefix() {
        String configured = properties.getProject().getCodePrefix();
        if (configured == null || configured.isBlank()) {
            return DEFAULT_PREFIX;
        }
        return configured;
    }
}
