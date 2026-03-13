package com.hrms.infrastructure.recruitment.repository;

import com.hrms.domain.recruitment.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InterviewRepository extends JpaRepository<Interview, UUID>, JpaSpecificationExecutor<Interview> {

    Page<Interview> findAllByTenantId(UUID tenantId, Pageable pageable);
    
    Optional<Interview> findByIdAndTenantId(UUID id, UUID tenantId);
    
    List<Interview> findByTenantIdAndCandidateId(UUID tenantId, UUID candidateId);
    
    List<Interview> findByTenantIdAndJobOpeningId(UUID tenantId, UUID jobOpeningId);
    
    List<Interview> findByTenantIdAndInterviewerId(UUID tenantId, UUID interviewerId);
    
    List<Interview> findByTenantIdAndStatus(UUID tenantId, Interview.InterviewStatus status);
}
