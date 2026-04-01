package com.hrms.infrastructure.search.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Elasticsearch document representing NU-Fluence content (wiki pages, blog posts, templates).
 *
 * <p>Indexed into the "fluence-documents" index for unified full-text search across
 * all knowledge content types. Multi-tenant isolation is enforced via tenantId filter.</p>
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(indexName = "fluence-documents")
@Setting(shards = 1, replicas = 0)
public class FluenceDocument {

    @Id
    private String id;

    @Field(type = FieldType.Keyword)
    private UUID tenantId;

    @Field(type = FieldType.Keyword)
    private String contentType;

    @Field(type = FieldType.Keyword)
    private UUID contentId;

    @Field(type = FieldType.Text)
    private String title;

    @Field(type = FieldType.Text)
    private String excerpt;

    @Field(type = FieldType.Text)
    private String bodyText;

    @Field(type = FieldType.Keyword)
    private String slug;

    @Field(type = FieldType.Keyword)
    private String status;

    @Field(type = FieldType.Keyword)
    private String visibility;

    @Field(type = FieldType.Keyword)
    private UUID authorId;

    @Field(type = FieldType.Text)
    private String authorName;

    @Field(type = FieldType.Keyword)
    private List<String> tags;

    @Field(type = FieldType.Keyword)
    private UUID spaceId;

    @Field(type = FieldType.Keyword)
    private String spaceName;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Integer)
    private Integer viewCount;

    @Field(type = FieldType.Integer)
    private Integer likeCount;

    @Field(type = FieldType.Date, format = DateFormat.epoch_millis)
    private Instant createdAt;

    @Field(type = FieldType.Date, format = DateFormat.epoch_millis)
    private Instant updatedAt;

    @Field(type = FieldType.Date, format = DateFormat.epoch_millis)
    private Instant publishedAt;

    @Field(type = FieldType.Boolean)
    private boolean deleted;

    /**
     * Build a composite document ID from content type and content ID.
     * Ensures uniqueness across content types within the same index.
     *
     * @param contentType the type of content (e.g., "wiki", "blog", "template")
     * @param contentId   the UUID of the content entity
     * @return composite ID string
     */
    public static String buildId(String contentType, UUID contentId) {
        return contentType + "_" + contentId;
    }
}
