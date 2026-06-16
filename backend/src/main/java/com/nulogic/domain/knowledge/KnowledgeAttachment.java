package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLRestriction;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "knowledge_attachments", indexes = {
        @Index(name = "idx_knowledge_attachments_tenant", columnList = "tenant_id"),
        @Index(name = "idx_knowledge_attachments_content", columnList = "content_type,content_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class KnowledgeAttachment extends TenantAware {

    @Column(name = "content_type", nullable = false, length = 50)
    @Enumerated(EnumType.STRING)
    private ContentType contentType;

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Column(name = "mime_type", length = 100)
    private String mimeType;

    @Column(name = "object_name", length = 1000)
    private String objectName;

    @Column(name = "storage_path", nullable = false, length = 1000)
    private String storagePath;

    @Column(length = 1000)
    private String url;

    @Column(name = "uploaded_by")
    private UUID uploadedBy;

    @Column(name = "content_type_enum", length = 20)
    private String contentTypeEnum;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    public enum ContentType {
        WIKI_PAGE, BLOG_POST, TEMPLATE
    }
}
