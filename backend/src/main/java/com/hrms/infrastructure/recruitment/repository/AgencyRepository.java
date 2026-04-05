package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.RecruitmentAgency;
import com.hrms.domain.recruitment.RecruitmentAgency.AgencyStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AgencyRepository extends JpaRepository<RecruitmentAgency, UUID>, JpaSpecificationExecutor<RecruitmentAgency> {

    Page<RecruitmentAgency> findByTenantId(UUID tenantId, Pageable pageable);

    Page<RecruitmentAgency> findByTenantIdAndStatus(UUID tenantId, AgencyStatus status, Pageable pageable);

    List<RecruitmentAgency> findByTenantIdAndStatus(UUID tenantId, AgencyStatus status);

    long countByTenantIdAndStatus(UUID tenantId, AgencyStatus status);

    Page<RecruitmentAgency> findByTenantIdAndNameContainingIgnoreCase(UUID tenantId, String name, Pageable pageable);

    Optional<RecruitmentAgency> findByIdAndTenantId(UUID id, UUID tenantId);

    boolean existsByTenantIdAndNameIgnoreCase(UUID tenantId, String name);
}
