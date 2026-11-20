package com.nulogic.integration.isolation;

import com.nulogic.common.config.TenantRlsTransactionManager;
import com.nulogic.config.AbstractTenantIsolationIntegrationTest;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import com.nulogic.integration.isolation.TwoTenantFixture.Tenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.testcontainers.DockerClientFactory;

import javax.sql.DataSource;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Proves the suite runs against the production shape and cannot silently degrade: if any
 * prerequisite is missing these tests FAIL (they never skip), so a green run means RLS, the
 * NOBYPASSRLS role and the real filter chain were all actually in force.
 */
@DisplayName("Tenant isolation suite: environment guard (must fail, never skip)")
class TenantIsolationEnvironmentGuardTest extends AbstractTenantIsolationIntegrationTest {

    private static final Path SUITE_DIR = Path.of("src/test/java/com/nulogic/integration/isolation");
    private static final Pattern SKIP_MECHANISM = Pattern.compile(
            "@Disabled|@EnabledIf|@DisabledIf|@EnabledOn|@DisabledOn|Assumptions\\.|assumeTrue|assumeFalse|assumingThat");

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("Docker is available (the suite would otherwise fail in context startup, not skip)")
    void dockerIsAvailable() {
        assertThat(DockerClientFactory.instance().isDockerAvailable()).isTrue();
    }

    @Test
    @DisplayName("Application connections run as nu_app_rls: not superuser, NOBYPASSRLS")
    void applicationDataSourceIsTheRlsRole() {
        Map<String, Object> me = new JdbcTemplate(dataSource).queryForMap(
                "SELECT current_user AS u, r.rolsuper AS su, r.rolbypassrls AS bypass "
                        + "FROM pg_roles r WHERE r.rolname = current_user");
        assertThat(me.get("u")).isEqualTo(APP_ROLE);
        assertThat(me.get("su")).as("runtime role must not be superuser").isEqualTo(false);
        assertThat(me.get("bypass")).as("runtime role must not bypass RLS").isEqualTo(false);
    }

    @Test
    @DisplayName("RLS transaction manager and tenant-aware DataSource wrapper are the active beans")
    void rlsInfrastructureIsActive() {
        assertThat(transactionManager).isInstanceOf(TenantRlsTransactionManager.class);
        assertThat(dataSource.getClass().getName()).contains("TenantAwareDataSource");
    }

    @Test
    @DisplayName("Both synthetic tenants are seeded (ground truth via superuser)")
    void bothTenantsSeeded() {
        List<Map<String, Object>> rows = superuserJdbc().queryForList(
                "SELECT id, status FROM tenants WHERE id IN (?, ?)", Tenant.A.id(), Tenant.B.id());
        assertThat(rows).hasSize(2).allSatisfy(r -> assertThat(r.get("status")).isEqualTo("ACTIVE"));
    }

    @Test
    @DisplayName("Security filters are live: no token -> 401, valid tenant-A token -> 200")
    void realFilterChainIsActive() throws Exception {
        assertThat(status(perform(get("/api/v1/departments")))).isEqualTo(401);
        assertThat(status(perform(as(Actor.admin(Tenant.A), get("/api/v1/departments"))))).isEqualTo(200);
    }

    @Test
    @DisplayName("No test in the isolation suite uses a skip mechanism")
    void suiteHasNoSkipMechanism() throws IOException {
        try (Stream<Path> files = Files.list(SUITE_DIR)) {
            List<String> offenders = files
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> !p.getFileName().toString().equals(getClass().getSimpleName() + ".java"))
                    .filter(p -> {
                        try {
                            return SKIP_MECHANISM.matcher(Files.readString(p, StandardCharsets.UTF_8)).find();
                        } catch (IOException e) {
                            throw new IllegalStateException(e);
                        }
                    })
                    .map(p -> p.getFileName().toString())
                    .toList();
            assertThat(offenders).as("isolation tests must fail when prerequisites are missing, not skip").isEmpty();
        }
        String base = Files.readString(Path.of(
                "src/test/java/com/nulogic/config/AbstractTenantIsolationIntegrationTest.java"), StandardCharsets.UTF_8);
        assertThat(SKIP_MECHANISM.matcher(base).find()).as("base class must not skip").isFalse();
    }
}
