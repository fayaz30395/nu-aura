package com.nulogic.common.config;

import com.nulogic.application.document.service.StorageProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Storage provider selection: the {@code app.storage.provider=none} escape hatch must let the
 * backend boot without Google credentials (even under prod), while the default {@code google-drive}
 * must still hard-fail in production when credentials are absent.
 */
@DisplayName("GoogleDriveConfig storage provider selection")
class GoogleDriveConfigTest {

    private GoogleDriveConfig configWith(String[] activeProfiles, String provider, String credPath) {
        Environment env = mock(Environment.class);
        when(env.getActiveProfiles()).thenReturn(activeProfiles);
        GoogleDriveConfig config = new GoogleDriveConfig(env);
        ReflectionTestUtils.setField(config, "storageProvider", provider);
        ReflectionTestUtils.setField(config, "credentialsPath", credPath);
        ReflectionTestUtils.setField(config, "rootFolderId", "");
        ReflectionTestUtils.setField(config, "applicationName", "test");
        return config;
    }

    @Test
    @DisplayName("app.storage.provider=none boots with a no-op provider even under prod")
    void storageDisabledReturnsMockInProd() throws Exception {
        GoogleDriveConfig config = configWith(new String[]{"prod"}, "none", "/nonexistent/creds.json");

        StorageProvider provider = config.storageProvider(mock(JdbcTemplate.class));

        assertThat(provider).isNotNull();
        // no-op mock semantics: nothing exists, upload echoes the name without touching Drive
        assertThat(provider.exists("anything")).isFalse();
        assertThat(provider.upload("file.txt", InputStream.nullInputStream(), 0, "text/plain", Map.of()))
                .isEqualTo("file.txt");
    }

    @Test
    @DisplayName("blank provider value also disables storage")
    void blankProviderDisablesStorage() throws Exception {
        GoogleDriveConfig config = configWith(new String[]{"prod"}, "", "/nonexistent/creds.json");

        assertThat(config.storageProvider(mock(JdbcTemplate.class))).isNotNull();
    }

    @Test
    @DisplayName("default google-drive in prod without credentials still hard-fails (guard intact)")
    void googleDriveProdMissingCredentialsThrows() {
        GoogleDriveConfig config = configWith(new String[]{"prod"}, "google-drive", "/nonexistent/creds.json");

        assertThatThrownBy(() -> config.storageProvider(mock(JdbcTemplate.class)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Google Drive credentials are required in production");
    }
}
