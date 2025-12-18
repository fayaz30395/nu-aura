package com.hrms.api.social.controller;
import com.hrms.api.social.dto.*;
import com.hrms.application.social.service.SocialFeedService;
import com.hrms.common.security.RequiresPermission;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

import static com.hrms.common.security.Permission.*;

@RestController
@RequestMapping("/api/v1/social-feed")
@RequiredArgsConstructor
public class SocialFeedController {
    private final SocialFeedService socialFeedService;

    @PostMapping("/posts")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<SocialPostResponse> createPost(@RequestBody SocialPostRequest request, @RequestParam UUID authorId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(socialFeedService.createPost(request, authorId));
    }

    @PostMapping("/comments")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> addComment(@RequestBody PostCommentRequest request, @RequestParam UUID authorId) {
        socialFeedService.addComment(request, authorId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/posts/{postId}/react")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<Void> toggleReaction(@PathVariable UUID postId, @RequestParam UUID employeeId) {
        socialFeedService.toggleReaction(postId, employeeId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/posts")
    @RequiresPermission(EMPLOYEE_VIEW_SELF)
    public ResponseEntity<List<SocialPostResponse>> getFeed() {
        return ResponseEntity.ok(socialFeedService.getFeed());
    }
}
