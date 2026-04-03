package com.hrms.application.knowledge.service;

import com.hrms.application.document.service.FileStorageService;
import com.hrms.common.exception.BusinessException;
import com.hrms.domain.knowledge.KnowledgeAttachment;
import com.hrms.infrastructure.knowledge.repository.KnowledgeAttachmentRepository;
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

    /**
     * Upload an attachment for a Fluence content item.
     */
    @Transactional
    public KnowledgeAttachment uploadAttachment(UUID tenantId, UUID contentId,
                                                KnowledgeAttachment.ContentType contentType,
                                                MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("File size exceeds the 50MB limit");
        }

        FileStorageService.FileUploadResult result = fileStorageService.uploadFile(
                file, CATEGORY_FLUENCE, contentId);

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
