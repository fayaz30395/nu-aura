package com.hrms.infrastructure.training.repository;

import com.hrms.domain.training.TrainingProgram;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TrainingProgramRepository extends JpaRepository<TrainingProgram, UUID>, JpaSpecificationExecutor<TrainingProgram> {

    Optional<TrainingProgram> findByIdAndTenantId(UUID id, UUID tenantId);

    List<TrainingProgram> findByTenantId(UUID tenantId);

    Optional<TrainingProgram> findByTenantIdAndProgramCode(UUID tenantId, String programCode);

    List<TrainingProgram> findByTenantIdAndStatus(UUID tenantId, TrainingProgram.ProgramStatus status);

    List<TrainingProgram> findByTenantIdAndCategory(UUID tenantId, TrainingProgram.TrainingCategory category);

    boolean existsByTenantIdAndProgramCode(UUID tenantId, String programCode);
}
