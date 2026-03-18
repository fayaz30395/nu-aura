package com.hrms.application.organization.service;

import com.hrms.api.organization.dto.NineBoxDataResponse;
import com.hrms.api.organization.dto.SuccessionAnalyticsResponse;
import com.hrms.common.logging.Audited;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.domain.organization.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.organization.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrganizationService {

    private final OrganizationUnitRepository unitRepository;
    private final PositionRepository positionRepository;
    private final SuccessionPlanRepository planRepository;
    private final SuccessionCandidateRepository candidateRepository;
    private final TalentPoolRepository poolRepository;
    private final TalentPoolMemberRepository memberRepository;

    // ==================== Organization Unit Operations ====================

    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "ORGANIZATION_UNIT", description = "Created organization unit")
    public OrganizationUnit createUnit(OrganizationUnit unit) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (unitRepository.existsByCodeAndTenantId(unit.getCode(), tenantId)) {
            throw new BusinessException("Unit with code already exists: " + unit.getCode());
        }

        // Set hierarchy level and path
        if (unit.getParentId() != null) {
            OrganizationUnit parent = unitRepository.findByIdAndTenantId(unit.getParentId(), tenantId)
                    .orElseThrow(() -> new ResourceNotFoundException("Parent unit not found"));
            unit.setLevel(parent.getLevel() + 1);
            unit.setPath(parent.getPath() + "/" + unit.getCode());
        } else {
            unit.setLevel(0);
            unit.setPath(unit.getCode());
        }

        unit.setTenantId(tenantId);
        OrganizationUnit saved = unitRepository.save(unit);
        log.info("Organization unit created: {}", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public OrganizationUnit getUnitById(UUID unitId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return unitRepository.findByIdAndTenantId(unitId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Organization unit not found: " + unitId));
    }

    @Transactional(readOnly = true)
    public List<OrganizationUnit> getOrgChart() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return unitRepository.findRootUnits(tenantId);
    }

    @Transactional(readOnly = true)
    public List<OrganizationUnit> getChildUnits(UUID parentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return unitRepository.findByParent(tenantId, parentId);
    }

    @Transactional(readOnly = true)
    public List<OrganizationUnit> getAllActiveUnits() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return unitRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    // ==================== Position Operations ====================

    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "POSITION", description = "Created position")
    public Position createPosition(Position position) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (positionRepository.existsByCodeAndTenantId(position.getCode(), tenantId)) {
            throw new BusinessException("Position with code already exists: " + position.getCode());
        }

        position.setTenantId(tenantId);
        Position saved = positionRepository.save(position);
        log.info("Position created: {}", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public Position getPositionById(UUID positionId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return positionRepository.findByIdAndTenantId(positionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));
    }

    @Transactional(readOnly = true)
    public Page<Position> getAllPositions(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return positionRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Position> getCriticalPositions() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return positionRepository.findCriticalPositions(tenantId);
    }

    @Transactional(readOnly = true)
    public List<Position> getPositionsWithVacancies() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return positionRepository.findWithVacancies(tenantId);
    }

    // ==================== Succession Plan Operations ====================

    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "SUCCESSION_PLAN", description = "Created succession plan")
    public SuccessionPlan createSuccessionPlan(SuccessionPlan plan) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if active plan already exists for position
        Optional<SuccessionPlan> existing = planRepository.findByPositionIdAndTenantIdAndStatus(
                plan.getPositionId(), tenantId, SuccessionPlan.PlanStatus.ACTIVE);
        if (existing.isPresent()) {
            throw new BusinessException("Active succession plan already exists for this position");
        }

        plan.setTenantId(tenantId);
        SuccessionPlan saved = planRepository.save(plan);
        log.info("Succession plan created: {}", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public SuccessionPlan getSuccessionPlanById(UUID planId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findByIdAndTenantId(planId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Succession plan not found: " + planId));
    }

    @Transactional(readOnly = true)
    public Page<SuccessionPlan> getAllSuccessionPlans(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public List<SuccessionPlan> getActivePlans() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findActivePlans(tenantId);
    }

    @Transactional(readOnly = true)
    public List<SuccessionPlan> getHighRiskPlans() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return planRepository.findHighRiskPlans(tenantId);
    }

    // ==================== Succession Candidate Operations ====================

    @Transactional
    @Audited(action = AuditAction.CREATE, entityType = "SUCCESSION_CANDIDATE", description = "Added succession candidate")
    public SuccessionCandidate addCandidate(UUID planId, SuccessionCandidate candidate) {
        UUID tenantId = TenantContext.getCurrentTenant();

        if (candidateRepository.existsBySuccessionPlanIdAndCandidateId(planId, candidate.getCandidateId())) {
            throw new BusinessException("Candidate already exists in this plan");
        }

        candidate.setSuccessionPlanId(planId);
        candidate.setTenantId(tenantId);
        SuccessionCandidate saved = candidateRepository.save(candidate);
        log.info("Succession candidate added: {} to plan: {}", saved.getCandidateId(), planId);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<SuccessionCandidate> getCandidatesForPlan(UUID planId) {
        return candidateRepository.findByPlan(planId);
    }

    @Transactional(readOnly = true)
    public List<SuccessionCandidate> getReadyNowCandidates(UUID planId) {
        return candidateRepository.findReadyNowCandidates(planId);
    }

    @Transactional
    public void removeCandidate(UUID planId, UUID candidateId) {
        candidateRepository.deleteBySuccessionPlanIdAndCandidateId(planId, candidateId);
        log.info("Succession candidate removed: {} from plan: {}", candidateId, planId);
    }

    // ==================== Talent Pool Operations ====================

    @Transactional
    public TalentPool createTalentPool(TalentPool pool) {
        UUID tenantId = TenantContext.getCurrentTenant();
        pool.setTenantId(tenantId);
        TalentPool saved = poolRepository.save(pool);
        log.info("Talent pool created: {}", saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public TalentPool getTalentPoolById(UUID poolId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return poolRepository.findByIdAndTenantId(poolId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Talent pool not found: " + poolId));
    }

    @Transactional(readOnly = true)
    public List<TalentPool> getActiveTalentPools() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return poolRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }

    @Transactional
    public TalentPoolMember addToPool(UUID poolId, UUID employeeId, UUID addedBy) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TalentPool pool = poolRepository.findByIdAndTenantId(poolId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Talent pool not found: " + poolId));

        if (memberRepository.existsByTalentPoolIdAndEmployeeId(poolId, employeeId)) {
            throw new BusinessException("Employee already in this pool");
        }

        TalentPoolMember member = TalentPoolMember.builder()
                .talentPoolId(poolId)
                .employeeId(employeeId)
                .addedBy(addedBy)
                .addedDate(LocalDate.now())
                .status(TalentPoolMember.MemberStatus.ACTIVE)
                .build();
        member.setTenantId(tenantId);

        TalentPoolMember saved = memberRepository.save(member);
        pool.incrementMemberCount();
        poolRepository.save(pool);

        log.info("Employee added to talent pool: {} -> {}", employeeId, poolId);
        return saved;
    }

    @Transactional
    public void removeFromPool(UUID poolId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TalentPool pool = poolRepository.findByIdAndTenantId(poolId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Talent pool not found: " + poolId));

        TalentPoolMember member = memberRepository.findByTalentPoolIdAndEmployeeId(poolId, employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Member not found in pool"));

        member.setStatus(TalentPoolMember.MemberStatus.REMOVED);
        memberRepository.save(member);
        pool.decrementMemberCount();
        poolRepository.save(pool);

        log.info("Employee removed from talent pool: {} -> {}", employeeId, poolId);
    }

    @Transactional(readOnly = true)
    public List<TalentPoolMember> getPoolMembers(UUID poolId) {
        return memberRepository.findActiveByPool(poolId);
    }

    // ==================== Analytics ====================

    @Transactional(readOnly = true)
    public SuccessionAnalyticsResponse getSuccessionAnalytics() {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Plan counts
        long activePlans = planRepository.countActivePlans(tenantId);
        List<SuccessionPlan> highRiskPlans = planRepository.findHighRiskPlans(tenantId);

        // Critical positions
        List<Position> criticalPositions = positionRepository.findCriticalPositions(tenantId);
        long criticalWithoutPlan = criticalPositions.stream()
                .filter(p -> planRepository
                        .findByPositionIdAndTenantIdAndStatus(p.getId(), tenantId, SuccessionPlan.PlanStatus.ACTIVE)
                        .isEmpty())
                .count();

        // Readiness distribution
        List<Object[]> readinessDistribution = candidateRepository.countByReadiness(tenantId);
        Map<String, Integer> readinessMap = readinessDistribution.stream()
                .collect(Collectors.toMap(
                        r -> r[0].toString(),
                        r -> ((Long) r[1]).intValue()));

        // Talent pools
        List<TalentPool> pools = poolRepository.findByTenantIdAndIsActiveTrue(tenantId);
        int totalPoolMembers = pools.stream().mapToInt(TalentPool::getMemberCount).sum();

        return SuccessionAnalyticsResponse.builder()
                .activePlans(activePlans)
                .highRiskPlans(highRiskPlans.size())
                .criticalPositions(criticalPositions.size())
                .criticalWithoutPlan(criticalWithoutPlan)
                .readinessDistribution(readinessMap)
                .talentPools(pools.size())
                .totalPoolMembers(totalPoolMembers)
                .build();
    }

    @Transactional(readOnly = true)
    public NineBoxDataResponse getNineBoxData() {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Get all active candidates with performance and potential ratings
        List<SuccessionPlan> activePlans = planRepository.findActivePlans(tenantId);
        Map<String, Integer> nineBoxDistribution = new HashMap<>();

        for (SuccessionPlan plan : activePlans) {
            List<SuccessionCandidate> candidates = candidateRepository.findByPlan(plan.getId());
            for (SuccessionCandidate candidate : candidates) {
                String position = candidate.getNineBoxPosition();
                nineBoxDistribution.merge(position, 1, Integer::sum);
            }
        }

        return NineBoxDataResponse.builder()
                .distribution(nineBoxDistribution)
                .totalCandidates(nineBoxDistribution.values().stream().mapToInt(Integer::intValue).sum())
                .build();
    }
}
