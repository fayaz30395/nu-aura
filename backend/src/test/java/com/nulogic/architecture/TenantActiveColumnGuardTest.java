package com.nulogic.architecture;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regression guard: the {@code tenants} table has no {@code is_active} column (status is
 * {@code tenants.status}; "active" = {@code TenantRepository.findActiveTenantIds()}). Six scheduled jobs
 * queried {@code SELECT id FROM tenants WHERE is_active = true}, swallowed the SQL error or failed every
 * run, and processed zero tenants. This scans production source text (SQL lives in string literals that
 * only fail at runtime) so the column can never be referenced against {@code tenants} again.
 */
@DisplayName("No production SQL reads tenants.is_active (column does not exist)")
class TenantActiveColumnGuardTest {

    /** Joins Java string concatenations ({@code "..." + "..."}) so a multi-line query reads as one literal. */
    private static final Pattern CONCAT = Pattern.compile("\"\\s*\\+\\s*\"");

    /**
     * FROM/JOIN/UPDATE tenants [alias] ... [qualifier.]is_active, within one statement/literal. Flagged
     * when is_active is unqualified or qualified by the tenants alias; another table's column is fine.
     */
    private static final Pattern TENANTS_IS_ACTIVE = Pattern.compile(
            "\\b(?:from|join|update)\\s+(?:public\\.)?tenants\\b(?:\\s+(?:as\\s+)?(\\w+))?[^;\"]*?\\b(?:(\\w+)\\.)?is_active\\b",
            Pattern.CASE_INSENSITIVE);

    @Test
    @DisplayName("matcher flags the original bug shapes and ignores other tables' is_active")
    void matcherSelfCheck() {
        assertThat(offends("jdbcTemplate.queryForList(\"SELECT id FROM tenants WHERE is_active = true\", UUID.class)")).isTrue();
        assertThat(offends("\"SELECT t.id FROM tenants t \" +\n  \"WHERE t.is_active = true\"")).isTrue();
        assertThat(offends("\"UPDATE tenants SET is_active = false WHERE id = ?\"")).isTrue();
        assertThat(offends("\"SELECT u.id FROM tenants t JOIN users u ON u.tenant_id = t.id WHERE u.is_active = true\""))
                .isFalse();
        assertThat(offends("\"SELECT id FROM tenants WHERE status = 'ACTIVE'\"")).isFalse();
    }

    @Test
    @DisplayName("src/main (Java + non-migration resources) never reads is_active from tenants")
    void noTenantsIsActiveInProductionSource() throws IOException {
        List<String> offenders;
        int scanned;
        try (Stream<Path> files = Stream.concat(Files.walk(Path.of("src", "main", "java")),
                Files.walk(Path.of("src", "main", "resources")))) {
            List<Path> sources = files.filter(Files::isRegularFile)
                    .filter(p -> p.toString().matches(".*\\.(java|sql|xml|yml|yaml|properties)$"))
                    // Applied migrations are immutable history and validated by Flyway against the real schema.
                    .filter(p -> !p.toString().contains("db" + java.io.File.separator + "migration"))
                    .toList();
            scanned = sources.size();
            offenders = sources.stream().filter(p -> offends(read(p))).map(Path::toString).sorted().toList();
        }
        assertThat(scanned).as("scan must see the production sources").isGreaterThan(1000);
        assertThat(offenders).as("tenants has no is_active column; use TenantRepository.findActiveTenantIds()").isEmpty();
    }

    private static boolean offends(String source) {
        Matcher m = TENANTS_IS_ACTIVE.matcher(CONCAT.matcher(source).replaceAll(""));
        while (m.find()) {
            String alias = m.group(1);
            String qualifier = m.group(2);
            if (qualifier == null || qualifier.equalsIgnoreCase("tenants") || qualifier.equalsIgnoreCase(alias)) {
                return true;
            }
        }
        return false;
    }

    private static String read(Path p) {
        try {
            return Files.readString(p);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
