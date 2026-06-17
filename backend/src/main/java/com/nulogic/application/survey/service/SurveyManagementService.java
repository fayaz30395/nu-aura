package com.nulogic.application.survey.service;

import com.nulogic.api.survey.dto.SurveyDto;
import com.nulogic.api.survey.dto.SurveyRequest;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.survey.Survey;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.survey.repository.SurveyRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SurveyManagementService {

    private final SurveyRepository surveyRepository;
    private final UserRepository userRepository;
    private final TenantTimeService tenantTimeService;

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
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Launching survey {} for tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        if (survey.getStatus() != Survey.SurveyStatus.DRAFT) {
            throw new IllegalArgumentException("Only draft surveys can be launched");
        }

        survey.setStatus(Survey.SurveyStatus.ACTIVE);
        if (survey.getStartDate() == null) {
            // S11-M: tenant-local launch timestamp — resolved via TenantTimeService.
            survey.setStartDate(tenantTimeService.now(tenantId));
        }

        Survey updatedSurvey = surveyRepository.save(survey);
        return mapToResponse(updatedSurvey);
    }

    public SurveyDto completeSurvey(UUID surveyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        log.info("Completing survey {} for tenant {}", surveyId, tenantId);

        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));

        survey.setStatus(Survey.SurveyStatus.COMPLETED);
        if (survey.getEndDate() == null) {
            // S11-M: tenant-local completion timestamp — resolved via TenantTimeService.
            survey.setEndDate(tenantTimeService.now(tenantId));
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
        Page<Survey> page = surveyRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        );
        Map<UUID, String> createdByNames = loadCreatedByNames(page.getContent());
        return page.map(survey -> mapToResponse(survey, createdByNames));
    }

    @Transactional(readOnly = true)
    public List<SurveyDto> getSurveysByStatus(Survey.SurveyStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<Survey> surveys = surveyRepository.findByTenantIdAndStatus(tenantId, status);
        Map<UUID, String> createdByNames = loadCreatedByNames(surveys);
        return surveys.stream()
                .map(survey -> mapToResponse(survey, createdByNames))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<SurveyDto> getActiveSurveys() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        // S11-M: tenant-local "now" for active-window check — resolved via TenantTimeService and
        // hoisted out of the stream filter so we do a single zone resolution per call.
        LocalDateTime now = tenantTimeService.now(tenantId);
        List<Survey> activeSurveys = surveyRepository.findByTenantIdAndStatus(tenantId, Survey.SurveyStatus.ACTIVE).stream()
                .filter(survey ->
                        (survey.getStartDate() == null || survey.getStartDate().isBefore(now)) &&
                                (survey.getEndDate() == null || survey.getEndDate().isAfter(now)))
                .collect(Collectors.toList());
        Map<UUID, String> createdByNames = loadCreatedByNames(activeSurveys);
        return activeSurveys.stream()
                .map(survey -> mapToResponse(survey, createdByNames))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteSurvey(UUID surveyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Survey survey = surveyRepository.findByIdAndTenantId(surveyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Survey not found"));
        surveyRepository.delete(survey);
    }

    /**
     * Bulk-loads createdBy display names for a batch of surveys, eliminating the per-row
     * findById N+1. Collects non-null createdBy ids, issues a single findAllById, and builds
     * a null-safe id → fullName map.
     */
    private Map<UUID, String> loadCreatedByNames(List<Survey> surveys) {
        Set<UUID> createdByIds = surveys.stream()
                .map(Survey::getCreatedBy)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        Map<UUID, String> names = new HashMap<>();
        if (createdByIds.isEmpty()) {
            return names;
        }
        userRepository.findAllById(createdByIds).forEach(user -> {
            if (user.getId() != null && user.getFullName() != null) {
                names.put(user.getId(), user.getFullName());
            }
        });
        return names;
    }

    private SurveyDto mapToResponse(Survey survey) {
        // Single-entry delegation keeps the one-arg path DRY against the batch overload.
        return mapToResponse(survey, loadCreatedByNames(List.of(survey)));
    }

    private SurveyDto mapToResponse(Survey survey, Map<UUID, String> createdByNames) {
        String createdByName = survey.getCreatedBy() != null
                ? createdByNames.get(survey.getCreatedBy())
                : null;

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
