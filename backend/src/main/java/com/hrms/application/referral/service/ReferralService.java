package com.hrms.application.referral.service;

import com.hrms.api.referral.dto.*;
import com.hrms.domain.referral.EmployeeReferral;
import com.hrms.domain.referral.EmployeeReferral.*;
import com.hrms.domain.referral.ReferralPolicy;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.referral.repository.EmployeeReferralRepository;
import com.hrms.infrastructure.referral.repository.ReferralPolicyRepository;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ReferralService {

    private final EmployeeReferralRepository referralRepository;
    private final ReferralPolicyRepository policyRepository;
    private final UserRepository userRepository;

    // ==================== Referral Submission ====================

    @Transactional
    public ReferralResponse submitReferral(UUID referrerId, ReferralRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Submitting referral for candidate {} by referrer {} tenant {}",
                request.getCandidateEmail(), referrerId, tenantId);

        // Check for duplicate candidate
        Optional<EmployeeReferral> existing = referralRepository.findByCandidateEmail(tenantId, request.getCandidateEmail());
        if (existing.isPresent()) {
            throw new IllegalArgumentException("Candidate with email " + request.getCandidateEmail() + " already referred");
        }

        // Check referrer eligibility
        validateReferrerEligibility(tenantId, referrerId, request.getDepartmentId());

        EmployeeReferral referral = new EmployeeReferral();
        referral.setTenantId(tenantId);
        referral.setReferrerId(referrerId);
        referral.setReferralCode(generateReferralCode());
        referral.setCandidateName(request.getCandidateName());
        referral.setCandidateEmail(request.getCandidateEmail());
        referral.setCandidatePhone(request.getCandidatePhone());
        referral.setCandidateLinkedin(request.getCandidateLinkedin());
        referral.setResumePath(request.getResumePath());
        referral.setJobId(request.getJobId());
        referral.setJobTitle(request.getJobTitle());
        referral.setDepartmentId(request.getDepartmentId());
        referral.setRelationship(request.getRelationship());
        referral.setKnownSince(request.getKnownSince());
        referral.setReferrerNotes(request.getReferrerNotes());
        referral.setStatus(ReferralStatus.SUBMITTED);
        referral.setSubmittedDate(LocalDate.now());
        referral.setBonusStatus(BonusStatus.NOT_ELIGIBLE);

        // Calculate bonus amount based on policy
        ReferralPolicy policy = findApplicablePolicy(tenantId, request.getDepartmentId());
        if (policy != null) {
            referral.setBonusAmount(policy.getBaseBonusAmount());
        }

        EmployeeReferral saved = referralRepository.save(referral);
        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public ReferralResponse getReferral(UUID referralId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeReferral referral = referralRepository.findByIdAndTenantId(referralId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Referral not found"));
        return mapToResponse(referral);
    }

    @Transactional(readOnly = true)
    public List<ReferralResponse> getMyReferrals(UUID referrerId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return referralRepository.findByReferrerIdAndTenantId(referrerId, tenantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ReferralResponse> getAllReferrals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return referralRepository.findByTenantId(tenantId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<ReferralResponse> getReferralsByStatus(ReferralStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return referralRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // ==================== Status Management ====================

    @Transactional
    public ReferralResponse updateStatus(UUID referralId, ReferralStatus newStatus, String notes) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeReferral referral = referralRepository.findByIdAndTenantId(referralId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Referral not found"));

        log.info("Updating referral {} status from {} to {}", referralId, referral.getStatus(), newStatus);

        referral.setStatus(newStatus);
        if (notes != null) {
            referral.setProcessingNotes(notes);
        }

        // Update stage-specific dates
        switch (newStatus) {
            case SCREENING -> referral.setScreeningDate(LocalDate.now());
            case INTERVIEW_SCHEDULED, INTERVIEW_COMPLETED -> referral.setInterviewDate(LocalDate.now());
            case OFFER_MADE, OFFER_ACCEPTED -> referral.setOfferDate(LocalDate.now());
            case JOINED -> {
                referral.setJoiningDate(LocalDate.now());
                referral.setBonusStatus(BonusStatus.PENDING_ELIGIBILITY);
                // Calculate eligibility date based on retention period
                ReferralPolicy policy = findApplicablePolicy(tenantId, referral.getDepartmentId());
                if (policy != null && policy.getRetentionPeriodMonths() != null) {
                    referral.setBonusEligibleDate(LocalDate.now().plusMonths(policy.getRetentionPeriodMonths()));
                } else {
                    referral.setBonusEligibleDate(LocalDate.now().plusMonths(6));
                }
            }
            default -> {}
        }

        return mapToResponse(referralRepository.save(referral));
    }

    @Transactional
    public ReferralResponse rejectReferral(UUID referralId, String reason, String stage) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeReferral referral = referralRepository.findByIdAndTenantId(referralId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Referral not found"));

        referral.setStatus(ReferralStatus.REJECTED);
        referral.setRejectionReason(reason);
        referral.setRejectionStage(stage);
        referral.setBonusStatus(BonusStatus.NOT_ELIGIBLE);

        return mapToResponse(referralRepository.save(referral));
    }

    public ReferralResponse linkToHiredEmployee(UUID referralId, UUID hiredEmployeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeReferral referral = referralRepository.findByIdAndTenantId(referralId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Referral not found"));

        referral.setHiredEmployeeId(hiredEmployeeId);
        referral.setStatus(ReferralStatus.JOINED);
        referral.setJoiningDate(LocalDate.now());
        referral.setBonusStatus(BonusStatus.PENDING_ELIGIBILITY);

        ReferralPolicy policy = findApplicablePolicy(tenantId, referral.getDepartmentId());
        if (policy != null && policy.getRetentionPeriodMonths() != null) {
            referral.setBonusEligibleDate(LocalDate.now().plusMonths(policy.getRetentionPeriodMonths()));
        }

        return mapToResponse(referralRepository.save(referral));
    }

    // ==================== Bonus Management ====================

    @Transactional
    public ReferralResponse processBonus(UUID referralId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeReferral referral = referralRepository.findByIdAndTenantId(referralId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Referral not found"));

        if (referral.getBonusStatus() != BonusStatus.ELIGIBLE) {
            throw new IllegalStateException("Referral is not eligible for bonus processing");
        }

        referral.setBonusStatus(BonusStatus.PROCESSING);
        return mapToResponse(referralRepository.save(referral));
    }

    @Transactional
    public ReferralResponse markBonusPaid(UUID referralId, String paymentReference) {
        UUID tenantId = TenantContext.getCurrentTenant();
        EmployeeReferral referral = referralRepository.findByIdAndTenantId(referralId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Referral not found"));

        referral.setBonusStatus(BonusStatus.PAID);
        referral.setBonusPaidDate(LocalDate.now());
        referral.setBonusPaymentReference(paymentReference);

        return mapToResponse(referralRepository.save(referral));
    }

    @Transactional(readOnly = true)
    public List<ReferralResponse> getBonusEligibleReferrals() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return referralRepository.findEligibleForBonus(tenantId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public void checkAndUpdateBonusEligibility() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        List<EmployeeReferral> dueForEligibility = referralRepository.findBonusEligibilityDue(tenantId, today);

        for (EmployeeReferral referral : dueForEligibility) {
            // Verify the hired employee is still employed
            if (referral.getHiredEmployeeId() != null) {
                // In a real implementation, check if employee is still active
                referral.setBonusStatus(BonusStatus.ELIGIBLE);
                referralRepository.save(referral);
                log.info("Referral {} marked as bonus eligible", referral.getId());
            }
        }
    }

    // ==================== Policy Management ====================

    @Transactional
    public ReferralPolicyResponse createPolicy(ReferralPolicyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating referral policy {} for tenant {}", request.getName(), tenantId);

        ReferralPolicy policy = new ReferralPolicy();
        policy.setTenantId(tenantId);
        policy.setName(request.getName());
        policy.setDescription(request.getDescription());
        policy.setApplicableFor(request.getApplicableFor());
        policy.setDepartmentId(request.getDepartmentId());
        policy.setJobLevel(request.getJobLevel());
        policy.setBaseBonusAmount(request.getBaseBonusAmount());

        if (request.getJoiningBonusPercentage() != null) {
            policy.setJoiningBonusPercentage(request.getJoiningBonusPercentage());
        }
        if (request.getRetentionBonusPercentage() != null) {
            policy.setRetentionBonusPercentage(request.getRetentionBonusPercentage());
        }
        if (request.getRetentionPeriodMonths() != null) {
            policy.setRetentionPeriodMonths(request.getRetentionPeriodMonths());
        }
        if (request.getMinServiceMonths() != null) {
            policy.setMinServiceMonths(request.getMinServiceMonths());
        }
        if (request.getProbationEligible() != null) {
            policy.setProbationEligible(request.getProbationEligible());
        }
        if (request.getMaxReferralsPerMonth() != null) {
            policy.setMaxReferralsPerMonth(request.getMaxReferralsPerMonth());
        }
        if (request.getSelfReferralAllowed() != null) {
            policy.setSelfReferralAllowed(request.getSelfReferralAllowed());
        }
        if (request.getSameDepartmentAllowed() != null) {
            policy.setSameDepartmentAllowed(request.getSameDepartmentAllowed());
        }

        policy.setEffectiveFrom(request.getEffectiveFrom());
        policy.setEffectiveTo(request.getEffectiveTo());
        policy.setIsActive(true);

        return mapToPolicyResponse(policyRepository.save(policy));
    }

    @Transactional
    public ReferralPolicyResponse updatePolicy(UUID policyId, ReferralPolicyRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ReferralPolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        policy.setName(request.getName());
        policy.setDescription(request.getDescription());
        policy.setApplicableFor(request.getApplicableFor());
        policy.setDepartmentId(request.getDepartmentId());
        policy.setJobLevel(request.getJobLevel());
        policy.setBaseBonusAmount(request.getBaseBonusAmount());
        policy.setJoiningBonusPercentage(request.getJoiningBonusPercentage());
        policy.setRetentionBonusPercentage(request.getRetentionBonusPercentage());
        policy.setRetentionPeriodMonths(request.getRetentionPeriodMonths());
        policy.setMinServiceMonths(request.getMinServiceMonths());
        policy.setProbationEligible(request.getProbationEligible());
        policy.setMaxReferralsPerMonth(request.getMaxReferralsPerMonth());
        policy.setSelfReferralAllowed(request.getSelfReferralAllowed());
        policy.setSameDepartmentAllowed(request.getSameDepartmentAllowed());
        policy.setEffectiveFrom(request.getEffectiveFrom());
        policy.setEffectiveTo(request.getEffectiveTo());

        return mapToPolicyResponse(policyRepository.save(policy));
    }

    @Transactional(readOnly = true)
    public ReferralPolicyResponse getPolicy(UUID policyId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ReferralPolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));
        return mapToPolicyResponse(policy);
    }

    @Transactional(readOnly = true)
    public List<ReferralPolicyResponse> getActivePolicies() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return policyRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(this::mapToPolicyResponse)
                .collect(Collectors.toList());
    }

    public ReferralPolicyResponse togglePolicyStatus(UUID policyId, boolean isActive) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ReferralPolicy policy = policyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Policy not found"));

        policy.setIsActive(isActive);
        return mapToPolicyResponse(policyRepository.save(policy));
    }

    // ==================== Dashboard & Analytics ====================

    @Transactional(readOnly = true)
    public ReferralDashboard getDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();

        ReferralDashboard dashboard = new ReferralDashboard();

        // Status counts
        Map<String, Long> statusCounts = new HashMap<>();
        for (ReferralStatus status : ReferralStatus.values()) {
            long count = referralRepository.countByStatus(tenantId, status);
            statusCounts.put(status.name(), count);
        }
        dashboard.setStatusCounts(statusCounts);

        // Summary stats
        long total = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        dashboard.setTotalReferrals(total);
        dashboard.setActiveReferrals((long) referralRepository.findActiveReferrals(tenantId).size());
        dashboard.setHiredReferrals(statusCounts.getOrDefault(ReferralStatus.JOINED.name(), 0L));
        dashboard.setRejectedReferrals(statusCounts.getOrDefault(ReferralStatus.REJECTED.name(), 0L));

        if (total > 0) {
            dashboard.setConversionRate((dashboard.getHiredReferrals() * 100.0) / total);
        }

        // Bonus stats
        List<EmployeeReferral> eligible = referralRepository.findEligibleForBonus(tenantId);
        dashboard.setPendingBonuses(eligible.stream()
                .map(EmployeeReferral::getBonusAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        dashboard.setBonusPaymentsPending((long) eligible.size());

        // Top referrers
        List<Object[]> topReferrersData = referralRepository.getTopReferrers(tenantId, PageRequest.of(0, 10));
        List<UUID> referrerIds = topReferrersData.stream()
                .map(row -> (UUID) row[0])
                .collect(Collectors.toList());
        Map<UUID, User> referrerMap = userRepository.findAllById(referrerIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<ReferralDashboard.TopReferrer> topReferrers = new ArrayList<>();
        for (Object[] row : topReferrersData) {
            UUID referrerId = (UUID) row[0];
            Long count = (Long) row[1];
            User referrer = referrerMap.get(referrerId);
            String name = referrer != null ? referrer.getFullName() : "Unknown";
            topReferrers.add(ReferralDashboard.TopReferrer.builder()
                    .employeeId(referrerId)
                    .employeeName(name)
                    .successfulHires(count)
                    .build());
        }
        dashboard.setTopReferrers(topReferrers);

        return dashboard;
    }

    // ==================== Helper Methods ====================

    private void validateReferrerEligibility(UUID tenantId, UUID referrerId, UUID departmentId) {
        ReferralPolicy policy = findApplicablePolicy(tenantId, departmentId);
        if (policy == null) {
            return; // No policy restrictions
        }

        // Check monthly limit
        if (policy.getMaxReferralsPerMonth() != null) {
            LocalDate now = LocalDate.now();
            long count = referralRepository.countReferralsByReferrerInMonth(
                    tenantId, referrerId, now.getMonthValue(), now.getYear());
            if (count >= policy.getMaxReferralsPerMonth()) {
                throw new IllegalStateException("Monthly referral limit reached");
            }
        }
    }

    private ReferralPolicy findApplicablePolicy(UUID tenantId, UUID departmentId) {
        // First try department-specific
        if (departmentId != null) {
            Optional<ReferralPolicy> deptPolicy = policyRepository.findByDepartment(tenantId, departmentId);
            if (deptPolicy.isPresent()) {
                return deptPolicy.get();
            }
        }
        // Fall back to default
        return policyRepository.findDefaultPolicy(tenantId).orElse(null);
    }

    private String generateReferralCode() {
        return "REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private ReferralResponse mapToResponse(EmployeeReferral referral) {
        String referrerName = null;
        if (referral.getReferrerId() != null) {
            referrerName = userRepository.findById(referral.getReferrerId())
                    .map(User::getFullName).orElse(null);
        }

        return ReferralResponse.builder()
                .id(referral.getId())
                .referrerId(referral.getReferrerId())
                .referrerName(referrerName)
                .referralCode(referral.getReferralCode())
                .candidateName(referral.getCandidateName())
                .candidateEmail(referral.getCandidateEmail())
                .candidatePhone(referral.getCandidatePhone())
                .candidateLinkedin(referral.getCandidateLinkedin())
                .resumePath(referral.getResumePath())
                .jobId(referral.getJobId())
                .jobTitle(referral.getJobTitle())
                .departmentId(referral.getDepartmentId())
                .relationship(referral.getRelationship())
                .knownSince(referral.getKnownSince())
                .referrerNotes(referral.getReferrerNotes())
                .status(referral.getStatus())
                .submittedDate(referral.getSubmittedDate())
                .screeningDate(referral.getScreeningDate())
                .interviewDate(referral.getInterviewDate())
                .offerDate(referral.getOfferDate())
                .joiningDate(referral.getJoiningDate())
                .hiredEmployeeId(referral.getHiredEmployeeId())
                .rejectionReason(referral.getRejectionReason())
                .rejectionStage(referral.getRejectionStage())
                .bonusAmount(referral.getBonusAmount())
                .bonusStatus(referral.getBonusStatus())
                .bonusEligibleDate(referral.getBonusEligibleDate())
                .bonusPaidDate(referral.getBonusPaidDate())
                .bonusPaymentReference(referral.getBonusPaymentReference())
                .processingNotes(referral.getProcessingNotes())
                .createdAt(referral.getCreatedAt())
                .updatedAt(referral.getUpdatedAt())
                .build();
    }

    private ReferralPolicyResponse mapToPolicyResponse(ReferralPolicy policy) {
        return ReferralPolicyResponse.builder()
                .id(policy.getId())
                .name(policy.getName())
                .description(policy.getDescription())
                .applicableFor(policy.getApplicableFor())
                .departmentId(policy.getDepartmentId())
                .jobLevel(policy.getJobLevel())
                .baseBonusAmount(policy.getBaseBonusAmount())
                .joiningBonusPercentage(policy.getJoiningBonusPercentage())
                .retentionBonusPercentage(policy.getRetentionBonusPercentage())
                .retentionPeriodMonths(policy.getRetentionPeriodMonths())
                .minServiceMonths(policy.getMinServiceMonths())
                .probationEligible(policy.getProbationEligible())
                .maxReferralsPerMonth(policy.getMaxReferralsPerMonth())
                .selfReferralAllowed(policy.getSelfReferralAllowed())
                .sameDepartmentAllowed(policy.getSameDepartmentAllowed())
                .isActive(policy.getIsActive())
                .effectiveFrom(policy.getEffectiveFrom())
                .effectiveTo(policy.getEffectiveTo())
                .createdAt(policy.getCreatedAt())
                .updatedAt(policy.getUpdatedAt())
                .build();
    }
}
