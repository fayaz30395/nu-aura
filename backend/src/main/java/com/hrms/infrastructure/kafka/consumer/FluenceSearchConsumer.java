package com.hrms.infrastructure.kafka.consumer;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.knowledge.BlogPost;
import com.hrms.domain.knowledge.DocumentTemplate;
import com.hrms.domain.knowledge.WikiPage;
import com.hrms.infrastructure.kafka.KafkaTopics;
import com.hrms.infrastructure.kafka.events.FluenceContentEvent;
import com.hrms.infrastructure.knowledge.repository.BlogPostRepository;
import com.hrms.infrastructure.knowledge.repository.DocumentTemplateRepository;
import com.hrms.infrastructure.knowledge.repository.WikiPageRepository;
import com.hrms.infrastructure.search.service.FluenceIndexingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/**
 * Kafka consumer that keeps the Elasticsearch index in sync with PostgreSQL.
 *
 * <p>Listens to the {@code nu-aura.fluence-content} topic and indexes/removes
 * documents in Elasticsearch based on content lifecycle events (CREATED, UPDATED,
 * PUBLISHED, DELETED).</p>
 *
 * <p>Only active when {@code app.elasticsearch.enabled=true}.</p>
 */
@Component
@ConditionalOnProperty(name = "app.elasticsearch.enabled", havingValue = "true", matchIfMissing = false)
@RequiredArgsConstructor
@Slf4j
public class FluenceSearchConsumer {

    private final FluenceIndexingService fluenceIndexingService;
    private final WikiPageRepository wikiPageRepository;
    private final BlogPostRepository blogPostRepository;
    private final DocumentTemplateRepository documentTemplateRepository;

    @KafkaListener(
            topics = KafkaTopics.FLUENCE_CONTENT,
            groupId = KafkaTopics.GROUP_FLUENCE_SEARCH,
            containerFactory = "fluenceContentEventListenerContainerFactory"
    )
    public void handleFluenceContentEvent(
            @Payload FluenceContentEvent event,
            Acknowledgment acknowledgment) {

        String contentType = event.getContentType();
        UUID contentId = event.getContentId();
        String action = event.getAction();
        UUID tenantId = event.getTenantId();

        if (tenantId != null) {
            TenantContext.setCurrentTenant(tenantId);
        }

        try {
            log.info("Processing fluence content event: type={}, id={}, action={}, tenantId={}",
                    contentType, contentId, action, tenantId);

            if (FluenceContentEvent.ACTION_DELETED.equals(action)) {
                fluenceIndexingService.removeDocument(contentType, contentId);
            } else {
                // CREATED, UPDATED, PUBLISHED — load entity from DB and index
                indexContent(contentType, contentId);
            }

            acknowledgment.acknowledge();
            log.debug("Successfully processed fluence content event: {}", event.getEventId());

        } catch (Exception e) { // Intentional broad catch — per-message error boundary
            log.error("Error processing fluence content event: type={}, id={}, action={}: {}",
                    contentType, contentId, action, e.getMessage(), e);
            // Don't acknowledge; let Kafka retry or move to DLT
            throw e;
        } finally {
            TenantContext.clear();
        }
    }

    private void indexContent(String contentType, UUID contentId) {
        switch (contentType) {
            case "wiki" -> {
                Optional<WikiPage> page = wikiPageRepository.findById(contentId);
                page.ifPresentOrElse(
                        fluenceIndexingService::indexWikiPage,
                        () -> log.warn("Wiki page not found for indexing: {}", contentId)
                );
            }
            case "blog" -> {
                Optional<BlogPost> post = blogPostRepository.findById(contentId);
                post.ifPresentOrElse(
                        fluenceIndexingService::indexBlogPost,
                        () -> log.warn("Blog post not found for indexing: {}", contentId)
                );
            }
            case "template" -> {
                Optional<DocumentTemplate> template = documentTemplateRepository.findById(contentId);
                template.ifPresentOrElse(
                        fluenceIndexingService::indexTemplate,
                        () -> log.warn("Document template not found for indexing: {}", contentId)
                );
            }
            default -> log.warn("Unknown content type for indexing: {}", contentType);
        }
    }
}
