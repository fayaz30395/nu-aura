package com.hrms.application.benefits.service;

import com.hrms.api.benefits.dto.BenefitPlanRequest;
import com.hrms.api.benefits.dto.BenefitPlanResponse;
import com.hrms.domain.benefits.BenefitPlan;
import com.hrms.infrastructure.benefits.repository.BenefitPlanRepository;
import com.hrms.common.security.TenantContext;
import com.hrms.common.logging.Audited;
import com.hrms.domain.audit.AuditLog.AuditAction;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BenefitManagementService {

    private final BenefitPlanRepository benefitPlanRepository;

    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "BENEFIT_PLAN", description = "Created benefit plan")
    public BenefitPlanResponse createPlan(BenefitPlanRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating benefit plan {} for tenant {}", request.getPlanCode(), tenantId);

        if (benefitPlanRepository.existsByTenantIdAndPlanCode(tenantId, request.getPlanCode())) {
            throw new IllegalArgumentException("Benefit plan with code " + request.getPlanCode() + " already exists");
        }

        BenefitPlan plan = new BenefitPlan();
        plan.setId(UUID.randomUUID());
        plan.setTenantId(tenantId);
        plan.setPlanCode(request.getPlanCode());
        plan.setPlanName(request.getPlanName());
        plan.setDescription(request.getDescription());
        plan.setBenefitType(request.getBenefitType());
        plan.setProviderId(request.getProviderId());
        plan.setCoverageAmount(request.getCoverageAmount());
        plan.setEmployeeContribution(request.getEmployeeContribution());
        plan.setEmployerContribution(request.getEmployerContribution());
        plan.setEffectiveDate(request.getEffectiveDate());
        plan.setExpiryDate(request.getExpiryDate());
        plan.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);
        plan.setEligibilityCriteria(request.getEligibilityCriteria());

        BenefitPlan savedPlan = benefitPlanRepository.save(plan);
        return mapToResponse(savedPlan);
    }

    @Transactional
    @Audited(action = AuditAction.UPDATE, entityType = "BENEFIT_PLAN", description = "Updated benefit plan", entityIdParam = 0)
    public BenefitPlanResponse updatePlan(UUID planId, BenefitPlanRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating benefit plan {} for tenant {}", planId, tenantId);

        BenefitPlan plan = benefitPlanRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Benefit plan not found"));

        plan.setPlanName(request.getPlanName());
        plan.setDescription(request.getDescription());
        plan.setBenefitType(request.getBenefitType());
        plan.setProviderId(request.getProviderId());
        plan.setCoverageAmount(request.getCoverageAmount());
        plan.setEmployeeContribution(request.getEmployeeContribution());
        plan.setEmployerContribution(request.getEmployerContribution());
        plan.setEffectiveDate(request.getEffectiveDate());
        plan.setExpiryDate(request.getExpiryDate());
        plan.setIsActive(request.getIsActive());
        plan.setEligibilityCriteria(request.getEligibilityCriteria());

        BenefitPlan updatedPlan = benefitPlanRepository.save(plan);
        return mapToResponse(updatedPlan);
    }

    @Transactional
    @Audited(action = AuditAction.STATUS_CHANGE, entityType = "BENEFIT_PLAN", description = "Activated benefit plan", entityIdParam = 0)
    public BenefitPlanResponse activatePlan(UUID planId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Activating benefit plan {} for tenant {}", planId, tenantId);

        BenefitPlan plan = benefitPlanRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Benefit plan not found"));

        plan.setIsActive(true);
        BenefitPlan updatedPlan = benefitPlanRepository.save(plan);
        return mapToResponse(updatedPlan);
    }

    @Transactional
    @Audited(action = AuditAction.STATUS_CHANGE, entityType = "BENEFIT_PLAN", description = "Deactivated benefit plan", entityIdParam = 0)
    public BenefitPlanResponse deactivatePlan(UUID planId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Deactivating benefit plan {} for tenant {}", planId, tenantId);

        BenefitPlan plan = benefitPlanRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Benefit plan not found"));

        plan.setIsActive(false);
        BenefitPlan updatedPlan = benefitPlanRepository.save(plan);
        return mapToResponse(updatedPlan);
    }

    @Transactional(readOnly = true)
    public BenefitPlanResponse getPlanById(UUID planId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BenefitPlan plan = benefitPlanRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Benefit plan not found"));
        return mapToResponse(plan);
    }

    @Transactional(readOnly = true)
    public Page<BenefitPlanResponse> getAllPlans(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return benefitPlanRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<BenefitPlanResponse> getActivePlans() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return benefitPlanRepository.findByTenantIdAndIsActive(tenantId, true).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BenefitPlanResponse> getPlansByType(BenefitPlan.BenefitType benefitType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return benefitPlanRepository.findByTenantIdAndBenefitType(tenantId, benefitType).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @Audited(action = AuditAction.DELETE, entityType = "BENEFIT_PLAN", description = "Deleted benefit plan", entityIdParam = 0)
    public void deletePlan(UUID planId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BenefitPlan plan = benefitPlanRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Benefit plan not found"));
        benefitPlanRepository.delete(plan);
    }

    private BenefitPlanResponse mapToResponse(BenefitPlan plan) {
        return BenefitPlanResponse.builder()
                .id(plan.getId())
                .tenantId(plan.getTenantId())
                .planCode(plan.getPlanCode())
                .planName(plan.getPlanName())
                .description(plan.getDescription())
                .benefitType(plan.getBenefitType())
                .providerId(plan.getProviderId())
                .providerName(null) // Provider entity not implemented - use BenefitPlanEnhanced for provider details
                .coverageAmount(plan.getCoverageAmount())
                .employeeContribution(plan.getEmployeeContribution())
                .employerContribution(plan.getEmployerContribution())
                .effectiveDate(plan.getEffectiveDate())
                .expiryDate(plan.getExpiryDate())
                .isActive(plan.getIsActive())
                .eligibilityCriteria(plan.getEligibilityCriteria())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .build();
    }
}
