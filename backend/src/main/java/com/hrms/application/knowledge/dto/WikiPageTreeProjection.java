package com.hrms.application.knowledge.dto;

import com.hrms.domain.knowledge.WikiPage;

import java.util.UUID;

/**
 * Lightweight JPA projection for wiki-page tree construction.
 *
 * <p>Used by the JPQL constructor query in {@code WikiPageRepository#findTreeNodesByTenantAndSpace}
 * so we never materialise full {@link WikiPage} entities — in particular, we skip the
 * heavy {@code content} JSONB column when building navigation trees. (Audit Q-P06.)</p>
 */
public class WikiPageTreeProjection {

    private final UUID id;
    private final String title;
    private final String slug;
    private final WikiPage.PageStatus status;
    private final Boolean isPinned;
    private final Integer viewCount;
    private final UUID parentPageId;

    public WikiPageTreeProjection(UUID id,
                                  String title,
                                  String slug,
                                  WikiPage.PageStatus status,
                                  Boolean isPinned,
                                  Integer viewCount,
                                  UUID parentPageId) {
        this.id = id;
        this.title = title;
        this.slug = slug;
        this.status = status;
        this.isPinned = isPinned;
        this.viewCount = viewCount;
        this.parentPageId = parentPageId;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getSlug() {
        return slug;
    }

    public WikiPage.PageStatus getStatus() {
        return status;
    }

    public Boolean getIsPinned() {
        return isPinned;
    }

    public Integer getViewCount() {
        return viewCount;
    }

    public UUID getParentPageId() {
        return parentPageId;
    }
}
