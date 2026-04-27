package com.hrms.api.knowledge.controller;

import com.hrms.application.knowledge.service.FluenceAttachmentService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.KnowledgeAttachment;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FluenceAttachmentController.class)
@ContextConfiguration(classes = {FluenceAttachmentController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@ActiveProfiles("test")
@DisplayName("FluenceAttachmentController Unit Tests")
class FluenceAttachmentControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FluenceAttachmentService attachmentService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID tenantId;
    private UUID contentId;
    private UUID attachmentId;
    private KnowledgeAttachment mockAttachment;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        contentId = UUID.randomUUID();
        attachmentId = UUID.randomUUID();
        mockAttachment = mock(KnowledgeAttachment.class);
        when(mockAttachment.getId()).thenReturn(attachmentId);
        when(mockAttachment.getFileName()).thenReturn("document.pdf");
        when(mockAttachment.getFileSize()).thenReturn(1024L);
        when(mockAttachment.getMimeType()).thenReturn(MediaType.APPLICATION_PDF_VALUE);
        when(mockAttachment.getContentType()).thenReturn(KnowledgeAttachment.ContentType.WIKI_PAGE);
    }

    @Nested
    @DisplayName("Get Attachment Tests")
    class GetAttachmentTests {

        @Test
        @DisplayName("Should get recent attachments for tenant")
        void shouldGetRecentAttachments() throws Exception {
            when(attachmentService.getRecentAttachments(tenantId)).thenReturn(List.of(mockAttachment));

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/attachments/recent"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1));
            }

            verify(attachmentService).getRecentAttachments(tenantId);
        }

        @Test
        @DisplayName("Should get attachments for wiki page content")
        void shouldGetWikiPageAttachments() throws Exception {
            when(attachmentService.getAttachments(tenantId, contentId, KnowledgeAttachment.ContentType.WIKI_PAGE))
                    .thenReturn(List.of(mockAttachment));

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/attachments/{contentType}/{contentId}", "WIKI", contentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.length()").value(1));
            }

            verify(attachmentService).getAttachments(tenantId, contentId, KnowledgeAttachment.ContentType.WIKI_PAGE);
        }

        @Test
        @DisplayName("Should get download URL for attachment")
        void shouldGetDownloadUrl() throws Exception {
            when(attachmentService.getDownloadUrl(tenantId, attachmentId))
                    .thenReturn("https://storage.example.com/attachment.pdf?token=xyz");

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/attachments/{id}/download", attachmentId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.downloadUrl").exists());
            }

            verify(attachmentService).getDownloadUrl(tenantId, attachmentId);
        }
    }

    @Nested
    @DisplayName("Upload Attachment Tests")
    class UploadAttachmentTests {

        @Test
        @DisplayName("Should upload attachment for wiki page")
        void shouldUploadWikiPageAttachment() throws Exception {
            when(attachmentService.uploadAttachment(
                    eq(tenantId), eq(contentId), eq(KnowledgeAttachment.ContentType.WIKI_PAGE), any()))
                    .thenReturn(mockAttachment);

            MockMultipartFile file = new MockMultipartFile(
                    "file", "document.pdf", MediaType.APPLICATION_PDF_VALUE,
                    "PDF content".getBytes()
            );

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(multipart("/api/v1/fluence/attachments/{contentType}/{contentId}",
                                "WIKI", contentId)
                                .file(file))
                        .andExpect(status().isCreated());
            }

            verify(attachmentService).uploadAttachment(
                    eq(tenantId), eq(contentId), eq(KnowledgeAttachment.ContentType.WIKI_PAGE), any());
        }
    }

    @Nested
    @DisplayName("Delete Attachment Tests")
    class DeleteAttachmentTests {

        @Test
        @DisplayName("Should delete attachment")
        void shouldDeleteAttachment() throws Exception {
            doNothing().when(attachmentService).deleteAttachment(tenantId, attachmentId);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(delete("/api/v1/fluence/attachments/{id}", attachmentId))
                        .andExpect(status().isNoContent());
            }

            verify(attachmentService).deleteAttachment(tenantId, attachmentId);
        }
    }
}
