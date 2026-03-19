package com.hrms.infrastructure.search.service;

import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.MultiMatchQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.Query;
import co.elastic.clients.elasticsearch._types.query_dsl.TextQueryType;
import com.hrms.infrastructure.search.document.FluenceDocument;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Full-text search service for NU-Fluence content using Elasticsearch.
 *
 * <p>Provides multi-field boosted search across title, excerpt, and bodyText
 * with mandatory tenant isolation and optional content type / visibility filters.</p>
 *
 * <p>Only active when {@code app.elasticsearch.enabled=true}.</p>
 */
@Service
@ConditionalOnProperty(name = "app.elasticsearch.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class FluenceSearchService {

    private final ElasticsearchOperations elasticsearchOperations;

    /**
     * Search across all Fluence content with multi-field boosting.
     *
     * @param query    the search query string
     * @param tenantId the tenant to scope results to
     * @param pageable pagination parameters
     * @return page of matching FluenceDocument results
     */
    public Page<FluenceDocument> search(String query, UUID tenantId, Pageable pageable) {
        return searchWithFilters(query, tenantId, null, null, pageable);
    }

    /**
     * Search with optional filters for content type and visibility.
     *
     * <p>Uses a bool query with:
     * - must: multi_match on title^3, excerpt^2, bodyText^1
     * - filter: tenantId (required), deleted=false (required), contentType (optional), visibility (optional)
     * </p>
     *
     * @param query       the search query string
     * @param tenantId    the tenant to scope results to
     * @param contentType optional filter (e.g., "wiki", "blog", "template")
     * @param visibility  optional visibility filter (e.g., "PUBLIC", "ORGANIZATION")
     * @param pageable    pagination parameters
     * @return page of matching FluenceDocument results
     */
    public Page<FluenceDocument> searchWithFilters(
            String query,
            UUID tenantId,
            String contentType,
            String visibility,
            Pageable pageable) {

        // Build the multi_match query with field boosting
        Query multiMatchQuery = MultiMatchQuery.of(mm -> mm
                .query(query)
                .fields("title^3", "excerpt^2", "bodyText^1")
                .type(TextQueryType.BestFields)
                .fuzziness("AUTO")
        )._toQuery();

        // Build bool query with filters
        BoolQuery.Builder boolBuilder = new BoolQuery.Builder()
                .must(multiMatchQuery)
                .filter(Query.of(q -> q.term(t -> t.field("tenantId").value(tenantId.toString()))))
                .filter(Query.of(q -> q.term(t -> t.field("deleted").value(false))));

        if (contentType != null && !contentType.isBlank()) {
            boolBuilder.filter(Query.of(q -> q.term(t -> t.field("contentType").value(contentType))));
        }

        if (visibility != null && !visibility.isBlank()) {
            boolBuilder.filter(Query.of(q -> q.term(t -> t.field("visibility").value(visibility))));
        }

        NativeQuery nativeQuery = NativeQuery.builder()
                .withQuery(Query.of(q -> q.bool(boolBuilder.build())))
                .withPageable(pageable)
                .build();

        SearchHits<FluenceDocument> searchHits = elasticsearchOperations.search(
                nativeQuery, FluenceDocument.class);

        List<FluenceDocument> results = searchHits.getSearchHits().stream()
                .map(SearchHit::getContent)
                .collect(Collectors.toList());

        long totalHits = searchHits.getTotalHits();

        log.debug("ES search for query='{}', tenantId={}, contentType={}: {} hits",
                query, tenantId, contentType, totalHits);

        return new PageImpl<>(results, pageable, totalHits);
    }
}
