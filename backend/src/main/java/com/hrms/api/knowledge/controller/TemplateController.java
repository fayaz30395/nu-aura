package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.CreateTemplateRequest;
import com.hrms.api.knowledge.dto.DocumentTemplateDto;
import com.hrms.application.knowledge.service.DocumentTemplateService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.knowledge.DocumentTemplate;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/knowledge/templates")
@RequiredArgsConstructor
@Tag(name = "Document Templates", description = "Document template management")
public class TemplateController {

    private final DocumentTemplateService documentTemplateService;

    @PostMapping
    @Operation(summary = "Create template")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_CREATE)
    public ResponseEntity<DocumentTemplateDto> createTemplate(@Valid @RequestBody CreateTemplateRequest request) {
        DocumentTemplate template = DocumentTemplate.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .description(request.getDescription())
                .category(request.getCategory())
                .content(request.getContent())
                .templateVariables(request.getTemplateVariables())
                .sampleData(request.getSampleData())
                .thumbnailUrl(request.getThumbnailUrl())
                .tags(request.getTags())
                .build();

        DocumentTemplate created = documentTemplateService.createTemplate(template);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentTemplateDto.fromEntity(created));
    }

    @GetMapping("/{templateId}")
    @Operation(summary = "Get template by ID")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_READ)
    public ResponseEntity<DocumentTemplateDto> getTemplateById(@PathVariable UUID templateId) {
        DocumentTemplate template = documentTemplateService.getTemplateById(templateId);
        return ResponseEntity.ok(DocumentTemplateDto.fromEntity(template));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Get template by slug")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_READ)
    public ResponseEntity<DocumentTemplateDto> getTemplateBySlug(@PathVariable String slug) {
        DocumentTemplate template = documentTemplateService.getTemplateBySlug(slug);
        return ResponseEntity.ok(DocumentTemplateDto.fromEntity(template));
    }

    @GetMapping
    @Operation(summary = "Get active templates")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_READ)
    public ResponseEntity<Page<DocumentTemplateDto>> getActiveTemplates(Pageable pageable) {
        Page<DocumentTemplate> templates = documentTemplateService.getAllActiveTemplates(pageable);
        return ResponseEntity.ok(templates.map(DocumentTemplateDto::fromEntity));
    }

    @GetMapping("/category/{category}")
    @Operation(summary = "Get templates by category")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_READ)
    public ResponseEntity<Page<DocumentTemplateDto>> getTemplatesByCategory(
            @PathVariable String category,
            Pageable pageable) {
        Page<DocumentTemplate> templates = documentTemplateService.getTemplatesByCategory(category, pageable);
        return ResponseEntity.ok(templates.map(DocumentTemplateDto::fromEntity));
    }

    @GetMapping("/featured")
    @Operation(summary = "Get featured templates")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_READ)
    public ResponseEntity<List<DocumentTemplateDto>> getFeaturedTemplates() {
        List<DocumentTemplate> templates = documentTemplateService.getFeaturedTemplates();
        return ResponseEntity.ok(
            templates.stream()
                .map(DocumentTemplateDto::fromEntity)
                .collect(Collectors.toList())
        );
    }

    @GetMapping("/popular")
    @Operation(summary = "Get popular templates")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_READ)
    public ResponseEntity<List<DocumentTemplateDto>> getPopularTemplates() {
        List<DocumentTemplate> templates = documentTemplateService.getPopularTemplates();
        return ResponseEntity.ok(
            templates.stream()
                .map(DocumentTemplateDto::fromEntity)
                .collect(Collectors.toList())
        );
    }

    @PutMapping("/{templateId}")
    @Operation(summary = "Update template")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_UPDATE)
    public ResponseEntity<DocumentTemplateDto> updateTemplate(
            @PathVariable UUID templateId,
            @Valid @RequestBody CreateTemplateRequest request) {
        DocumentTemplate templateData = DocumentTemplate.builder()
                .name(request.getName())
                .slug(request.getSlug())
                .description(request.getDescription())
                .category(request.getCategory())
                .content(request.getContent())
                .templateVariables(request.getTemplateVariables())
                .sampleData(request.getSampleData())
                .thumbnailUrl(request.getThumbnailUrl())
                .tags(request.getTags())
                .build();

        DocumentTemplate updated = documentTemplateService.updateTemplate(templateId, templateData);
        return ResponseEntity.ok(DocumentTemplateDto.fromEntity(updated));
    }

    @PostMapping("/{templateId}/toggle-active")
    @Operation(summary = "Toggle template active status")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_UPDATE)
    public ResponseEntity<DocumentTemplateDto> toggleActive(@PathVariable UUID templateId) {
        DocumentTemplate toggled = documentTemplateService.toggleActive(templateId);
        return ResponseEntity.ok(DocumentTemplateDto.fromEntity(toggled));
    }

    @PostMapping("/{templateId}/toggle-featured")
    @Operation(summary = "Toggle template featured status")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_UPDATE)
    public ResponseEntity<DocumentTemplateDto> toggleFeatured(@PathVariable UUID templateId) {
        DocumentTemplate toggled = documentTemplateService.toggleFeatured(templateId);
        return ResponseEntity.ok(DocumentTemplateDto.fromEntity(toggled));
    }

    @DeleteMapping("/{templateId}")
    @Operation(summary = "Delete template")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_TEMPLATE_DELETE)
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID templateId) {
        documentTemplateService.deleteTemplate(templateId);
        return ResponseEntity.noContent().build();
    }
}
