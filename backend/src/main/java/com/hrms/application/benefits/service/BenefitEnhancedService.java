package com.hrms.application.benefits.service;

import com.hrms.api.benefits.dto.*;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.benefits.*;
import com.hrms.infrastructure.benefits.repository.*;
import com.hrms.infrastructure.kafka.producer.EventPublisher;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BenefitEnhancedService {

    private static final BigDecimal ONE_HUNDRED = BigDecimal.valueOf(100);

    private final BenefitPlanEnhancedRepository planRepository;
    private final BenefitEnrollmentRepository enrollmentRepository;
    private final BenefitDependentRepository dependentRepository;
    private final BenefitClaimRepository claimRepository;
    private final FlexBenefitAllocationRepository flexAllocationRepository;
    private final EventPublisher eventPublisher;
    private final AuditLogService auditLogService;

    // ==================== BENEFIT PLANS ====================

    @Transactional
    public BenefitPlanEnhancedResponse createPlan(BenefitPlanEnhancedRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitPlanEnhanced plan = BenefitPlanEnhanced.builder()
                .name(request.getName())
                .description(request.getDescription())
                .planType(request.getPlanType())
                .category(request.getCategory())
                .providerName(request.getProviderName())
                .providerCode(request.getProviderCode())
                .policyNumber(request.getPolicyNumber())
                .coverageAmount(request.getCoverageAmount())
                .sumInsured(request.getSumInsured())
                .premiumAmount(request.getPremiumAmount())
                .premiumFrequency(request.getPremiumFrequency())
                .employerContribution(request.getEmployerContribution())
                .employeeContribution(request.getEmployeeContribution())
                .employerContributionPercentage(request.getEmployerContributionPercentage())
                .employeeContributionPercentage(request.getEmployeeContributionPercentage())
                .waitingPeriodDays(request.getWaitingPeriodDays() != null ? request.getWaitingPeriodDays() : 0)
                .minServiceMonths(request.getMinServiceMonths() != null ? request.getMinServiceMonths() : 0)
                .eligibleGrades(request.getEligibleGrades())
                .eligibleDepartments(request.getEligibleDepartments())
                .dependentsCovered(Boolean.TRUE.equals(request.getDependentsCovered()))
                .maxDependents(request.getMaxDependents() != null ? request.getMaxDependents() : 0)
                .maternityBenefits(Boolean.TRUE.equals(request.getMaternityBenefits()))
                .maternityCoverage(request.getMaternityCoverage())
                .preExistingCovered(Boolean.TRUE.equals(request.getPreExistingCovered()))
                .preExistingWaitingYears(request.getPreExistingWaitingYears() != null ? request.getPreExistingWaitingYears() : 0)
                .roomRentLimit(request.getRoomRentLimit())
                .copayPercentage(request.getCopayPercentage())
                .deductibleAmount(request.getDeductibleAmount())
                .networkHospitalsOnly(Boolean.TRUE.equals(request.getNetworkHospitalsOnly()))
                .annualWellnessAllowance(request.getAnnualWellnessAllowance())
                .gymMembershipIncluded(Boolean.TRUE.equals(request.getGymMembershipIncluded()))
                .mentalHealthSupport(Boolean.TRUE.equals(request.getMentalHealthSupport()))
                .counselingSessionsPerYear(request.getCounselingSessionsPerYear() != null ? request.getCounselingSessionsPerYear() : 0)
                .employerMatchPercentage(request.getEmployerMatchPercentage())
                .vestingPeriodYears(request.getVestingPeriodYears())
                .maxContributionLimit(request.getMaxContributionLimit())
                .isFlexible(Boolean.TRUE.equals(request.getIsFlexible()))
                .flexCreditsProvided(request.getFlexCreditsProvided())
                .flexibleOptions(request.getFlexibleOptions())
                .effectiveFrom(request.getEffectiveFrom())
                .effectiveTo(request.getEffectiveTo())
                .isActive(request.getIsActive() == null || request.getIsActive())
                .cobraEligible(Boolean.TRUE.equals(request.getCobraEligible()))
                .cobraContinuationMonths(request.getCobraContinuationMonths() != null ? request.getCobraContinuationMonths() : 0)
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        plan.setTenantId(tenantId);
        plan = planRepository.save(plan);

        log.info("Created benefit plan: {} for tenant: {}", plan.getId(), tenantId);
        return BenefitPlanEnhancedResponse.from(plan);
    }

    @Transactional
    public BenefitPlanEnhancedResponse updatePlan(UUID planId, BenefitPlanEnhancedRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitPlanEnhanced plan = planRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Benefit plan not found: " + planId));

        // Update all fields
        plan.setName(request.getName());
        plan.setDescription(request.getDescription());
        plan.setPlanType(request.getPlanType());
        plan.setCategory(request.getCategory());
        plan.setProviderName(request.getProviderName());
        plan.setProviderCode(request.getProviderCode());
        plan.setPolicyNumber(request.getPolicyNumber());
        plan.setCoverageAmount(request.getCoverageAmount());
        plan.setSumInsured(request.getSumInsured());
        plan.setPremiumAmount(request.getPremiumAmount());
        plan.setPremiumFrequency(request.getPremiumFrequency());
        plan.setEmployerContribution(request.getEmployerContribution());
        plan.setEmployeeContribution(request.getEmployeeContribution());
        if (request.getWaitingPeriodDays() != null) plan.setWaitingPeriodDays(request.getWaitingPeriodDays());
        if (request.getMinServiceMonths() != null) plan.setMinServiceMonths(request.getMinServiceMonths());
        plan.setEligibleGrades(request.getEligibleGrades());
        plan.setEligibleDepartments(request.getEligibleDepartments());
        if (request.getDependentsCovered() != null) plan.setDependentsCovered(request.getDependentsCovered());
        if (request.getMaxDependents() != null) plan.setMaxDependents(request.getMaxDependents());
        if (request.getIsActive() != null) plan.setActive(request.getIsActive());
        plan.setEffectiveFrom(request.getEffectiveFrom());
        plan.setEffectiveTo(request.getEffectiveTo());
        // updatedBy is handled by JPA auditing via @LastModifiedBy in BaseEntity

        plan = planRepository.save(plan);
        return BenefitPlanEnhancedResponse.from(plan);
    }

    @Transactional(readOnly = true)
    public Page<BenefitPlanEnhancedResponse> getAllPlans(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findByTenantId(tenantId, pageable)
                .map(BenefitPlanEnhancedResponse::from);
    }

    @Transactional(readOnly = true)
    public BenefitPlanEnhancedResponse getPlan(UUID planId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BenefitPlanEnhanced plan = planRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Benefit plan not found: " + planId));
        return BenefitPlanEnhancedResponse.from(plan);
    }

    @Transactional(readOnly = true)
    public List<BenefitPlanEnhancedResponse> getActivePlans() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(BenefitPlanEnhancedResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BenefitPlanEnhancedResponse> getPlansByType(BenefitPlanEnhanced.PlanType planType) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findByTenantIdAndPlanType(tenantId, planType).stream()
                .map(BenefitPlanEnhancedResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BenefitPlanEnhancedResponse> getPlansByCategory(BenefitPlanEnhanced.PlanCategory category) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findByTenantIdAndCategory(tenantId, category).stream()
                .map(BenefitPlanEnhancedResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BenefitPlanEnhancedResponse> getEligiblePlansForEmployee(String grade) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findEligiblePlansForGrade(tenantId, grade).stream()
                .map(BenefitPlanEnhancedResponse::from)
                .collect(Collectors.toList());
    }

    // ==================== ENROLLMENTS ====================

    public EnrollmentResponse enrollEmployee(EnrollmentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        // Check for existing enrollment
        Optional<BenefitEnrollment> existing = enrollmentRepository.findExistingEnrollment(
                tenantId, request.getEmployeeId(), request.getBenefitPlanId());
        if (existing.isPresent()) {
            throw new IllegalStateException("Employee already has an active enrollment in this plan");
        }

        BenefitPlanEnhanced plan = planRepository.findByIdAndTenantId(request.getBenefitPlanId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Benefit plan not found"));

        // Calculate costs
        BigDecimal employeeContrib = request.getEmployeeContribution() != null ?
                request.getEmployeeContribution() : plan.getEmployeeContribution();
        BigDecimal employerContrib = request.getEmployerContribution() != null ?
                request.getEmployerContribution() : plan.getEmployerContribution();
        BigDecimal totalPremium = (employeeContrib != null ? employeeContrib : BigDecimal.ZERO)
                .add(employerContrib != null ? employerContrib : BigDecimal.ZERO);

        // Calculate out of pocket (after flex credits)
        BigDecimal flexCreditsUsed = request.getFlexCreditsUsed() != null ? request.getFlexCreditsUsed() : BigDecimal.ZERO;
        BigDecimal outOfPocket = employeeContrib != null ?
                employeeContrib.subtract(flexCreditsUsed).max(BigDecimal.ZERO) : BigDecimal.ZERO;

        BenefitEnrollment enrollment = BenefitEnrollment.builder()
                .benefitPlan(plan)
                .employeeId(request.getEmployeeId())
                .status(BenefitEnrollment.EnrollmentStatus.PENDING)
                .coverageLevel(request.getCoverageLevel())
                .enrollmentDate(LocalDate.now())
                .effectiveDate(request.getEffectiveDate() != null ? request.getEffectiveDate() : LocalDate.now())
                .employeeContribution(employeeContrib)
                .employerContribution(employerContrib)
                .totalPremium(totalPremium)
                .flexCreditsUsed(flexCreditsUsed)
                .outOfPocketCost(outOfPocket)
                .selectedOptions(request.getSelectedOptions())
                .nomineeDetails(request.getNomineeDetails())
                .currentCoverage(plan.getSumInsured())
                .claimsUtilized(BigDecimal.ZERO)
                .remainingCoverage(plan.getSumInsured())
                .waived(request.isWaived())
                .waiverReason(request.getWaiverReason())
                .waiverDate(request.isWaived() ? LocalDate.now() : null)
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        enrollment.setTenantId(tenantId);

        // Handle waiver
        if (request.isWaived()) {
            enrollment.setStatus(BenefitEnrollment.EnrollmentStatus.WAIVED);
        }

        enrollment = enrollmentRepository.save(enrollment);

        // Add dependents if provided
        if (request.getDependents() != null && !request.getDependents().isEmpty()) {
            for (EnrollmentRequest.DependentRequest depReq : request.getDependents()) {
                addDependentToEnrollment(enrollment, depReq);
            }
        }

        // Deduct flex credits if used
        if (flexCreditsUsed.compareTo(BigDecimal.ZERO) > 0) {
            deductFlexCredits(request.getEmployeeId(), flexCreditsUsed);
        }

        log.info("Created enrollment: {} for employee: {}", enrollment.getId(), request.getEmployeeId());

        try { auditLogService.logAction("BENEFIT_ENROLLMENT", enrollment.getId(), AuditAction.CREATE, null, null, "Benefit enrollment created for employee " + request.getEmployeeId()); } catch (Exception e) { log.warn("Audit log failed for benefit enrollment create: {}", e.getMessage()); }

        // Publish audit event for enrollment creation (best-effort)
        publishBenefitAuditEvent(currentUser, "CREATE", "BenefitEnrollment", enrollment.getId(),
                tenantId, "Enrollment created for employee " + request.getEmployeeId() + " in plan " + request.getBenefitPlanId());

        return EnrollmentResponse.from(enrollment);
    }

    private void addDependentToEnrollment(BenefitEnrollment enrollment, EnrollmentRequest.DependentRequest request) {
        BenefitDependent dependent = BenefitDependent.builder()
                .enrollment(enrollment)
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .relationship(BenefitDependent.Relationship.valueOf(request.getRelationship()))
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .nationalId(request.getNationalId())
                .phone(request.getPhone())
                .email(request.getEmail())
                .address(request.getAddress())
                .city(request.getCity())
                .state(request.getState())
                .postalCode(request.getPostalCode())
                .country(request.getCountry())
                .isCovered(true)
                .coverageStartDate(enrollment.getEffectiveDate())
                .hasPreExistingConditions(request.isHasPreExistingConditions())
                .preExistingConditions(request.getPreExistingConditions())
                .status(BenefitDependent.DependentStatus.PENDING_VERIFICATION)
                .build();

        dependent.setTenantId(enrollment.getTenantId());
        enrollment.addDependent(dependent);
    }

    @Transactional
    public EnrollmentResponse approveEnrollment(UUID enrollmentId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        BenefitEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        enrollment.setStatus(BenefitEnrollment.EnrollmentStatus.APPROVED);
        enrollment.setApprovedBy(currentUser);
        enrollment.setApprovedAt(LocalDateTime.now());
        enrollment.setApprovalComments(comments);

        enrollment = enrollmentRepository.save(enrollment);

        try { auditLogService.logAction("BENEFIT_ENROLLMENT", enrollment.getId(), AuditAction.APPROVE, null, null, "Benefit enrollment approved: " + comments); } catch (Exception e) { log.warn("Audit log failed for benefit enrollment approve: {}", e.getMessage()); }

        return EnrollmentResponse.from(enrollment);
    }

    public EnrollmentResponse activateEnrollment(UUID enrollmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        enrollment.activate();

        // Generate membership ID
        enrollment.setMembershipId("MEM-" + enrollment.getId().toString().substring(0, 8).toUpperCase());

        enrollment = enrollmentRepository.save(enrollment);
        return EnrollmentResponse.from(enrollment);
    }

    public EnrollmentResponse terminateEnrollment(UUID enrollmentId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        enrollment.terminate(reason);
        enrollment = enrollmentRepository.save(enrollment);
        return EnrollmentResponse.from(enrollment);
    }

    public EnrollmentResponse startCobra(UUID enrollmentId, BigDecimal cobraPremium, int months) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        if (!enrollment.getBenefitPlan().isCobraEligible()) {
            throw new IllegalStateException("This plan is not COBRA eligible");
        }

        enrollment.startCobra();
        enrollment.setCobraPremium(cobraPremium);
        enrollment.setCobraEndDate(LocalDate.now().plusMonths(months));

        enrollment = enrollmentRepository.save(enrollment);
        return EnrollmentResponse.from(enrollment);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getEmployeeEnrollments(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(EnrollmentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getActiveEnrollmentsForEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentRepository.findActiveEnrollmentsForEmployee(tenantId, employeeId).stream()
                .map(EnrollmentResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getPendingEnrollments() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentRepository.findPendingEnrollments(tenantId).stream()
                .map(EnrollmentResponse::from)
                .collect(Collectors.toList());
    }

    // ==================== CLAIMS ====================

    @Transactional
    public ClaimResponse submitClaim(ClaimRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        BenefitEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(request.getEnrollmentId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Enrollment not found"));

        if (enrollment.getStatus() != BenefitEnrollment.EnrollmentStatus.ACTIVE &&
            enrollment.getStatus() != BenefitEnrollment.EnrollmentStatus.COBRA_CONTINUATION) {
            throw new IllegalStateException("Enrollment is not active");
        }

        // Set claimant info
        String claimantName = null;
        String claimantRelationship = null;
        if (request.getDependentId() != null) {
            BenefitDependent dependent = dependentRepository.findByIdAndTenantId(request.getDependentId(), tenantId)
                    .orElseThrow(() -> new EntityNotFoundException("Dependent not found"));
            claimantName = dependent.getFirstName() + " " + dependent.getLastName();
            claimantRelationship = dependent.getRelationship().name();
        }

        BenefitClaim claim = BenefitClaim.builder()
                .enrollment(enrollment)
                .employeeId(enrollment.getEmployeeId())
                .claimType(request.getClaimType())
                .status(BenefitClaim.ClaimStatus.DRAFT)
                .description(request.getDescription())
                .serviceDate(request.getServiceDate())
                .diagnosisCode(request.getDiagnosisCode())
                .procedureCode(request.getProcedureCode())
                .providerName(request.getProviderName())
                .providerType(request.getProviderType())
                .hospitalName(request.getHospitalName())
                .isHospitalization(request.isHospitalization())
                .admissionDate(request.getAdmissionDate())
                .dischargeDate(request.getDischargeDate())
                .numberOfDays(request.getNumberOfDays() != null ? request.getNumberOfDays() : 0)
                .dependentId(request.getDependentId())
                .claimantName(claimantName)
                .claimantRelationship(claimantRelationship)
                .claimedAmount(request.getClaimedAmount())
                .preAuthorizationRequired(request.isPreAuthorizationRequired())
                .preAuthorizationNumber(request.getPreAuthorizationNumber())
                .documentUrls(request.getDocumentUrls() != null ? new ArrayList<>(request.getDocumentUrls()) : new ArrayList<>())
                .billNumber(request.getBillNumber())
                .prescriptionNumber(request.getPrescriptionNumber())
                .paymentMode(request.getPaymentMode())
                .bankAccountNumber(request.getBankAccountNumber())
                .ifscCode(request.getIfscCode())
                .upiId(request.getUpiId())
                // createdBy is handled by @CreatedBy in BaseEntity via JPA auditing
                .build();

        claim.setTenantId(tenantId);
        claim.submit();

        claim = claimRepository.save(claim);

        log.info("Submitted claim: {} for enrollment: {}", claim.getId(), enrollment.getId());

        // Publish audit event for claim submission (best-effort)
        publishBenefitAuditEvent(currentUser, "CREATE", "BenefitClaim", claim.getId(),
                tenantId, "Claim submitted for enrollment " + enrollment.getId() + ", amount: " + request.getClaimedAmount());

        return ClaimResponse.from(claim);
    }

    @Transactional
    public ClaimResponse processClaim(UUID claimId, BigDecimal approvedAmount, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        BenefitClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found"));

        // Calculate deductibles and copay
        BenefitPlanEnhanced plan = claim.getEnrollment().getBenefitPlan();
        BigDecimal deductible = plan.getDeductibleAmount() != null ? plan.getDeductibleAmount() : BigDecimal.ZERO;
        BigDecimal copayPct = plan.getCopayPercentage() != null ? plan.getCopayPercentage() : BigDecimal.ZERO;

        BigDecimal afterDeductible = claim.getClaimedAmount().subtract(deductible).max(BigDecimal.ZERO);
        BigDecimal copayAmount = afterDeductible.multiply(copayPct).divide(ONE_HUNDRED, 2, java.math.RoundingMode.HALF_UP);
        BigDecimal eligibleAmount = afterDeductible.subtract(copayAmount);

        claim.setEligibleAmount(eligibleAmount);
        claim.setDeductibleApplied(deductible);
        claim.setCopayAmount(copayAmount);

        claim.approve(approvedAmount.min(eligibleAmount), currentUser, comments);

        if (approvedAmount.compareTo(claim.getClaimedAmount()) < 0) {
            claim.setRejectedAmount(claim.getClaimedAmount().subtract(approvedAmount));
        }

        // Update enrollment coverage utilization
        BenefitEnrollment enrollment = claim.getEnrollment();
        BigDecimal currentUtilized = enrollment.getClaimsUtilized() != null ?
                enrollment.getClaimsUtilized() : BigDecimal.ZERO;
        enrollment.setClaimsUtilized(currentUtilized.add(approvedAmount));
        enrollment.setRemainingCoverage(
                enrollment.getCurrentCoverage().subtract(enrollment.getClaimsUtilized()));
        enrollmentRepository.save(enrollment);

        claim = claimRepository.save(claim);

        // Publish audit event for claim approval (best-effort)
        publishBenefitAuditEvent(currentUser, "APPROVE", "BenefitClaim", claim.getId(),
                tenantId, "Claim approved, amount: " + approvedAmount + ", comments: " + comments);

        return ClaimResponse.from(claim);
    }

    @Transactional
    public ClaimResponse rejectClaim(UUID claimId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUser = SecurityContext.getCurrentUserId();

        BenefitClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found"));

        claim.reject(reason, currentUser);
        claim = claimRepository.save(claim);

        // Publish audit event for claim rejection (best-effort)
        publishBenefitAuditEvent(currentUser, "REJECT", "BenefitClaim", claim.getId(),
                tenantId, "Claim rejected, reason: " + reason);

        return ClaimResponse.from(claim);
    }

    public ClaimResponse initiateClaimPayment(UUID claimId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found"));

        if (claim.getStatus() != BenefitClaim.ClaimStatus.APPROVED &&
            claim.getStatus() != BenefitClaim.ClaimStatus.PARTIALLY_APPROVED) {
            throw new IllegalStateException("Claim is not approved");
        }

        claim.initiatePayment();
        claim = claimRepository.save(claim);
        return ClaimResponse.from(claim);
    }

    public ClaimResponse completeClaimPayment(UUID claimId, String paymentReference) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found"));

        claim.completePayment(paymentReference);
        claim = claimRepository.save(claim);
        return ClaimResponse.from(claim);
    }

    public ClaimResponse appealClaim(UUID claimId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BenefitClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found"));

        if (claim.getStatus() != BenefitClaim.ClaimStatus.REJECTED &&
            claim.getStatus() != BenefitClaim.ClaimStatus.PARTIALLY_APPROVED) {
            throw new IllegalStateException("Only rejected or partially approved claims can be appealed");
        }

        claim.setAppealed(true);
        claim.setAppealReason(reason);
        claim.setAppealDate(LocalDate.now());
        claim.setStatus(BenefitClaim.ClaimStatus.APPEALED);

        claim = claimRepository.save(claim);
        return ClaimResponse.from(claim);
    }

    @Transactional(readOnly = true)
    public Page<ClaimResponse> getEmployeeClaims(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return claimRepository.findByTenantIdAndEmployeeId(tenantId, employeeId, pageable)
                .map(ClaimResponse::from);
    }

    @Transactional(readOnly = true)
    public List<ClaimResponse> getPendingClaims() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return claimRepository.findPendingClaims(tenantId).stream()
                .map(ClaimResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ClaimResponse getClaim(UUID claimId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BenefitClaim claim = claimRepository.findByIdAndTenantId(claimId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Claim not found"));
        return ClaimResponse.from(claim);
    }

    // ==================== FLEX BENEFITS ====================

    @Transactional
    public FlexAllocationResponse createFlexAllocation(FlexAllocationRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if allocation already exists
        Optional<FlexBenefitAllocation> existing = flexAllocationRepository
                .findByTenantIdAndEmployeeIdAndFiscalYear(tenantId, request.getEmployeeId(), request.getFiscalYear());
        if (existing.isPresent()) {
            throw new IllegalStateException("Flex allocation already exists for this employee and fiscal year");
        }

        FlexBenefitAllocation allocation = FlexBenefitAllocation.builder()
                .employeeId(request.getEmployeeId())
                .fiscalYear(request.getFiscalYear())
                .totalCredits(request.getTotalCredits())
                .usedCredits(BigDecimal.ZERO)
                .remainingCredits(request.getTotalCredits())
                .healthAllocation(request.getHealthAllocation())
                .healthUsed(BigDecimal.ZERO)
                .wellnessAllocation(request.getWellnessAllocation())
                .wellnessUsed(BigDecimal.ZERO)
                .lifestyleAllocation(request.getLifestyleAllocation())
                .lifestyleUsed(BigDecimal.ZERO)
                .retirementAllocation(request.getRetirementAllocation())
                .retirementUsed(BigDecimal.ZERO)
                .educationAllocation(request.getEducationAllocation())
                .educationUsed(BigDecimal.ZERO)
                .transportAllocation(request.getTransportAllocation())
                .transportUsed(BigDecimal.ZERO)
                .allocationDate(request.getAllocationDate() != null ? request.getAllocationDate() : LocalDate.now())
                .expiryDate(request.getExpiryDate())
                .carryoverAmount(request.getCarryoverAmount())
                .carryoverFromYear(request.getCarryoverFromYear() != null ? request.getCarryoverFromYear() : 0)
                .status(FlexBenefitAllocation.AllocationStatus.ACTIVE)
                // createdBy is handled by JPA auditing via @CreatedBy in BaseEntity
                .build();

        // Add carryover to total if present
        if (request.getCarryoverAmount() != null && request.getCarryoverAmount().compareTo(BigDecimal.ZERO) > 0) {
            allocation.setTotalCredits(allocation.getTotalCredits().add(request.getCarryoverAmount()));
            allocation.setRemainingCredits(allocation.getTotalCredits());
        }

        allocation.setTenantId(tenantId);
        allocation = flexAllocationRepository.save(allocation);

        log.info("Created flex allocation: {} for employee: {}", allocation.getId(), request.getEmployeeId());
        return FlexAllocationResponse.from(allocation);
    }

    @Transactional(readOnly = true)
    public FlexAllocationResponse getActiveFlexAllocation(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FlexBenefitAllocation allocation = flexAllocationRepository.findActiveAllocation(tenantId, employeeId)
                .orElseThrow(() -> new EntityNotFoundException("No active flex allocation found"));
        return FlexAllocationResponse.from(allocation);
    }

    @Transactional(readOnly = true)
    public List<FlexAllocationResponse> getFlexAllocationHistory(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return flexAllocationRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(FlexAllocationResponse::from)
                .collect(Collectors.toList());
    }

    private void deductFlexCredits(UUID employeeId, BigDecimal amount) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FlexBenefitAllocation allocation = flexAllocationRepository.findActiveAllocation(tenantId, employeeId)
                .orElseThrow(() -> new EntityNotFoundException("No active flex allocation found"));

        allocation.useCredits(amount);
        flexAllocationRepository.save(allocation);
    }

    // ==================== KAFKA EVENT PUBLISHING ====================

    /**
     * Publishes an audit event for benefit operations. Best-effort: logs errors
     * but never fails the business operation.
     */
    private void publishBenefitAuditEvent(UUID userId, String action, String entityType,
            UUID entityId, UUID tenantId, String description) {
        try {
            eventPublisher.publishAuditEvent(
                    userId, action, entityType, entityId, tenantId,
                    null, null, null, null, null, null, null, null,
                    description);
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.warn("Failed to publish benefit audit event (action={}, entityId={}): {}",
                    action, entityId, e.getMessage());
        }
    }

    // ==================== ANALYTICS ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getBenefitsDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = new HashMap<>();

        // Plan statistics
        long activePlans = planRepository.countActivePlans(tenantId);
        dashboard.put("activePlans", activePlans);
        dashboard.put("plansByType", planRepository.countPlansByType(tenantId));

        // Enrollment statistics
        dashboard.put("enrollmentsByStatus", enrollmentRepository.countEnrollmentsByStatus(tenantId));
        dashboard.put("enrollmentsByPlanType", enrollmentRepository.countActiveEnrollmentsByPlanType(tenantId));

        // Claims statistics
        dashboard.put("claimsByStatus", claimRepository.countClaimsByStatus(tenantId));
        dashboard.put("claimsSummaryByType", claimRepository.getClaimsSummaryByType(tenantId));
        dashboard.put("monthlyClaimsTrend", claimRepository.getMonthlyClaimsTrend(tenantId, LocalDate.now().getYear()));

        // Pending items
        dashboard.put("pendingEnrollments", enrollmentRepository.findPendingEnrollments(tenantId).size());
        dashboard.put("pendingClaims", claimRepository.findPendingClaims(tenantId).size());
        dashboard.put("claimsPendingPayment", claimRepository.findApprovedClaimsPendingPayment(tenantId).size());

        return dashboard;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getEmployeeBenefitsSummary(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> summary = new HashMap<>();

        // Active enrollments
        List<BenefitEnrollment> enrollments = enrollmentRepository.findActiveEnrollmentsForEmployee(tenantId, employeeId);
        summary.put("activeEnrollments", enrollments.stream()
                .map(EnrollmentResponse::from)
                .collect(Collectors.toList()));

        // Total contributions
        BigDecimal employeeTotal = enrollmentRepository.calculateTotalEmployeeContribution(tenantId, employeeId);
        BigDecimal employerTotal = enrollmentRepository.calculateTotalEmployerContribution(tenantId, employeeId);
        summary.put("totalEmployeeContribution", employeeTotal);
        summary.put("totalEmployerContribution", employerTotal);

        // Flex credits
        flexAllocationRepository.findActiveAllocation(tenantId, employeeId)
                .ifPresent(fa -> summary.put("flexAllocation", FlexAllocationResponse.from(fa)));

        // Dependents
        List<BenefitDependent> dependents = dependentRepository.findCoveredDependentsForEmployee(tenantId, employeeId);
        summary.put("coveredDependents", dependents.size());

        // Claims summary
        int currentYear = LocalDate.now().getYear();
        List<BenefitClaim> claims = claimRepository.findByTenantIdAndEmployeeId(tenantId, employeeId);
        long pendingClaims = claims.stream()
                .filter(c -> c.getStatus() == BenefitClaim.ClaimStatus.SUBMITTED ||
                             c.getStatus() == BenefitClaim.ClaimStatus.UNDER_REVIEW)
                .count();
        BigDecimal totalClaimsThisYear = claims.stream()
                .filter(c -> c.getServiceDate() != null && c.getServiceDate().getYear() == currentYear)
                .filter(c -> c.getApprovedAmount() != null)
                .map(BenefitClaim::getApprovedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        summary.put("pendingClaims", pendingClaims);
        summary.put("totalClaimsThisYear", totalClaimsThisYear);

        return summary;
    }
}
