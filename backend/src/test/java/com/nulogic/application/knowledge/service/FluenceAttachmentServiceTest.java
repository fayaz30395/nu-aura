package com.nulogic.application.knowledge.service;

import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.domain.knowledge.KnowledgeAttachment;
import com.nulogic.infrastructure.knowledge.repository.KnowledgeAttachmentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FluenceAttachmentService orphaned-file cleanup")
class FluenceAttachmentServiceTest {

    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private KnowledgeAttachmentRepository attachmentRepository;
    @Mock
    private AttachmentTextExtractionService textExtractionService;

    private FluenceAttachmentService service;

    @BeforeEach
    void setUp() {
        service = new FluenceAttachmentService(fileStorageService, attachmentRepository, textExtractionService);
    }

    @Test
    @DisplayName("deletes the uploaded storage object when the DB insert fails")
    void deletesOrphanedFileWhenDbInsertFails() {
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes());
        FileStorageService.FileUploadResult uploadResult = FileStorageService.FileUploadResult.builder()
                .objectName("tenant/fluence-attachments/content/notes.txt")
                .originalFilename("notes.txt")
                .contentType("text/plain")
                .size(5L)
                .build();

        when(fileStorageService.uploadFile(any(), any(), any())).thenReturn(uploadResult);
        when(attachmentRepository.save(any(KnowledgeAttachment.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key"));

        UUID contentId = UUID.randomUUID();

        assertThatThrownBy(() -> service.uploadAttachment(
                UUID.randomUUID(), contentId, KnowledgeAttachment.ContentType.WIKI_PAGE, file))
                .isInstanceOf(DataIntegrityViolationException.class);

        verify(fileStorageService).deleteFile(uploadResult.getObjectName());
    }
}
