package com.hrms.api.knowledge.dto;

import lombok.Data;

import java.util.UUID;

/**
 * Typed body for {@code PATCH /api/v1/knowledge/wiki/pages/{pageId}/move}.
 *
 * <p>Replaces a raw {@code @RequestBody Map<String, UUID>} mass-assignment sink
 * (audit L-10.1). {@code parentPageId} may be {@code null} — that signals a move
 * back to the space root (matching the existing controller contract).</p>
 */
@Data
public class MoveWikiPageRequest {

    /**
     * Target parent page; {@code null} moves the page to the space root.
     */
    private UUID parentPageId;
}
