package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.InterviewScorecard;
import com.hrms.domain.recruitment.ScorecardCriterion;
import com.hrms.domain.recruitment.ScorecardTemplate;
import com.hrms.domain.recruitment.ScorecardTemplateCriterion;
import com.hrms.infrastructure.recruitment.repository.InterviewScorecardRepository;
import com.hrms.infrastructure.recruitment.repository.ScorecardTemplateCriterionRepository;
import com.hrms.infrastructure.recruitment.repository.ScorecardTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ScorecardService {

    private static final String TEMPLATE_NOT_FOUND = "Scorecard template not found";
    private static final String SCORECARD_NOT_FOUND = "Scorecard not found";

    private final ScorecardTemplateRepository templateRepository;
    private final ScorecardTemplateCriterionRepository criterionRepository;
    private final InterviewScorecardRepository scorecardRepository;

    // ==================== Template CRUD ====================

    public ScorecardTemplateResponse createTemplate(ScorecardTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating scorecard template '{}' for tenant {}", request.getName(), tenantId);

        ScorecardTemplate template = ScorecardTemplate.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .description(request.getDescription())
                .isDefault(request.getIsDefault() != null ? request.getIsDefault() : false)
                .build();

        ScorecardTemplate saved = templateRepository.save(template);

        if (request.getCriteria() != null) {
            for (int i = 0; i < request.getCriteria().size(); i++) {
                ScorecardTemplateRequest.CriterionRequest cr = request.getCriteria().get(i);
                ScorecardTemplateCriterion criterion = ScorecardTemplateCriterion.builder()
                        .tenantId(tenantId)
                        .templateId(saved.getId())
                        .name(cr.getName())
                        .category(cr.getCategory())
                        .weight(cr.getWeight() != null ? cr.getWeight() : 1.0)
                        .orderIndex(cr.getOrderIndex() != null ? cr.getOrderIndex() : i)
                        .build();
                criterionRepository.save(criterion);
            }
        }

        return getTemplateById(saved.getId());
    }

    @Transactional(readOnly = true)
    public List<ScorecardTemplateResponse> getAllTemplates() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return templateRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(this::mapTemplateToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ScorecardTemplateResponse getTemplateById(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ScorecardTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(TEMPLATE_NOT_FOUND));
        return mapTemplateToResponse(template);
    }

    public ScorecardTemplateResponse updateTemplate(UUID templateId, ScorecardTemplateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating scorecard template {} for tenant {}", templateId, tenantId);

        ScorecardTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(TEMPLATE_NOT_FOUND));

        template.setName(request.getName());
        template.setDescription(request.getDescription());
        if (request.getIsDefault() != null) {
            template.setIsDefault(request.getIsDefault());
        }
        templateRepository.save(template);

        // Replace criteria if provided
        if (request.getCriteria() != null) {
            List<ScorecardTemplateCriterion> existing = criterionRepository
                    .findByTemplateIdOrderByOrderIndexAsc(templateId);
            criterionRepository.deleteAll(existing);

            for (int i = 0; i < request.getCriteria().size(); i++) {
                ScorecardTemplateRequest.CriterionRequest cr = request.getCriteria().get(i);
                ScorecardTemplateCriterion criterion = ScorecardTemplateCriterion.builder()
                        .tenantId(tenantId)
                        .templateId(templateId)
                        .name(cr.getName())
                        .category(cr.getCategory())
                        .weight(cr.getWeight() != null ? cr.getWeight() : 1.0)
                        .orderIndex(cr.getOrderIndex() != null ? cr.getOrderIndex() : i)
                        .build();
                criterionRepository.save(criterion);
            }
        }

        return getTemplateById(templateId);
    }

    public void deleteTemplate(UUID templateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Soft-deleting scorecard template {} for tenant {}", templateId, tenantId);

        ScorecardTemplate template = templateRepository.findByIdAndTenantId(templateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException(TEMPLATE_NOT_FOUND));
        template.softDelete();
        templateRepository.save(template);
    }

    // ==================== Scorecard Submission ====================

    public ScorecardSubmissionResponse submitScorecard(UUID templateId, ScorecardSubmissionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID interviewerId = SecurityContext.getCurrentEmployeeId();
        log.info("Submitting scorecard for interview {} by interviewer {} in tenant {}",
                request.getInterviewId(), interviewerId, tenantId);

        // Verify template exists if provided
        if (templateId != null) {
            templateRepository.findByIdAndTenantId(templateId, tenantId)
                    .orElseThrow(() -> new IllegalArgumentException(TEMPLATE_NOT_FOUND));
        }

        InterviewScorecard scorecard = InterviewScorecard.builder()
                .tenantId(tenantId)
                .interviewId(request.getInterviewId())
                .applicantId(request.getApplicantId())
                .jobOpeningId(request.getJobOpeningId())
                .interviewerId(interviewerId != null ? interviewerId : SecurityContext.getCurrentUserId())
                .templateId(templateId)
                .overallRating(request.getOverallRating())
                .recommendation(request.getRecommendation())
                .overallNotes(request.getOverallNotes())
                .status(InterviewScorecard.ScorecardStatus.SUBMITTED)
                .submittedAt(LocalDateTime.now())
                .build();

        InterviewScorecard saved = scorecardRepository.save(scorecard);

        // Save criteria scores
        if (request.getCriteriaScores() != null) {
            List<ScorecardCriterion> criteria = new ArrayList<>();
            for (int i = 0; i < request.getCriteriaScores().size(); i++) {
                ScorecardSubmissionRequest.CriterionScore cs = request.getCriteriaScores().get(i);
                ScorecardCriterion criterion = ScorecardCriterion.builder()
                        .tenantId(tenantId)
                        .scorecardId(saved.getId())
                        .name(cs.getName())
                        .category(cs.getCategory())
                        .rating(cs.getRating())
                        .weight(cs.getWeight() != null ? cs.getWeight() : 1.0)
                        .notes(cs.getNotes())
                        .orderIndex(cs.getOrderIndex() != null ? cs.getOrderIndex() : i)
                        .build();
                criteria.add(criterion);
            }
            saved.getCriteria().addAll(criteria);
            saved = scorecardRepository.save(saved);
        }

        return mapScorecardToResponse(saved);
    }

    // ==================== Mappers ====================

    private ScorecardTemplateResponse mapTemplateToResponse(ScorecardTemplate template) {
        List<ScorecardTemplateCriterion> criteria = criterionRepository
                .findByTemplateIdOrderByOrderIndexAsc(template.getId());

        return ScorecardTemplateResponse.builder()
                .id(template.getId())
                .tenantId(template.getTenantId())
                .name(template.getName())
                .description(template.getDescription())
                .isDefault(template.getIsDefault())
                .criteria(criteria.stream()
                        .map(c -> ScorecardTemplateResponse.CriterionResponse.builder()
                                .id(c.getId())
                                .name(c.getName())
                                .category(c.getCategory())
                                .weight(c.getWeight())
                                .orderIndex(c.getOrderIndex())
                                .build())
                        .collect(Collectors.toList()))
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .build();
    }

    private ScorecardSubmissionResponse mapScorecardToResponse(InterviewScorecard scorecard) {
        return ScorecardSubmissionResponse.builder()
                .id(scorecard.getId())
                .tenantId(scorecard.getTenantId())
                .interviewId(scorecard.getInterviewId())
                .applicantId(scorecard.getApplicantId())
                .jobOpeningId(scorecard.getJobOpeningId())
                .interviewerId(scorecard.getInterviewerId())
                .templateId(scorecard.getTemplateId())
                .overallRating(scorecard.getOverallRating())
                .recommendation(scorecard.getRecommendation())
                .overallNotes(scorecard.getOverallNotes())
                .status(scorecard.getStatus())
                .submittedAt(scorecard.getSubmittedAt())
                .criteriaScores(scorecard.getCriteria() != null ? scorecard.getCriteria().stream()
                        .map(c -> ScorecardSubmissionResponse.CriterionScoreResponse.builder()
                                .id(c.getId())
                                .name(c.getName())
                                .category(c.getCategory())
                                .rating(c.getRating())
                                .weight(c.getWeight())
                                .notes(c.getNotes())
                                .orderIndex(c.getOrderIndex())
                                .build())
                        .collect(Collectors.toList()) : List.of())
                .createdAt(scorecard.getCreatedAt())
                .updatedAt(scorecard.getUpdatedAt())
                .build();
    }
}
