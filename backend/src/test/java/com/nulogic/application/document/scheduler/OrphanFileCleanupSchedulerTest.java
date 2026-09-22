package com.nulogic.application.document.scheduler;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.nulogic.application.document.service.StorageProvider;
import com.nulogic.application.document.service.StorageProvider.StoredObjectInfo;
import com.nulogic.common.security.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * D-ORPHAN (Phase 4): generated_documents/document_versions/file_metadata all have RLS
 * enabled, keyed on {@code app.current_tenant_id}. This scheduler has no request context,
 * so it must set {@link TenantContext} explicitly per tenant before querying, and scope
 * storage objects by their {@code {tenantId}/...} path prefix — never relying on ambient
 * request context, and never treating one tenant's known paths as covering another's.
 */
@ExtendWith(MockitoExtension.class)
class OrphanFileCleanupSchedulerTest {

    @Mock
    private StorageProvider storageProvider;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private OrphanFileCleanupScheduler scheduler;
    private ListAppender<ILoggingEvent> logAppender;

    private final UUID tenantA = UUID.randomUUID();
    private final UUID tenantB = UUID.randomUUID();
    private final ZonedDateTime oldEnough = ZonedDateTime.now().minusHours(72);

    @BeforeEach
    void setUp() {
        scheduler = new OrphanFileCleanupScheduler(storageProvider, jdbcTemplate);

        logAppender = new ListAppender<>();
        logAppender.start();
        ((Logger) LoggerFactory.getLogger(OrphanFileCleanupScheduler.class)).addAppender(logAppender);
    }

    @AfterEach
    void tearDown() {
        ((Logger) LoggerFactory.getLogger(OrphanFileCleanupScheduler.class)).detachAppender(logAppender);
        TenantContext.clear();
    }

    private List<String> warnMessages() {
        return logAppender.list.stream()
                .filter(e -> e.getLevel() == ch.qos.logback.classic.Level.WARN)
                .map(ILoggingEvent::getFormattedMessage)
                .toList();
    }

    private void stubKnownPathsOnce(List<String> generated, List<String> versions, List<String> metadata) {
        when(jdbcTemplate.queryForList(
                eq("SELECT file_path FROM generated_documents WHERE file_path IS NOT NULL"), eq(String.class)))
                .thenReturn(generated);
        when(jdbcTemplate.queryForList(
                eq("SELECT file_path FROM document_versions WHERE file_path IS NOT NULL"), eq(String.class)))
                .thenReturn(versions);
        when(jdbcTemplate.queryForList(
                eq("SELECT storage_path FROM file_metadata WHERE storage_path IS NOT NULL"), eq(String.class)))
                .thenReturn(metadata);
    }

    @Test
    @DisplayName("D-ORPHAN: a legitimate tracked file is not flagged")
    void legitimateFileNotFlagged() {
        when(jdbcTemplate.queryForList(eq("SELECT id FROM tenants"), eq(UUID.class)))
                .thenReturn(List.of(tenantA));
        String path = tenantA + "/category/entity/file.pdf";
        stubKnownPathsOnce(List.of(path), List.of(), List.of());
        when(storageProvider.listObjects(null)).thenReturn(List.of(
                new StoredObjectInfo(path, oldEnough, false)));

        scheduler.detectOrphanFiles();

        assertThat(warnMessages()).noneMatch(msg -> msg.contains(path));
    }

    @Test
    @DisplayName("D-ORPHAN: a genuine orphan (untracked, old enough) is flagged")
    void genuineOrphanFlagged() {
        when(jdbcTemplate.queryForList(eq("SELECT id FROM tenants"), eq(UUID.class)))
                .thenReturn(List.of(tenantA));
        stubKnownPathsOnce(List.of(), List.of(), List.of());
        String orphanPath = tenantA + "/category/entity/untracked.pdf";
        when(storageProvider.listObjects(null)).thenReturn(List.of(
                new StoredObjectInfo(orphanPath, oldEnough, false)));

        scheduler.detectOrphanFiles();

        assertThat(warnMessages()).anyMatch(msg -> msg.contains(orphanPath));
    }

    @Test
    @DisplayName("D-ORPHAN: tenant B's known file never clears tenant A's identically-named object")
    void noCrossTenantMisattribution() {
        when(jdbcTemplate.queryForList(eq("SELECT id FROM tenants"), eq(UUID.class)))
                .thenReturn(List.of(tenantA, tenantB));

        String aPath = tenantA + "/category/entity/shared-name.pdf";
        String bPath = tenantB + "/category/entity/shared-name.pdf";

        // Tenant A is processed first (empty known set); tenant B second (has its own file).
        when(jdbcTemplate.queryForList(
                eq("SELECT file_path FROM generated_documents WHERE file_path IS NOT NULL"), eq(String.class)))
                .thenReturn(List.of())
                .thenReturn(List.of(bPath));
        when(jdbcTemplate.queryForList(
                eq("SELECT file_path FROM document_versions WHERE file_path IS NOT NULL"), eq(String.class)))
                .thenReturn(List.of());
        when(jdbcTemplate.queryForList(
                eq("SELECT storage_path FROM file_metadata WHERE storage_path IS NOT NULL"), eq(String.class)))
                .thenReturn(List.of());

        when(storageProvider.listObjects(null)).thenReturn(List.of(
                new StoredObjectInfo(aPath, oldEnough, false),
                new StoredObjectInfo(bPath, oldEnough, false)));

        scheduler.detectOrphanFiles();

        List<String> warnings = warnMessages();
        assertThat(warnings).anyMatch(msg -> msg.contains(aPath));
        assertThat(warnings).noneMatch(msg -> msg.contains(bPath));
    }

    @Test
    @DisplayName("D-ORPHAN: multi-tenant run queries known paths once per tenant and clears TenantContext after")
    void multiTenantContextQueriedPerTenantAndCleared() {
        when(jdbcTemplate.queryForList(eq("SELECT id FROM tenants"), eq(UUID.class)))
                .thenReturn(List.of(tenantA, tenantB));
        stubKnownPathsOnce(List.of(), List.of(), List.of());
        when(storageProvider.listObjects(null)).thenReturn(List.of());

        scheduler.detectOrphanFiles();

        assertThat(TenantContext.getCurrentTenant()).isNull();
        verify(jdbcTemplate, times(2)).queryForList(
                eq("SELECT file_path FROM generated_documents WHERE file_path IS NOT NULL"), eq(String.class));
    }
}
