package com.hrms.infrastructure.survey.repository;

import com.hrms.domain.survey.Survey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SurveyRepository extends JpaRepository<Survey, UUID>, JpaSpecificationExecutor<Survey> {

    Optional<Survey> findByIdAndTenantId(UUID id, UUID tenantId);

    List<Survey> findByTenantId(UUID tenantId);

    Optional<Survey> findByTenantIdAndSurveyCode(UUID tenantId, String surveyCode);

    List<Survey> findByTenantIdAndStatus(UUID tenantId, Survey.SurveyStatus status);

    List<Survey> findByTenantIdAndSurveyType(UUID tenantId, Survey.SurveyType surveyType);

    boolean existsByTenantIdAndSurveyCode(UUID tenantId, String surveyCode);
}
