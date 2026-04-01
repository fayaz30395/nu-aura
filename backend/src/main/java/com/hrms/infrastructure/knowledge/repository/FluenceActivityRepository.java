package com.hrms.infrastructure.knowledge.repository;

import com.hrms.domain.knowledge.FluenceActivity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FluenceActivityRepository extends JpaRepository<FluenceActivity, UUID> {

    Page<FluenceActivity> findByTenantIdAndIsDeletedFalseOrderByCreatedAtDesc(
            UUID tenantId, Pageable pageable);

    Page<FluenceActivity> findByTenantIdAndContentTypeAndIsDeletedFalseOrderByCreatedAtDesc(
            UUID tenantId, String contentType, Pageable pageable);

    Page<FluenceActivity> findByTenantIdAndActorIdAndIsDeletedFalseOrderByCreatedAtDesc(
            UUID tenantId, UUID actorId, Pageable pageable);
}
