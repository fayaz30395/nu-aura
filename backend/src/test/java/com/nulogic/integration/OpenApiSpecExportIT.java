package com.nulogic.integration;

import com.nulogic.config.AbstractPostgresIntegrationTest;
import com.nulogic.config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exports the live SpringDoc OpenAPI document to {@code target/openapi-spec.json}.
 *
 * <p>This is the source of truth for the frontend Orval client. The frontend CI
 * job + Dockerfile generate {@code frontend/lib/generated/api} from the committed
 * snapshot ({@code frontend/openapi-snapshot.json}); regenerate that snapshot by
 * running this test and copying the output, whenever the public API surface
 * changes. Asserts the document is non-trivial so a broken /v3/api-docs fails CI
 * loudly instead of producing an empty client.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
// The test profile disables SpringDoc; re-enable it here so we can export the spec,
// and pin the path to the Orval default regardless of the base config.
@TestPropertySource(properties = {
        "springdoc.api-docs.enabled=true",
        "springdoc.api-docs.path=/v3/api-docs"
})
class OpenApiSpecExportIT extends AbstractPostgresIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void exportsOpenApiSpec() throws Exception {
        String spec = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(spec).contains("\"openapi\"").contains("\"paths\"");
        assertThat(spec.length()).isGreaterThan(10_000);

        Path out = Path.of("target", "openapi-spec.json");
        Files.createDirectories(out.getParent());
        Files.writeString(out, spec);
    }
}
