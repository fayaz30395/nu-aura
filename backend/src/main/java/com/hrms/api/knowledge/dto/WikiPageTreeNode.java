package com.hrms.api.knowledge.dto;

import java.util.List;
import java.util.UUID;

/**
 * Tree node representation of a wiki page for hierarchical navigation.
 * Supports up to 3 levels of nesting.
 */
public record WikiPageTreeNode(
        UUID id,
        String title,
        String slug,
        String status,
        Boolean isPinned,
        Integer viewCount,
        UUID parentPageId,
        List<WikiPageTreeNode> children
) {
}
