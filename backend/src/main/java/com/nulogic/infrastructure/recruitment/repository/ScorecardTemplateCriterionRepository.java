package com.nulogic.infrastructure.recruitment.repository;

import com.nulogic.domain.recruitment.ScorecardTemplateCriterion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ScorecardTemplateCriterionRepository extends JpaRepository<ScorecardTemplateCriterion, UUID> {

    List<ScorecardTemplateCriterion> findByTemplateIdOrderByOrderIndexAsc(UUID templateId);
}
