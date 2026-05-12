package com.nulogic.domain.knowledge;

import com.nulogic.common.entity.TenantAware;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.Where;

import java.util.UUID;

@Where(clause = "is_deleted = false")
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
