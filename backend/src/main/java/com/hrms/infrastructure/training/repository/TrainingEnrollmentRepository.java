package com.hrms.infrastructure.training.repository;

import com.hrms.domain.training.TrainingEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrainingEnrollmentRepository extends JpaRepository<TrainingEnrollment, UUID>, JpaSpecificationExecutor<TrainingEnrollment> {

    Optional<TrainingEnrollment> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TrainingEnrollment> findByTenantId(UUID tenantId);

    List<TrainingEnrollment> findByTenantIdAndProgramId(UUID tenantId, UUID programId);

    List<TrainingEnrollment> findByTenantIdAndEmployeeId(UUID tenantId, UUID employeeId);

    List<TrainingEnrollment> findByTenantIdAndStatus(UUID tenantId, TrainingEnrollment.EnrollmentStatus status);

    Optional<TrainingEnrollment> findByTenantIdAndProgramIdAndEmployeeId(UUID tenantId, UUID programId, UUID employeeId);

    boolean existsByTenantIdAndProgramIdAndEmployeeId(UUID tenantId, UUID programId, UUID employeeId);
}
