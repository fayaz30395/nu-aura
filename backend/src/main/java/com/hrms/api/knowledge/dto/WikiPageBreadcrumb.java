package com.hrms.api.knowledge.dto;

import java.util.UUID;

/**
 * Breadcrumb entry for wiki page ancestor chain navigation.
 */
public record WikiPageBreadcrumb(UUID id, String title, String slug) {
}
