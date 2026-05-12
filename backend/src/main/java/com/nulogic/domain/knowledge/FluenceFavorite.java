package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

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
