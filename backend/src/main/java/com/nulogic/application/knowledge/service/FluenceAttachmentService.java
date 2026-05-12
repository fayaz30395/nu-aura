package com.nulogic.application.knowledge.service;

import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.domain.knowledge.KnowledgeAttachment;
import com.nulogic.infrastructure.knowledge.repository.KnowledgeAttachmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Service for managing file attachments on Fluence content (wiki pages, blog posts, templates).
 * Uses MinIO via FileStorageService for object storage.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FluenceAttachmentService {

    private static final String CATEGORY_FLUENCE = "fluence-attachments";
    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50MB

    private final FileStorageService fileStorageService;
    private final KnowledgeAttachmentRepository attachmentRepository;
    private final AttachmentTextExtractionService textExtractionService;

    /**
     * Upload an attachment for a Fluence content item.
     *
     * <p>Performance (Q-P17): this method is intentionally NOT {@code @Transactional}.
     * The remote storage upload (multi-second HTTP round-trip) must not hold a DB
     * connection open. The repository {@code save()} call below already runs in its
     * own implicit transaction (Spring Data JPA's {@code SimpleJpaRepository.save}
     * is {@code @Transactional}), so persistence is scoped only to the row insert.</p>
     */
    public KnowledgeAttachment uploadAttachment(UUID tenantId, UUID contentId,
                                                KnowledgeAttachment.ContentType contentType,
                                                MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds the 50MB limit");
        }

        // Non-transactional: object-storage upload happens before any DB transaction starts.
        FileStorageService.FileUploadResult result = fileStorageService.uploadFile(
                file, CATEGORY_FLUENCE, contentId);

        // W5-B (knowledge-search audit gap): extract searchable text from PDF/DOCX/etc.
        // via Tika so the body is available for the follow-up ES indexing pass.
        // Best-effort: a failure here MUST NOT block the upload.
        String extractedText = null;
        try {
            extractedText = textExtractionService.extractText(file.getBytes(), file.getOriginalFilename());
        } catch (Exception e) {
            log.warn("Text extraction skipped for {}: {}", file.getOriginalFilename(), e.getMessage());
        }

        KnowledgeAttachment attachment = KnowledgeAttachment.builder()
                .tenantId(tenantId)
                .contentId(contentId)
                .contentType(contentType)
                .fileName(file.getOriginalFilename())
                .fileSize(file.getSize())
                .fileType(getFileExtension(file.getOriginalFilename()))
                .mimeType(file.getContentType())
                .storagePath(result.getObjectName())
                .objectName(result.getObjectName())
                .contentTypeEnum(contentType.name())
                .build();

        // TODO(W5-B follow-up): persist `extractedText` once KnowledgeAttachment grows
        // an `extractedText TEXT` column (Flyway migration to be added in next sprint).
        // For now we surface the extracted length so the call site is exercised end-to-end.
        if (extractedText != null) {
            log.debug("Extracted {} chars of text from attachment {} ({})",
                    extractedText.length(), file.getOriginalFilename(), contentType);
        }

        // save() runs in its own SimpleJpaRepository @Transactional scope — tx is tight
        // around the row insert only, not around the upload above.
        KnowledgeAttachment saved = attachmentRepository.save(attachment);
        log.info("Uploaded fluence attachment: {} for content {} (type={})",
                saved.getId(), contentId, contentType);
        return saved;
    }

    /**
     * List all attachments for a given content item.
     */
    @Transactional(readOnly = true)
    public List<KnowledgeAttachment> getAttachments(UUID tenantId, UUID contentId,
                                                    KnowledgeAttachment.ContentType contentType) {
        return attachmentRepository.findByTenantIdAndContentIdAndContentTypeAndIsDeletedFalse(
                tenantId, contentId, contentType);
    }

    /**
     * Get a pre-signed download URL for an attachment.
     */
    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID tenantId, UUID attachmentId) {
        KnowledgeAttachment attachment = attachmentRepository.findByTenantIdAndIdAndIsDeletedFalse(tenantId, attachmentId)
                .orElseThrow(() -> new BusinessException("Attachment not found"));
        return fileStorageService.getDownloadUrl(attachment.getStoragePath());
    }

    /**
     * Soft-delete an attachment from DB and delete from MinIO.
     */
    @Transactional
    public void deleteAttachment(UUID tenantId, UUID attachmentId) {
        KnowledgeAttachment attachment = attachmentRepository.findByTenantIdAndIdAndIsDeletedFalse(tenantId, attachmentId)
                .orElseThrow(() -> new BusinessException("Attachment not found"));

        fileStorageService.deleteFile(attachment.getStoragePath());
        attachment.softDelete();
        attachmentRepository.save(attachment);
        log.info("Soft-deleted fluence attachment: {}", attachmentId);
    }

    /**
     * Get all recent attachments for a tenant (for Drive page).
     */
    @Transactional(readOnly = true)
    public List<KnowledgeAttachment> getRecentAttachments(UUID tenantId) {
        return attachmentRepository.findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(tenantId);
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }
}
