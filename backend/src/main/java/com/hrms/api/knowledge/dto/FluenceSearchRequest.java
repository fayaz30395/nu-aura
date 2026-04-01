package com.hrms.api.knowledge.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FluenceSearchRequest {

    private String query;
    private String contentType;  // WIKI_PAGE, BLOG_POST, TEMPLATE, ALL
    @Builder.Default
    private Integer page = 0;
    @Builder.Default
    private Integer size = 20;
}
