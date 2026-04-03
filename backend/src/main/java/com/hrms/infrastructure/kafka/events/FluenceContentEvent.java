package com.hrms.infrastructure.kafka.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.io.Serial;
import java.util.UUID;

/**
 * Kafka event for NU-Fluence content changes (create, update, delete).
 *
 * <p>Published when wiki pages, blog posts, or templates are created, updated,
 * or deleted. Consumed by the FluenceSearchConsumer to keep the Elasticsearch
 * index in sync with PostgreSQL.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FluenceContentEvent extends BaseKafkaEvent {

    /**
     * Supported action constants.
     */
    public static final String ACTION_CREATED = "CREATED";
    public static final String ACTION_UPDATED = "UPDATED";
    public static final String ACTION_PUBLISHED = "PUBLISHED";
    public static final String ACTION_DELETED = "DELETED";
    @Serial
    private static final long serialVersionUID = 1L;
    /**
     * Content type: "wiki", "blog", or "template".
     */
    @JsonProperty("content_type")
    private String contentType;
    /**
     * UUID of the content entity (wiki page ID, blog post ID, or template ID).
     */
    @JsonProperty("content_id")
    private UUID contentId;
    /**
     * Action performed: CREATED, UPDATED, PUBLISHED, or DELETED.
     */
    @JsonProperty("action")
    private String action;
}
