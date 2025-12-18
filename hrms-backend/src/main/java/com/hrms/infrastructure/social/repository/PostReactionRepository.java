package com.hrms.infrastructure.social.repository;

import com.hrms.domain.social.PostReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PostReactionRepository extends JpaRepository<PostReaction, UUID> {
    List<PostReaction> findByTenantIdAndPostId(UUID tenantId, UUID postId);
    Optional<PostReaction> findByTenantIdAndPostIdAndEmployeeId(UUID tenantId, UUID postId, UUID employeeId);
    long countByTenantIdAndPostId(UUID tenantId, UUID postId);
}
