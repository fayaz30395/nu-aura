package com.nulogic.infrastructure.training.repository;

import com.nulogic.domain.training.TrainingEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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

    boolean existsByTenantIdAndProgramIdAndEmployeeIdAndStatus(
            UUID tenantId,
            UUID programId,
            UUID employeeId,
            TrainingEnrollment.EnrollmentStatus status
    );

    @Query("SELECT e.programId FROM TrainingEnrollment e WHERE e.tenantId = :tenantId " +
            "AND e.employeeId = :employeeId AND e.programId IN :programIds AND e.status = :status")
    Set<UUID> findProgramIdsByEmployeeAndStatusIn(@Param("tenantId") UUID tenantId,
                                                  @Param("employeeId") UUID employeeId,
                                                  @Param("programIds") Collection<UUID> programIds,
                                                  @Param("status") TrainingEnrollment.EnrollmentStatus status);
}
