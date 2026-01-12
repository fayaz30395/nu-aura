package com.hrms.infrastructure.social.repository;

import com.hrms.domain.social.PostMention;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PostMentionRepository extends JpaRepository<PostMention, UUID> {
    List<PostMention> findByTenantIdAndMentionedEmployeeIdOrderByCreatedAtDesc(UUID tenantId, UUID mentionedEmployeeId);
}
