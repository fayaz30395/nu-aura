package com.nulogic.pm.api.controller;

import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.pm.api.dto.CommentDTO;
import com.nulogic.pm.application.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController("pmCommentController")
@RequestMapping("/api/v1/pm/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    @RequiresPermission(Permission.COMMENT_CREATE)
    public ResponseEntity<CommentDTO.Response> create(@Valid @RequestBody CommentDTO.CreateRequest request,
                                                       @RequestHeader("X-User-Id") UUID userId,
                                                       @RequestHeader("X-User-Name") String userName) {
        CommentDTO.Response response = commentService.create(request, userId, userName);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    @RequiresPermission(Permission.COMMENT_UPDATE)
    public ResponseEntity<CommentDTO.Response> update(@PathVariable UUID id,
                                                       @Valid @RequestBody CommentDTO.UpdateRequest request,
                                                       @RequestHeader("X-User-Id") UUID userId) {
        CommentDTO.Response response = commentService.update(id, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    @RequiresPermission(Permission.COMMENT_VIEW)
    public ResponseEntity<CommentDTO.Response> getById(@PathVariable UUID id) {
        CommentDTO.Response response = commentService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/task/{taskId}")
    @RequiresPermission(Permission.COMMENT_VIEW)
    public ResponseEntity<Page<CommentDTO.Response>> listByTask(
            @PathVariable UUID taskId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CommentDTO.Response> response = commentService.listByTask(taskId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/project/{projectId}")
    @RequiresPermission(Permission.COMMENT_VIEW)
    public ResponseEntity<Page<CommentDTO.Response>> listByProject(
            @PathVariable UUID projectId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CommentDTO.Response> response = commentService.listByProject(projectId, pageable);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/milestone/{milestoneId}")
    @RequiresPermission(Permission.COMMENT_VIEW)
    public ResponseEntity<Page<CommentDTO.Response>> listByMilestone(
            @PathVariable UUID milestoneId,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<CommentDTO.Response> response = commentService.listByMilestone(milestoneId, pageable);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @RequiresPermission(Permission.COMMENT_DELETE)
    public ResponseEntity<Void> delete(@PathVariable UUID id, @RequestHeader("X-User-Id") UUID userId) {
        commentService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }
}
