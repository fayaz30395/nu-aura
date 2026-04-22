package com.hrms.domain.knowledge;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "blog_likes", indexes = {
        @Index(name = "idx_blog_likes_tenant", columnList = "tenantId"),
        @Index(name = "idx_blog_likes_post", columnList = "postId"),
        @Index(name = "idx_blog_likes_user", columnList = "userId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class BlogLike extends TenantAware {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private BlogPost post;

    @Column(nullable = false)
    private UUID userId;
}
