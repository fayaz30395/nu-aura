package com.nulogic.config;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Base class for integration tests. A single Postgres 16 container is started
 * once per JVM and shared across every test class that extends this — Flyway
 * runs against the real schema, per-test isolation comes from @Transactional.
 *
 * Matches prod image (postgres:16-alpine) so H2-vs-Postgres divergence stops
 * being a class of bugs we discover after deploy.
 */
public abstract class AbstractPostgresIntegrationTest {

    private static final String TEST_ENCRYPTED_STRING_CONVERTER_KEY =
            "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    private static final DockerImageName POSTGRES_IMAGE =
            DockerImageName.parse("postgres:16-alpine");

    @SuppressWarnings("resource") // singleton container; lifecycle owned by the forked test JVM
    protected static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(POSTGRES_IMAGE)
            .withDatabaseName("nuaura_test")
            .withUsername("test")
            .withPassword("test")
            .withReuse(true);

    static {
        System.setProperty("ENCRYPTION_KEY", TEST_ENCRYPTED_STRING_CONVERTER_KEY);
        System.setProperty("APP_SECURITY_ENCRYPTION_KEY", TEST_ENCRYPTED_STRING_CONVERTER_KEY);
    }

    @DynamicPropertySource
    static void registerDatasource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> postgres().getJdbcUrl());
        registry.add("spring.datasource.username", () -> postgres().getUsername());
        registry.add("spring.datasource.password", () -> postgres().getPassword());
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.datasource.replica.url", () -> "");
        registry.add("spring.flyway.url", () -> postgres().getJdbcUrl());
        registry.add("spring.flyway.user", () -> postgres().getUsername());
        registry.add("spring.flyway.password", () -> postgres().getPassword());
    }

    private static synchronized PostgreSQLContainer<?> postgres() {
        if (!POSTGRES.isRunning()) {
            POSTGRES.start();
        }
        return POSTGRES;
    }
}
