package com.hrms.api.knowledge.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FluenceSearchResponse {

    private String query;
    private Long totalResults;
    private Integer page;
    private Integer size;
    private Integer totalPages;

    private List<SearchResultItem> wikiPages;
    private List<SearchResultItem> blogPosts;
    private List<SearchResultItem> templates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchResultItem {
        private String id;
        private String type;  // WIKI_PAGE, BLOG_POST, TEMPLATE
        private String title;
        private String excerpt;
        private String url;
        private String contentType;
        private Long viewCount;
    }
}
