package com.hrms.infrastructure.social.repository;

import com.hrms.domain.social.SocialPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SocialPostRepository extends JpaRepository<SocialPost, UUID>, JpaSpecificationExecutor<SocialPost> {
    Optional<SocialPost> findByIdAndTenantId(UUID id, UUID tenantId);
    List<SocialPost> findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID tenantId);
    List<SocialPost> findByTenantIdAndAuthorIdAndIsDeletedFalseOrderByCreatedAtDesc(UUID tenantId, UUID authorId);
    List<SocialPost> findByTenantIdAndPostTypeAndIsDeletedFalseOrderByCreatedAtDesc(UUID tenantId, SocialPost.PostType postType);
}
