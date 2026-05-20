package com.nulogic.application.document.service;

import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.infrastructure.security.VirusScanService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FileStorageService Tests")
class FileStorageServiceTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID ENTITY_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440001");

    @Mock
    private StorageProvider storageProvider;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private VirusScanService virusScanService;

    @Mock
    private TenantTimeService tenantTimeService;

    private FileStorageService fileStorageService;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
        lenient().when(tenantTimeService.now(any())).thenReturn(LocalDateTime.parse("2026-05-20T12:00:00"));
        fileStorageService = new FileStorageService(storageProvider, jdbcTemplate, virusScanService, tenantTimeService);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("uploadFile sanitizes path traversal and control characters before persisting metadata")
    void uploadFileSanitizesOriginalFilenameEverywhere() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "C:\\temp\\..\u0000/../../payroll:Q4?.pdf",
                "application/pdf",
                "%PDF-1.7\nbody".getBytes());

        when(virusScanService.scan(any(), eq("C:\\temp\\..\u0000/../../payroll:Q4?.pdf")))
                .thenReturn(new VirusScanService.Clean());
        when(storageProvider.upload(any(), any(InputStream.class), anyLong(), eq("application/pdf"), any()))
                .thenReturn("drive-file-id");
        when(jdbcTemplate.update(any(String.class), eq(TENANT_ID), any(String.class), eq("drive-file-id")))
                .thenReturn(1);

        FileStorageService.FileUploadResult result =
                fileStorageService.uploadFile(file, FileStorageService.CATEGORY_DOCUMENTS, ENTITY_ID);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> metadataCaptor = ArgumentCaptor.forClass(Map.class);
        ArgumentCaptor<String> objectNameCaptor = ArgumentCaptor.forClass(String.class);
        verify(storageProvider).upload(
                objectNameCaptor.capture(),
                any(InputStream.class),
                eq(file.getSize()),
                eq("application/pdf"),
                metadataCaptor.capture());

        assertThat(result.getOriginalFilename()).isEqualTo("payroll_Q4_.pdf");
        assertThat(metadataCaptor.getValue()).containsEntry("original-filename", "payroll_Q4_.pdf");
        assertThat(objectNameCaptor.getValue())
                .startsWith(TENANT_ID + "/" + FileStorageService.CATEGORY_DOCUMENTS + "/" + ENTITY_ID + "/")
                .endsWith(".pdf")
                .doesNotContain("..", "\\", ":", "?");
    }
}
