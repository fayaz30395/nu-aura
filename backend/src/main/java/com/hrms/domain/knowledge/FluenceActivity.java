package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "fluence_activities", indexes = {
        @Index(name = "idx_fluence_activities_tenant_created", columnList = "tenantId,createdAt"),
        @Index(name = "idx_fluence_activities_tenant_actor", columnList = "tenantId,actorId"),
        @Index(name = "idx_fluence_activities_tenant_type_created", columnList = "tenantId,contentType,createdAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FluenceActivity extends TenantAware {

    @Column(name = "actor_id", nullable = false)
    private UUID actorId;

    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @Column(name = "content_title", length = 500)
    private String contentTitle;

    @Column(name = "content_excerpt", columnDefinition = "TEXT")
    private String contentExcerpt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = Map.of();
}
