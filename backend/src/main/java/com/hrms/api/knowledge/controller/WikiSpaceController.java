package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.AddSpaceMemberRequest;
import com.hrms.api.knowledge.dto.CreateWikiSpaceRequest;
import com.hrms.api.knowledge.dto.SpaceMemberDto;
import com.hrms.api.knowledge.dto.UpdateSpaceMemberRequest;
import com.hrms.api.knowledge.dto.WikiSpaceDto;
import com.hrms.application.knowledge.service.SpacePermissionService;
import com.hrms.application.knowledge.service.WikiSpaceService;
import com.hrms.domain.knowledge.SpaceMember;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.knowledge.WikiSpace;
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
@RequestMapping("/api/v1/knowledge/wiki/spaces")
@RequiredArgsConstructor
@Tag(name = "Wiki Spaces", description = "Wiki space management")
public class WikiSpaceController {

    private final WikiSpaceService wikiSpaceService;
    private final SpacePermissionService spacePermissionService;

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

    // ==================== Space Member Endpoints ====================

    @GetMapping("/{spaceId}/members")
    @Operation(summary = "Get all members of a space")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_WIKI_READ)
    public ResponseEntity<List<SpaceMemberDto>> getSpaceMembers(@PathVariable UUID spaceId) {
        List<SpaceMember> members = spacePermissionService.getMembers(spaceId);
        return ResponseEntity.ok(
                members.stream()
                        .map(SpaceMemberDto::fromEntity)
                        .collect(Collectors.toList())
        );
    }

    @PostMapping("/{spaceId}/members")
    @Operation(summary = "Add a member to a space")
    @ApiResponses.Created
    @RequiresPermission(Permission.KNOWLEDGE_SPACE_MANAGE)
    public ResponseEntity<SpaceMemberDto> addSpaceMember(
            @PathVariable UUID spaceId,
            @Valid @RequestBody AddSpaceMemberRequest request) {
        SpaceMember.Role role = SpaceMember.Role.valueOf(request.getRole());
        SpaceMember member = spacePermissionService.addMember(spaceId, request.getUserId(), role);
        return ResponseEntity.status(HttpStatus.CREATED).body(SpaceMemberDto.fromEntity(member));
    }

    @PatchMapping("/{spaceId}/members/{userId}")
    @Operation(summary = "Update a member's role in a space")
    @ApiResponses.Success
    @RequiresPermission(Permission.KNOWLEDGE_SPACE_MANAGE)
    public ResponseEntity<SpaceMemberDto> updateSpaceMember(
            @PathVariable UUID spaceId,
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateSpaceMemberRequest request) {
        SpaceMember.Role newRole = SpaceMember.Role.valueOf(request.getRole());
        SpaceMember updated = spacePermissionService.updateMemberRole(spaceId, userId, newRole);
        return ResponseEntity.ok(SpaceMemberDto.fromEntity(updated));
    }

    @DeleteMapping("/{spaceId}/members/{userId}")
    @Operation(summary = "Remove a member from a space")
    @ApiResponses.NoContent
    @RequiresPermission(Permission.KNOWLEDGE_SPACE_MANAGE)
    public ResponseEntity<Void> removeSpaceMember(
            @PathVariable UUID spaceId,
            @PathVariable UUID userId) {
        spacePermissionService.removeMember(spaceId, userId);
        return ResponseEntity.noContent().build();
    }
}
