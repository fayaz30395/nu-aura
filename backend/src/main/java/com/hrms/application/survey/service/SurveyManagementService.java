package com.hrms.application.survey.service;

import com.hrms.api.survey.dto.SurveyRequest;
import com.hrms.api.survey.dto.SurveyDto;
import com.hrms.domain.survey.Survey;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.survey.repository.SurveyRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SurveyManagementService {

    private final SurveyRepository surveyRepository;
    private final UserRepository userRepository;

    @Transactional
    public SurveyDto createSurvey(SurveyRequest request, UUID createdBy) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating survey {} for tenant {}", request.getSurveyCode(), tenantId);

        if (surveyRepository.existsByTenantIdAndSurveyCode(tenantId, request.getSurveyCode())) {
            throw new IllegalArgumentException("Survey with code " + request.getSurveyCode() + " already exists");
        }

        Survey survey = new Survey();
        survey.setId(UUID.randomUUID());
        survey.setTenantId(tenantId);
        survey.setSurveyCode(request.getSurveyCode());
        survey.setTitle(request.getTitle());
        survey.setDescription(request.getDescription());
        survey.setSurveyType(request.getSurveyType());
        survey.setIsAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false);
        survey.setStartDate(request.getStartDate());
        survey.setEndDate(request.getEndDate());
        survey.setStatus(request.getStatus() != null ? request.getStatus() : Survey.SurveyStatus.DRAFT);
        survey.setTargetAudience(request.getTargetAudience());
        survey.setTotalResponses(0);
        survey.setCreatedBy(createdBy);

        Survey savedSurvey = surveyRepository.save(survey);
        return mapToResponse(savedSurvey);
    }

    @Transactional
    public SurveyDto updateSurvey(UUID surveyId, SurveyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating survey {} for tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        survey.setTitle(request.getTitle());
        survey.setDescription(request.getDescription());
        survey.setSurveyType(request.getSurveyType());
        survey.setIsAnonymous(request.getIsAnonymous());
        survey.setStartDate(request.getStartDate());
        survey.setEndDate(request.getEndDate());
        survey.setStatus(request.getStatus());
        survey.setTargetAudience(request.getTargetAudience());

        Survey updatedSurvey = surveyRepository.save(survey);
        return mapToResponse(updatedSurvey);
    }

    @Transactional
    public SurveyDto updateStatus(UUID surveyId, Survey.SurveyStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating survey {} status to {} for tenant {}", surveyId, status, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        survey.setStatus(status);

        Survey updatedSurvey = surveyRepository.save(survey);
        return mapToResponse(updatedSurvey);
    }

    public SurveyDto launchSurvey(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Launching survey {} for tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        if (survey.getStatus() != Survey.SurveyStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft surveys can be launched");
        }

        survey.setStatus(Survey.SurveyStatus.ACTIVE);
        if (survey.getStartDate() == null) {
            survey.setStartDate(LocalDateTime.now());
        }

        Survey updatedSurvey = surveyRepository.save(survey);
        return mapToResponse(updatedSurvey);
    }

    public SurveyDto completeSurvey(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Completing survey {} for tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        survey.setStatus(Survey.SurveyStatus.COMPLETED);
        if (survey.getEndDate() == null) {
            survey.setEndDate(LocalDateTime.now());
        }

        Survey updatedSurvey = surveyRepository.save(survey);
        return mapToResponse(updatedSurvey);
    }

    @Transactional(readOnly = true)
    public SurveyDto getSurveyById(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));
        return mapToResponse(survey);
    }

    @Transactional(readOnly = true)
    public Page<SurveyDto> getAllSurveys(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return surveyRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<SurveyDto> getSurveysByStatus(Survey.SurveyStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return surveyRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SurveyDto> getActiveSurveys() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return surveyRepository.findByTenantIdAndStatus(tenantId, Survey.SurveyStatus.ACTIVE).stream()
                .filter(survey -> {
                    LocalDateTime now = LocalDateTime.now();
                    return (survey.getStartDate() == null || survey.getStartDate().isBefore(now)) &&
                           (survey.getEndDate() == null || survey.getEndDate().isAfter(now));
                })
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteSurvey(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));
        surveyRepository.delete(survey);
    }

    private SurveyDto mapToResponse(Survey survey) {
        String createdByName = null;
        if (survey.getCreatedBy() != null) {
            createdByName = userRepository.findById(survey.getCreatedBy())
                    .map(User::getFullName)
                    .orElse(null);
        }

        return SurveyDto.builder()
                .id(survey.getId())
                .tenantId(survey.getTenantId())
                .surveyCode(survey.getSurveyCode())
                .title(survey.getTitle())
                .description(survey.getDescription())
                .surveyType(survey.getSurveyType())
                .isAnonymous(survey.getIsAnonymous())
                .startDate(survey.getStartDate())
                .endDate(survey.getEndDate())
                .status(survey.getStatus())
                .targetAudience(survey.getTargetAudience())
                .totalResponses(survey.getTotalResponses())
                .createdBy(survey.getCreatedBy())
                .createdByName(createdByName)
                .createdAt(survey.getCreatedAt())
                .updatedAt(survey.getUpdatedAt())
                .build();
    }
}
