package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.FluenceAttachmentDto;
import com.hrms.application.knowledge.service.FluenceAttachmentService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.KnowledgeAttachment;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresFeature;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.featureflag.FeatureFlag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/fluence/attachments")
@RequiredArgsConstructor
@Tag(name = "Fluence Attachments", description = "File attachment management for Fluence content")
@RequiresFeature(FeatureFlag.ENABLE_FLUENCE)
public class FluenceAttachmentController {

    private final FluenceAttachmentService attachmentService;

    @GetMapping("/recent")
    @Operation(summary = "Get recent attachments for the current tenant")
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<FluenceAttachmentDto>> getRecentAttachments() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        List<KnowledgeAttachment> attachments = attachmentService.getRecentAttachments(tenantId);
        List<FluenceAttachmentDto> dtos = attachments.stream()
                .map(FluenceAttachmentDto::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping(value = "/{contentType}/{contentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a file attachment")
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_CREATE)
    public ResponseEntity<FluenceAttachmentDto> uploadAttachment(
            @PathVariable String contentType,
            @PathVariable UUID contentId,
            @RequestParam("file") MultipartFile file) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        KnowledgeAttachment.ContentType type = parseContentType(contentType);

        KnowledgeAttachment attachment = attachmentService.uploadAttachment(
                tenantId, contentId, type, file);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(FluenceAttachmentDto.fromEntity(attachment));
    }

    @GetMapping("/{contentType}/{contentId}")
    @Operation(summary = "List attachments for a content item")
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<FluenceAttachmentDto>> getAttachments(
            @PathVariable String contentType,
            @PathVariable UUID contentId) {

        UUID tenantId = TenantContext.requireCurrentTenant();
        KnowledgeAttachment.ContentType type = parseContentType(contentType);

        List<KnowledgeAttachment> attachments = attachmentService.getAttachments(
                tenantId, contentId, type);

        List<FluenceAttachmentDto> dtos = attachments.stream()
                .map(FluenceAttachmentDto::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Get a pre-signed download URL for an attachment")
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Map<String, String>> getDownloadUrl(@PathVariable UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        String downloadUrl = attachmentService.getDownloadUrl(tenantId, id);
        return ResponseEntity.ok(Map.of("downloadUrl", downloadUrl));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an attachment")
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_DELETE)
    public ResponseEntity<Void> deleteAttachment(@PathVariable UUID id) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        attachmentService.deleteAttachment(tenantId, id);
        return ResponseEntity.noContent().build();
    }

    private KnowledgeAttachment.ContentType parseContentType(String contentType) {
        return switch (contentType.toUpperCase()) {
            case "WIKI", "WIKI_PAGE" -> KnowledgeAttachment.ContentType.WIKI_PAGE;
            case "BLOG", "BLOG_POST" -> KnowledgeAttachment.ContentType.BLOG_POST;
            case "TEMPLATE" -> KnowledgeAttachment.ContentType.TEMPLATE;
            default -> throw new IllegalArgumentException("Invalid content type: " + contentType);
        };
    }
}
