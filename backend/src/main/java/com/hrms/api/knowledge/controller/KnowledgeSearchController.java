package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.BlogPostDto;
import com.hrms.api.knowledge.dto.WikiPageDto;
import com.hrms.application.knowledge.service.KnowledgeSearchService;
import com.hrms.common.api.ApiResponses;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.WikiPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/knowledge/search")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Knowledge Search", description = "Unified knowledge search")
public class KnowledgeSearchController {

    private final KnowledgeSearchService knowledgeSearchService;

    @GetMapping("/wiki")
    @Operation(summary = "Search wiki pages")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public ResponseEntity<Page<WikiPageDto>> searchWiki(
            @RequestParam String query,
            Pageable pageable) {
        Page<WikiPage> results = knowledgeSearchService.searchWikiPages(query, pageable);
        return ResponseEntity.ok(results.map(WikiPageDto::fromEntity));
    }

    @GetMapping("/blog")
    @Operation(summary = "Search blog posts")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public ResponseEntity<Page<BlogPostDto>> searchBlog(
            @RequestParam String query,
            Pageable pageable) {
        Page<BlogPost> results = knowledgeSearchService.searchBlogPosts(query, pageable);
        return ResponseEntity.ok(results.map(BlogPostDto::fromEntity));
    }

    @GetMapping("/all")
    @Operation(summary = "Search all knowledge content")
    @ApiResponses.GetList
    @RequiresPermission(Permission.KNOWLEDGE_SEARCH)
    public ResponseEntity<Page<WikiPageDto>> searchAll(
            @RequestParam String query,
            Pageable pageable) {
        Page<WikiPage> results = knowledgeSearchService.searchAllContent(query, pageable);
        return ResponseEntity.ok(results.map(WikiPageDto::fromEntity));
    }
}
