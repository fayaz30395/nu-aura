package com.nulogic.api.knowledge.controller;

import com.nulogic.api.knowledge.dto.BlogPostDto;
import com.nulogic.api.knowledge.dto.WikiPageDto;
import com.nulogic.application.knowledge.service.KnowledgeSearchService;
import com.nulogic.common.api.ApiResponses;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.domain.knowledge.BlogPost;
import com.nulogic.domain.knowledge.WikiPage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/knowledge/search")
@RequiredArgsConstructor
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
