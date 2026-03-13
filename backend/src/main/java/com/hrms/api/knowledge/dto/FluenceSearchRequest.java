package com.hrms.api.knowledge.dto;

import lombok.*;
import org.springframework.data.domain.Pageable;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FluenceSearchRequest {

    private String query;
    private String contentType;  // WIKI_PAGE, BLOG_POST, TEMPLATE, ALL
    private Integer page = 0;
    private Integer size = 20;
}
