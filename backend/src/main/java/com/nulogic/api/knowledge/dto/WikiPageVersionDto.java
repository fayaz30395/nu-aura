package com.nulogic.api.knowledge.dto;

import com.nulogic.domain.knowledge.WikiPageVersion;

import java.time.LocalDateTime;
import java.util.UUID;

/** Flat view of a wiki page version; avoids serialising the lazy WikiPage proxy. */
public record WikiPageVersionDto(UUID id, UUID pageId, Integer versionNumber, String title, String excerpt,
                                 String content, String changeSummary, UUID createdBy, LocalDateTime createdAt) {

    public static WikiPageVersionDto from(WikiPageVersion v) {
        return new WikiPageVersionDto(v.getId(), v.getPage().getId(), v.getVersionNumber(), v.getTitle(),
                v.getExcerpt(), v.getContent(), v.getChangeSummary(), v.getCreatedBy(), v.getCreatedAt());
    }
}
