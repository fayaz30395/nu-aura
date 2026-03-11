package com.hrms.infrastructure.ai.repository;

import com.hrms.domain.ai.SentimentAnalysis;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SentimentAnalysisRepository extends JpaRepository<SentimentAnalysis, UUID> {

    Optional<SentimentAnalysis> findByIdAndTenantId(UUID id, UUID tenantId);

    Page<SentimentAnalysis> findByTenantId(UUID tenantId, Pageable pageable);

    List<SentimentAnalysis> findBySourceIdAndTenantId(UUID sourceId, UUID tenantId);

    List<SentimentAnalysis> findByTenantIdAndSourceType(
            UUID tenantId, SentimentAnalysis.SourceType sourceType);

    List<SentimentAnalysis> findByTenantIdAndSentiment(
            UUID tenantId, SentimentAnalysis.Sentiment sentiment);

    Page<SentimentAnalysis> findByTenantIdAndSourceTypeAndSourceId(
            UUID tenantId, SentimentAnalysis.SourceType sourceType, UUID sourceId, Pageable pageable);
}
