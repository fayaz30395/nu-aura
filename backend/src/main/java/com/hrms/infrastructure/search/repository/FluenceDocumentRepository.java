package com.hrms.infrastructure.search.repository;

import com.hrms.infrastructure.search.document.FluenceDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

import java.util.List;
import java.util.UUID;

/**
 * Elasticsearch repository for NU-Fluence documents.
 *
 * <p>Provides derived query methods for tenant-scoped search operations.
 * All queries filter on {@code deleted=false} to exclude soft-deleted content.</p>
 */
public interface FluenceDocumentRepository extends ElasticsearchRepository<FluenceDocument, String> {

    Page<FluenceDocument> findByTenantIdAndDeletedFalse(UUID tenantId, Pageable pageable);

    Page<FluenceDocument> findByTenantIdAndContentTypeAndDeletedFalse(UUID tenantId, String contentType, Pageable pageable);

    void deleteByContentTypeAndContentId(String contentType, UUID contentId);

    List<FluenceDocument> findByTenantIdAndContentIdIn(UUID tenantId, List<UUID> contentIds);
}
