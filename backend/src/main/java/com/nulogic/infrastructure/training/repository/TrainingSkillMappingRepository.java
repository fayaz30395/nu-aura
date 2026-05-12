package com.nulogic.infrastructure.training.repository;

import com.nulogic.domain.training.TrainingSkillMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TrainingSkillMappingRepository extends JpaRepository<TrainingSkillMapping, UUID> {

    List<TrainingSkillMapping> findByTenantIdAndProgramIdAndIsActiveTrue(UUID tenantId, UUID programId);

    List<TrainingSkillMapping> findByTenantIdAndProgramId(UUID tenantId, UUID programId);
}
