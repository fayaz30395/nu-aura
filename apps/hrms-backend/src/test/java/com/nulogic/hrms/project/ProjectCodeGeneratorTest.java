package com.nulogic.hrms.project;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.nulogic.hrms.config.HrmsProperties;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;

@ExtendWith(MockitoExtension.class)
class ProjectCodeGeneratorTest {

    @Mock
    private NamedParameterJdbcTemplate jdbcTemplate;

    @Test
    void nextCodeUsesConfiguredPrefixAndPadding() {
        HrmsProperties properties = new HrmsProperties();
        properties.getProject().setCodePrefix("NLG-PRJ-");

        Map<String, Object> row = new HashMap<>();
        row.put("prefix", "NLG-PRJ-");
        row.put("next_value", 12);

        when(jdbcTemplate.queryForMap(anyString(), any(SqlParameterSource.class))).thenReturn(row);

        ProjectCodeGenerator generator = new ProjectCodeGenerator(jdbcTemplate, properties);
        String code = generator.nextCode(UUID.randomUUID());

        assertEquals("NLG-PRJ-0012", code);

        ArgumentCaptor<SqlParameterSource> captor = ArgumentCaptor.forClass(SqlParameterSource.class);
        verify(jdbcTemplate).queryForMap(anyString(), captor.capture());
        assertInstanceOf(MapSqlParameterSource.class, captor.getValue());
        MapSqlParameterSource params = (MapSqlParameterSource) captor.getValue();
        assertEquals("NLG-PRJ-", params.getValue("prefix"));
    }

    @Test
    void nextCodeFallsBackToDefaultPrefixWhenBlank() {
        HrmsProperties properties = new HrmsProperties();
        properties.getProject().setCodePrefix(" ");

        Map<String, Object> row = new HashMap<>();
        row.put("prefix", "NLG-PRJ-");
        row.put("next_value", 1);

        when(jdbcTemplate.queryForMap(anyString(), any(SqlParameterSource.class))).thenReturn(row);

        ProjectCodeGenerator generator = new ProjectCodeGenerator(jdbcTemplate, properties);
        String code = generator.nextCode(UUID.randomUUID());

        assertEquals("NLG-PRJ-0001", code);
    }
}
