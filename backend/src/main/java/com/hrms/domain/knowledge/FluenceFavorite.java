package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.Where;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Where(clause = "is_deleted = false")
@Entity
@Table(name = "fluence_favorites", indexes = {
        @Index(name = "idx_fluence_favorites_tenant_user", columnList = "tenantId,userId"),
        @Index(name = "idx_fluence_favorites_tenant_content", columnList = "tenantId,contentId,contentType")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FluenceFavorite extends TenantAware {

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "content_id", nullable = false)
    private UUID contentId;

    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;
}
