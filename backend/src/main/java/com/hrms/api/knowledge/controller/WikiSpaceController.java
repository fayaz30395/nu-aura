package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.CreateWikiSpaceRequest;
import com.hrms.api.knowledge.dto.WikiSpaceDto;
import com.hrms.application.knowledge.service.WikiSpaceService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.knowledge.WikiSpace;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequestMapping("/api/v1/knowledge/wiki/spaces")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Wiki Spaces", description = "Wiki space management")
public class WikiSpaceController {

    private final WikiSpaceService wikiSpaceService;

    @PostMapping
    @Operation(summary = "Create wiki space")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_CREATE)
    public ResponseEntity<WikiSpaceDto> createSpace(@Valid @RequestBody CreateWikiSpaceRequest request) {
        WikiSpace space = WikiSpace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .slug(request.getSlug())
                .icon(request.getIcon())
                .visibility(WikiSpace.VisibilityLevel.valueOf(request.getVisibility()))
                .color(request.getColor())
                .orderIndex(request.getOrderIndex())
                .approvalEnabled(request.getApprovalEnabled() != null ? request.getApprovalEnabled() : false)
                .approverEmployeeId(request.getApproverEmployeeId())
                .build();

        WikiSpace created = wikiSpaceService.createSpace(space);
        return ResponseEntity.status(HttpStatus.CREATED).body(WikiSpaceDto.fromEntity(created));
    }

    @GetMapping("/{spaceId}")
    @Operation(summary = "Get wiki space by ID")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<WikiSpaceDto> getSpaceById(@PathVariable UUID spaceId) {
        WikiSpace space = wikiSpaceService.getSpaceById(spaceId);
        return ResponseEntity.ok(WikiSpaceDto.fromEntity(space));
    }

    @GetMapping
    @Operation(summary = "Get all wiki spaces")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<Page<WikiSpaceDto>> getAllSpaces(Pageable pageable) {
        Page<WikiSpace> spaces = wikiSpaceService.getAllSpaces(pageable);
        return ResponseEntity.ok(spaces.map(WikiSpaceDto::fromEntity));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active wiki spaces")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<WikiSpaceDto>> getActiveSpaces() {
        List<WikiSpace> spaces = wikiSpaceService.getActiveSpaces();
        return ResponseEntity.ok(
            spaces.stream()
                .map(WikiSpaceDto::fromEntity)
                .collect(Collectors.toList())
        );
    }

    @PutMapping("/{spaceId}")
    @Operation(summary = "Update wiki space")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiSpaceDto> updateSpace(
            @PathVariable UUID spaceId,
            @Valid @RequestBody CreateWikiSpaceRequest request) {
        WikiSpace spaceData = WikiSpace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .slug(request.getSlug())
                .icon(request.getIcon())
                .visibility(WikiSpace.VisibilityLevel.valueOf(request.getVisibility()))
                .color(request.getColor())
                .orderIndex(request.getOrderIndex())
                .approvalEnabled(request.getApprovalEnabled() != null ? request.getApprovalEnabled() : false)
                .approverEmployeeId(request.getApproverEmployeeId())
                .build();

        WikiSpace updated = wikiSpaceService.updateSpace(spaceId, spaceData);
        return ResponseEntity.ok(WikiSpaceDto.fromEntity(updated));
    }

    @PostMapping("/{spaceId}/archive")
    @Operation(summary = "Archive wiki space")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_UPDATE)
    public ResponseEntity<WikiSpaceDto> archiveSpace(@PathVariable UUID spaceId) {
        WikiSpace archived = wikiSpaceService.archiveSpace(spaceId);
        return ResponseEntity.ok(WikiSpaceDto.fromEntity(archived));
    }

    @DeleteMapping("/{spaceId}")
    @Operation(summary = "Delete wiki space")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_DELETE)
    public ResponseEntity<Void> deleteSpace(@PathVariable UUID spaceId) {
        wikiSpaceService.deleteSpace(spaceId);
        return ResponseEntity.noContent().build();
    }
}
