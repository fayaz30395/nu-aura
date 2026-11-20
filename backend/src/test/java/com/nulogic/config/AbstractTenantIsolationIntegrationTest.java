package com.nulogic.config;

import com.nulogic.common.config.CookieConfig;
import com.nulogic.common.security.JwtTokenProvider;
import com.nulogic.integration.isolation.TwoTenantFixture;
import com.nulogic.integration.isolation.TwoTenantFixture.Actor;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Base class for the two-tenant isolation suite. Unlike {@link AbstractPostgresIntegrationTest}
 * (superuser datasource, RLS bypassed, security filters off) this runs the production shape:
 *
 * <ul>
 *   <li>its OWN Postgres 16 container, where {@code nu_app_rls} (NOBYPASSRLS) is created by an
 *       init script BEFORE Flyway, so V179's runtime grants are applied;</li>
 *   <li>Flyway migrates as the superuser, the application DataSource connects as
 *       {@code nu_app_rls}, so every RLS policy is actually enforced;</li>
 *   <li>{@code TenantRlsTransactionManager} and {@code TenantAwareDataSource} enabled;</li>
 *   <li>the real security filter chain (TenantFilter, JwtAuthenticationFilter, CSRF) with tokens
 *       minted by the real {@link JwtTokenProvider} and sent as the {@code access_token} cookie.</li>
 * </ul>
 *
 * <p>Docker is a hard requirement: there is deliberately no conditional-enable annotation or JUnit
 * assumption, and a missing daemon fails the context with an explicit message instead of skipping.</p>
 *
 * <p>Only deviation from prod wiring: rate limiting is off ({@code app.rate-limit.enabled=false});
 * it is orthogonal to isolation and the export bucket (5 per 5 min) would make the suite flaky.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractTenantIsolationIntegrationTest {

    public static final String APP_ROLE = "nu_app_rls";
    protected static final String CSRF_VALUE = "iso-csrf-token";
    private static final String APP_ROLE_PASSWORD = "iso-app-role-test-only";
    private static final String TEST_ENCRYPTION_KEY = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    @SuppressWarnings("resource") // singleton; lifecycle owned by the forked test JVM
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                    .withDatabaseName("nuaura_isolation")
                    .withUsername("iso_superuser")
                    .withPassword("iso_superuser")
                    .withInitScript("db/tenant-isolation/init-app-role.sql");

    static {
        System.setProperty("ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
        System.setProperty("APP_SECURITY_ENCRYPTION_KEY", TEST_ENCRYPTION_KEY);
    }

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected JwtTokenProvider tokenProvider;

    @DynamicPropertySource
    static void isolationProperties(DynamicPropertyRegistry registry) {
        PostgreSQLContainer<?> pg = postgres();
        registry.add("spring.datasource.url", pg::getJdbcUrl);
        registry.add("spring.datasource.username", () -> APP_ROLE);
        registry.add("spring.datasource.password", () -> APP_ROLE_PASSWORD);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.datasource.replica.url", () -> "");
        registry.add("spring.flyway.url", pg::getJdbcUrl);
        registry.add("spring.flyway.user", pg::getUsername);
        registry.add("spring.flyway.password", pg::getPassword);
        registry.add("app.rls.transaction-manager.enabled", () -> "true");
        registry.add("app.rls.datasource-wrapper.enabled", () -> "true");
        registry.add("app.security.allow-bearer-header", () -> "false");
        registry.add("app.rate-limit.enabled", () -> "false");
    }

    /** Starts the container or fails loudly. Never skips. */
    protected static synchronized PostgreSQLContainer<?> postgres() {
        if (!POSTGRES.isRunning()) {
            if (!DockerClientFactory.instance().isDockerAvailable()) {
                throw new IllegalStateException("Tenant isolation suite requires a Docker daemon (Testcontainers). "
                        + "It must FAIL, never skip: start Docker/colima and export DOCKER_HOST and "
                        + "TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE as documented in the handover.");
            }
            POSTGRES.start();
        }
        return POSTGRES;
    }

    /** Superuser (RLS-bypassing) access: seeding, ground-truth reads and negative controls only. */
    protected static JdbcTemplate superuserJdbc() {
        PostgreSQLContainer<?> pg = postgres();
        return new JdbcTemplate(new DriverManagerDataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword()));
    }

    /** A raw connection as the runtime role, outside Spring: no GUC is set for you. */
    protected static Connection appRoleConnection() throws SQLException {
        return DriverManager.getConnection(postgres().getJdbcUrl(), APP_ROLE, APP_ROLE_PASSWORD);
    }

    @BeforeEach
    void seedTenants() {
        TwoTenantFixture.seedOnce(superuserJdbc());
    }

    protected String token(Actor actor) {
        return TwoTenantFixture.token(tokenProvider, actor);
    }

    /** Authenticates the request exactly like the browser: access_token cookie + CSRF double-submit. */
    protected MockHttpServletRequestBuilder as(Actor actor, MockHttpServletRequestBuilder request) {
        return withToken(token(actor), request);
    }

    protected MockHttpServletRequestBuilder withToken(String jwt, MockHttpServletRequestBuilder request) {
        return request
                .cookie(new Cookie(CookieConfig.ACCESS_TOKEN_COOKIE, jwt), new Cookie(CookieConfig.CSRF_TOKEN_COOKIE, CSRF_VALUE))
                .header("X-XSRF-TOKEN", CSRF_VALUE);
    }

    protected MvcResult perform(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request).andReturn();
    }

    protected static String body(MvcResult result) throws Exception {
        return result.getResponse().getContentAsString();
    }

    protected static int status(MvcResult result) {
        return result.getResponse().getStatus();
    }
}
