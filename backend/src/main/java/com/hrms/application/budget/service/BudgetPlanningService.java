package com.hrms.application.budget.service;

import com.hrms.api.budget.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.budget.BudgetScenario;
import com.hrms.domain.budget.HeadcountBudget;
import com.hrms.domain.budget.HeadcountPosition;
import com.hrms.infrastructure.budget.repository.BudgetScenarioRepository;
import com.hrms.infrastructure.budget.repository.HeadcountBudgetRepository;
import com.hrms.infrastructure.budget.repository.HeadcountPositionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class BudgetPlanningService {

    private final HeadcountBudgetRepository budgetRepository;
    private final HeadcountPositionRepository positionRepository;
    private final BudgetScenarioRepository scenarioRepository;

    // ==================== BUDGET OPERATIONS ====================

    @Transactional
    public HeadcountBudgetResponse createBudget(HeadcountBudgetRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = HeadcountBudget.builder()
                .budgetName(request.getName())
                .description(request.getDescription())
                .fiscalYear(request.getFiscalYear())
                .quarter(request.getQuarter() != null ? HeadcountBudget.Quarter.valueOf(request.getQuarter()) : null)
                .departmentId(request.getDepartmentId())
                .departmentName(request.getDepartmentName())
                .costCenterId(request.getCostCenterId())
                .costCenterCode(request.getCostCenterCode())
                .totalBudget(request.getTotalBudget())
                .salaryBudget(request.getSalaryBudget())
                .benefitsBudget(request.getBenefitsBudget())
                .contingencyBudget(request.getContingencyBudget())
                .allocatedBudget(BigDecimal.ZERO)
                .openingHeadcount(request.getOpeningHeadcount())
                .plannedHires(request.getPlannedHires() != null ? request.getPlannedHires() : 0)
                .plannedAttrition(request.getPlannedAttrition() != null ? request.getPlannedAttrition() : 0)
                .currentHeadcount(request.getOpeningHeadcount())
                .attritionRate(request.getAttritionRate())
                .status(HeadcountBudget.BudgetStatus.DRAFT)
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .notes(request.getNotes())
                .build();

        // Calculate closing headcount
        int closingHeadcount = request.getOpeningHeadcount()
                + (request.getPlannedHires() != null ? request.getPlannedHires() : 0)
                - (request.getPlannedAttrition() != null ? request.getPlannedAttrition() : 0);
        budget.setClosingHeadcount(closingHeadcount);

        budget.setTenantId(tenantId);
        budget = budgetRepository.save(budget);

        log.info("Created headcount budget: {} for department: {}", budget.getBudgetName(), budget.getDepartmentName());
        return HeadcountBudgetResponse.fromEntity(budget);
    }

    @Transactional
    public HeadcountBudgetResponse updateBudget(UUID budgetId, HeadcountBudgetRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(budgetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + budgetId));

        if (budget.getStatus() == HeadcountBudget.BudgetStatus.APPROVED) {
            throw new IllegalStateException("Cannot modify an approved budget");
        }

        budget.setBudgetName(request.getName());
        budget.setDescription(request.getDescription());
        budget.setFiscalYear(request.getFiscalYear());
        budget.setQuarter(request.getQuarter() != null ? HeadcountBudget.Quarter.valueOf(request.getQuarter()) : null);
        budget.setDepartmentId(request.getDepartmentId());
        budget.setDepartmentName(request.getDepartmentName());
        budget.setCostCenterId(request.getCostCenterId());
        budget.setCostCenterCode(request.getCostCenterCode());
        budget.setTotalBudget(request.getTotalBudget());
        budget.setSalaryBudget(request.getSalaryBudget());
        budget.setBenefitsBudget(request.getBenefitsBudget());
        budget.setContingencyBudget(request.getContingencyBudget());
        budget.setOpeningHeadcount(request.getOpeningHeadcount());
        budget.setPlannedHires(request.getPlannedHires());
        budget.setPlannedAttrition(request.getPlannedAttrition());
        budget.setAttritionRate(request.getAttritionRate());
        budget.setCurrency(request.getCurrency());
        budget.setNotes(request.getNotes());

        int closingHeadcount = request.getOpeningHeadcount()
                + (request.getPlannedHires() != null ? request.getPlannedHires() : 0)
                - (request.getPlannedAttrition() != null ? request.getPlannedAttrition() : 0);
        budget.setClosingHeadcount(closingHeadcount);

        budget = budgetRepository.save(budget);
        return HeadcountBudgetResponse.fromEntity(budget);
    }

    @Transactional(readOnly = true)
    public HeadcountBudgetResponse getBudget(UUID budgetId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(budgetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + budgetId));

        HeadcountBudgetResponse response = HeadcountBudgetResponse.fromEntity(budget);

        // Load positions
        List<HeadcountPosition> positions = positionRepository.findByBudgetId(budgetId);
        response.setPositions(positions.stream()
                .map(HeadcountPositionResponse::fromEntity)
                .collect(Collectors.toList()));

        // Load scenarios
        List<BudgetScenario> scenarios = scenarioRepository.findByBudget(budgetId);
        response.setScenarios(scenarios.stream()
                .map(BudgetScenarioResponse::fromEntity)
                .collect(Collectors.toList()));

        return response;
    }

    @Transactional(readOnly = true)
    public Page<HeadcountBudgetResponse> getAllBudgets(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return budgetRepository.findByTenantId(tenantId, pageable)
                .map(HeadcountBudgetResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<HeadcountBudgetResponse> getBudgetsByFiscalYear(Integer year) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return budgetRepository.findByFiscalYear(tenantId, year).stream()
                .map(HeadcountBudgetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HeadcountBudgetResponse> getBudgetsByDepartment(UUID departmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return budgetRepository.findByDepartment(tenantId, departmentId).stream()
                .map(HeadcountBudgetResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteBudget(UUID budgetId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(budgetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + budgetId));

        if (budget.getStatus() == HeadcountBudget.BudgetStatus.APPROVED) {
            throw new IllegalStateException("Cannot delete an approved budget");
        }

        budgetRepository.delete(budget);
        log.info("Deleted budget: {}", budgetId);
    }

    // ==================== BUDGET APPROVAL WORKFLOW ====================

    @Transactional
    public HeadcountBudgetResponse submitForApproval(UUID budgetId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(budgetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + budgetId));

        if (budget.getStatus() != HeadcountBudget.BudgetStatus.DRAFT) {
            throw new IllegalStateException("Only draft budgets can be submitted for approval");
        }

        budget.setStatus(HeadcountBudget.BudgetStatus.PENDING_APPROVAL);
        budget = budgetRepository.save(budget);

        log.info("Budget {} submitted for approval", budgetId);
        return HeadcountBudgetResponse.fromEntity(budget);
    }

    @Transactional
    public HeadcountBudgetResponse approveBudget(UUID budgetId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(budgetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + budgetId));

        if (budget.getStatus() != HeadcountBudget.BudgetStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending budgets can be approved");
        }

        budget.setStatus(HeadcountBudget.BudgetStatus.APPROVED);
        budget.setApprovedBy(currentUserId);
        budget.setApprovedAt(LocalDateTime.now());
        budget = budgetRepository.save(budget);

        log.info("Budget {} approved by {}", budgetId, currentUserId);
        return HeadcountBudgetResponse.fromEntity(budget);
    }

    @Transactional
    public HeadcountBudgetResponse rejectBudget(UUID budgetId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(budgetId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + budgetId));

        if (budget.getStatus() != HeadcountBudget.BudgetStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Only pending budgets can be rejected");
        }

        budget.setStatus(HeadcountBudget.BudgetStatus.REJECTED);
        budget.setNotes(reason);
        budget = budgetRepository.save(budget);

        log.info("Budget {} rejected", budgetId);
        return HeadcountBudgetResponse.fromEntity(budget);
    }

    // ==================== POSITION OPERATIONS ====================

    @Transactional
    public HeadcountPositionResponse createPosition(HeadcountPositionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget budget = budgetRepository.findByIdAndTenantId(request.getBudgetId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Budget not found: " + request.getBudgetId()));

        HeadcountPosition position = HeadcountPosition.builder()
                .budget(budget)
                .positionCode(request.getPositionCode())
                .positionTitle(request.getPositionTitle())
                .positionType(HeadcountPosition.PositionType.valueOf(request.getPositionType()))
                .status(HeadcountPosition.PositionStatus.PLANNED)
                .jobLevel(request.getJobLevel())
                .jobFamily(request.getJobFamily())
                .location(request.getLocation())
                .employmentType(request.getEmploymentType())
                .fteCount(request.getFteCount() != null ? request.getFteCount() : BigDecimal.ONE)
                .minSalary(request.getMinSalary())
                .maxSalary(request.getMaxSalary())
                .budgetedSalary(request.getBudgetedSalary())
                .budgetedBenefits(request.getBudgetedBenefits())
                .plannedStartDate(request.getPlannedStartDate())
                .plannedFillDate(request.getPlannedFillDate())
                .replacementFor(request.getReplacementFor())
                .justification(request.getJustification())
                .hiringManagerId(request.getHiringManagerId())
                .build();

        position.setTenantId(tenantId);
        position = positionRepository.save(position);

        // Update budget allocated amount
        updateBudgetAllocations(budget.getId());

        log.info("Created position: {} for budget: {}", position.getPositionTitle(), budget.getBudgetName());
        return HeadcountPositionResponse.fromEntity(position);
    }

    @Transactional
    public HeadcountPositionResponse updatePosition(UUID positionId, HeadcountPositionRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountPosition position = positionRepository.findByIdAndTenantId(positionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));

        position.setPositionCode(request.getPositionCode());
        position.setPositionTitle(request.getPositionTitle());
        position.setPositionType(HeadcountPosition.PositionType.valueOf(request.getPositionType()));
        position.setJobLevel(request.getJobLevel());
        position.setJobFamily(request.getJobFamily());
        position.setLocation(request.getLocation());
        position.setEmploymentType(request.getEmploymentType());
        position.setFteCount(request.getFteCount());
        position.setMinSalary(request.getMinSalary());
        position.setMaxSalary(request.getMaxSalary());
        position.setBudgetedSalary(request.getBudgetedSalary());
        position.setBudgetedBenefits(request.getBudgetedBenefits());
        position.setPlannedStartDate(request.getPlannedStartDate());
        position.setPlannedFillDate(request.getPlannedFillDate());
        position.setReplacementFor(request.getReplacementFor());
        position.setJustification(request.getJustification());
        position.setHiringManagerId(request.getHiringManagerId());

        position = positionRepository.save(position);

        // Update budget allocated amount (null-safe: budget is @ManyToOne(LAZY))
        if (position.getBudget() != null) {
            updateBudgetAllocations(position.getBudget().getId());
        }

        return HeadcountPositionResponse.fromEntity(position);
    }

    @Transactional
    public HeadcountPositionResponse updatePositionStatus(UUID positionId, String status) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountPosition position = positionRepository.findByIdAndTenantId(positionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));

        HeadcountPosition.PositionStatus newStatus = HeadcountPosition.PositionStatus.valueOf(status);
        position.setStatus(newStatus);

        if (newStatus == HeadcountPosition.PositionStatus.FILLED) {
            position.setActualFillDate(java.time.LocalDate.now());
        }

        position = positionRepository.save(position);

        // Update budget headcount (null-safe)
        if (position.getBudget() != null) {
            updateBudgetHeadcount(position.getBudget().getId());
        }

        log.info("Updated position {} status to {}", positionId, status);
        return HeadcountPositionResponse.fromEntity(position);
    }

    @Transactional(readOnly = true)
    public List<HeadcountPositionResponse> getPositionsByBudget(UUID budgetId) {
        return positionRepository.findByBudgetId(budgetId).stream()
                .map(HeadcountPositionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<HeadcountPositionResponse> getPositionsByStatus(String status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        HeadcountPosition.PositionStatus positionStatus = HeadcountPosition.PositionStatus.valueOf(status);
        return positionRepository.findByStatus(tenantId, positionStatus).stream()
                .map(HeadcountPositionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deletePosition(UUID positionId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountPosition position = positionRepository.findByIdAndTenantId(positionId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));

        UUID budgetId = position.getBudget() != null ? position.getBudget().getId() : null;
        positionRepository.delete(position);

        // Update budget allocations
        if (budgetId != null) {
            updateBudgetAllocations(budgetId);
        }

        log.info("Deleted position: {}", positionId);
    }

    // ==================== SCENARIO OPERATIONS ====================

    @Transactional
    public BudgetScenarioResponse createScenario(BudgetScenarioRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        HeadcountBudget baseBudget = budgetRepository.findByIdAndTenantId(request.getBaseBudgetId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Base budget not found: " + request.getBaseBudgetId()));

        BudgetScenario scenario = BudgetScenario.builder()
                .baseBudget(baseBudget)
                .name(request.getName())
                .description(request.getDescription())
                .scenarioType(BudgetScenario.ScenarioType.valueOf(request.getScenarioType()))
                .headcountAdjustment(request.getHeadcountAdjustment())
                .salaryAdjustmentPercent(request.getSalaryAdjustmentPercent())
                .hiringFreeze(request.getHiringFreeze() != null ? request.getHiringFreeze() : false)
                .attritionRateAdjustment(request.getAttritionRateAdjustment())
                .isSelected(false)
                .notes(request.getNotes())
                .build();

        scenario.setTenantId(tenantId);

        // Calculate projections
        calculateScenarioProjections(scenario, baseBudget);

        scenario = scenarioRepository.save(scenario);

        log.info("Created scenario: {} for budget: {}", scenario.getName(), baseBudget.getBudgetName());
        return BudgetScenarioResponse.fromEntity(scenario);
    }

    @Transactional
    public BudgetScenarioResponse updateScenario(UUID scenarioId, BudgetScenarioRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BudgetScenario scenario = scenarioRepository.findByIdAndTenantId(scenarioId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scenario not found: " + scenarioId));

        scenario.setName(request.getName());
        scenario.setDescription(request.getDescription());
        scenario.setScenarioType(BudgetScenario.ScenarioType.valueOf(request.getScenarioType()));
        scenario.setHeadcountAdjustment(request.getHeadcountAdjustment());
        scenario.setSalaryAdjustmentPercent(request.getSalaryAdjustmentPercent());
        scenario.setHiringFreeze(request.getHiringFreeze());
        scenario.setAttritionRateAdjustment(request.getAttritionRateAdjustment());
        scenario.setNotes(request.getNotes());

        // Recalculate projections
        calculateScenarioProjections(scenario, scenario.getBaseBudget());

        scenario = scenarioRepository.save(scenario);
        return BudgetScenarioResponse.fromEntity(scenario);
    }

    public BudgetScenarioResponse selectScenario(UUID scenarioId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BudgetScenario scenario = scenarioRepository.findByIdAndTenantId(scenarioId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scenario not found: " + scenarioId));

        // Deselect other scenarios for the same budget (null-safe)
        if (scenario.getBaseBudget() != null) {
            List<BudgetScenario> budgetScenarios = scenarioRepository.findByBudget(scenario.getBaseBudget().getId());
            for (BudgetScenario s : budgetScenarios) {
                s.setIsSelected(false);
                scenarioRepository.save(s);
            }
        }

        // Select this scenario
        scenario.setIsSelected(true);
        scenario = scenarioRepository.save(scenario);

        log.info("Selected scenario: {} for budget: {}", scenario.getName(),
                scenario.getBaseBudget() != null ? scenario.getBaseBudget().getBudgetName() : "N/A");
        return BudgetScenarioResponse.fromEntity(scenario);
    }

    @Transactional(readOnly = true)
    public List<BudgetScenarioResponse> getScenariosByBudget(UUID budgetId) {
        return scenarioRepository.findByBudget(budgetId).stream()
                .map(BudgetScenarioResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BudgetScenarioResponse> compareScenarios(List<UUID> scenarioIds) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Batch-fetch all requested scenarios in a single query (avoids N+1).
        // Preserve the caller's requested order by building an id→entity map.
        Map<UUID, BudgetScenario> scenarioMap = scenarioRepository
                .findAllByIdsAndTenantId(scenarioIds, tenantId)
                .stream()
                .collect(Collectors.toMap(BudgetScenario::getId, s -> s));

        return scenarioIds.stream()
                .map(scenarioMap::get)
                .filter(Objects::nonNull)
                .map(BudgetScenarioResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteScenario(UUID scenarioId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        BudgetScenario scenario = scenarioRepository.findByIdAndTenantId(scenarioId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Scenario not found: " + scenarioId));

        scenarioRepository.delete(scenario);
        log.info("Deleted scenario: {}", scenarioId);
    }

    // ==================== DASHBOARD ====================

    @Transactional(readOnly = true)
    public BudgetDashboard getDashboard(Integer fiscalYear) {
        UUID tenantId = TenantContext.getCurrentTenant();

        List<HeadcountBudget> budgets = budgetRepository.findByFiscalYear(tenantId, fiscalYear);

        // Calculate totals
        BigDecimal totalBudget = budgets.stream()
                .filter(b -> b.getStatus() == HeadcountBudget.BudgetStatus.APPROVED)
                .map(HeadcountBudget::getTotalBudget)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal allocatedBudget = budgets.stream()
                .filter(b -> b.getStatus() == HeadcountBudget.BudgetStatus.APPROVED)
                .map(b -> b.getAllocatedBudget() != null ? b.getAllocatedBudget() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal remainingBudget = totalBudget.subtract(allocatedBudget);

        BigDecimal utilizationPercent = BigDecimal.ZERO;
        if (totalBudget.compareTo(BigDecimal.ZERO) > 0) {
            utilizationPercent = allocatedBudget.divide(totalBudget, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        // Headcount
        Integer totalPlannedHeadcount = budgetRepository.getTotalPlannedHeadcount(tenantId, fiscalYear);

        // Position counts by status
        Map<HeadcountPosition.PositionStatus, Long> positionCountsByStatus = new HashMap<>();
        for (HeadcountBudget budget : budgets) {
            List<Object[]> counts = positionRepository.countByStatus(budget.getId());
            for (Object[] count : counts) {
                HeadcountPosition.PositionStatus status = (HeadcountPosition.PositionStatus) count[0];
                Long cnt = (Long) count[1];
                positionCountsByStatus.merge(status, cnt, Long::sum);
            }
        }

        int openPositions = positionCountsByStatus.getOrDefault(HeadcountPosition.PositionStatus.OPEN, 0L).intValue()
                + positionCountsByStatus.getOrDefault(HeadcountPosition.PositionStatus.IN_PROGRESS, 0L).intValue();
        int filledPositions = positionCountsByStatus.getOrDefault(HeadcountPosition.PositionStatus.FILLED, 0L).intValue();
        int cancelledPositions = positionCountsByStatus.getOrDefault(HeadcountPosition.PositionStatus.CANCELLED, 0L).intValue();

        // Budget by status
        Map<HeadcountBudget.BudgetStatus, BigDecimal> budgetByStatus = budgets.stream()
                .collect(Collectors.groupingBy(
                        HeadcountBudget::getStatus,
                        Collectors.reducing(BigDecimal.ZERO, HeadcountBudget::getTotalBudget, BigDecimal::add)));

        // Department summaries
        List<BudgetDashboard.DepartmentBudgetSummary> departmentSummaries = budgets.stream()
                .filter(b -> b.getStatus() == HeadcountBudget.BudgetStatus.APPROVED)
                .collect(Collectors.groupingBy(HeadcountBudget::getDepartmentId))
                .entrySet().stream()
                .map(entry -> {
                    UUID deptId = entry.getKey();
                    List<HeadcountBudget> deptBudgets = entry.getValue();

                    BigDecimal deptTotal = deptBudgets.stream()
                            .map(HeadcountBudget::getTotalBudget)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal deptAllocated = deptBudgets.stream()
                            .map(b -> b.getAllocatedBudget() != null ? b.getAllocatedBudget() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    BigDecimal deptUtil = BigDecimal.ZERO;
                    if (deptTotal.compareTo(BigDecimal.ZERO) > 0) {
                        deptUtil = deptAllocated.divide(deptTotal, 4, RoundingMode.HALF_UP)
                                .multiply(BigDecimal.valueOf(100));
                    }

                    Integer plannedHC = deptBudgets.stream()
                            .mapToInt(b -> b.getClosingHeadcount() != null ? b.getClosingHeadcount() : 0)
                            .sum();

                    return BudgetDashboard.DepartmentBudgetSummary.builder()
                            .departmentId(deptId)
                            .departmentName(deptBudgets.get(0).getDepartmentName())
                            .totalBudget(deptTotal)
                            .allocatedBudget(deptAllocated)
                            .utilizationPercent(deptUtil)
                            .plannedHeadcount(plannedHC)
                            .build();
                })
                .collect(Collectors.toList());

        // Selected scenarios
        List<BudgetScenario> selectedScenarios = scenarioRepository.findSelectedScenarios(tenantId);
        List<BudgetDashboard.ScenarioSummary> scenarioSummaries = selectedScenarios.stream()
                .map(s -> BudgetDashboard.ScenarioSummary.builder()
                        .scenarioId(s.getId())
                        .name(s.getName())
                        .scenarioType(s.getScenarioType().name())
                        .projectedHeadcount(s.getProjectedHeadcount())
                        .projectedCost(s.getProjectedCost())
                        .variancePercent(s.getVariancePercent())
                        .isSelected(s.getIsSelected())
                        .build())
                .collect(Collectors.toList());

        return BudgetDashboard.builder()
                .fiscalYear(fiscalYear)
                .totalBudget(totalBudget)
                .allocatedBudget(allocatedBudget)
                .remainingBudget(remainingBudget)
                .utilizationPercent(utilizationPercent)
                .totalPlannedHeadcount(totalPlannedHeadcount != null ? totalPlannedHeadcount : 0)
                .openPositions(openPositions)
                .filledPositions(filledPositions)
                .cancelledPositions(cancelledPositions)
                .draftBudget(budgetByStatus.getOrDefault(HeadcountBudget.BudgetStatus.DRAFT, BigDecimal.ZERO))
                .pendingApprovalBudget(budgetByStatus.getOrDefault(HeadcountBudget.BudgetStatus.PENDING_APPROVAL, BigDecimal.ZERO))
                .approvedBudget(budgetByStatus.getOrDefault(HeadcountBudget.BudgetStatus.APPROVED, BigDecimal.ZERO))
                .rejectedBudget(budgetByStatus.getOrDefault(HeadcountBudget.BudgetStatus.REJECTED, BigDecimal.ZERO))
                .totalBudgets(budgets.size())
                .draftBudgets((int) budgets.stream().filter(b -> b.getStatus() == HeadcountBudget.BudgetStatus.DRAFT).count())
                .pendingBudgets((int) budgets.stream().filter(b -> b.getStatus() == HeadcountBudget.BudgetStatus.PENDING_APPROVAL).count())
                .approvedBudgets((int) budgets.stream().filter(b -> b.getStatus() == HeadcountBudget.BudgetStatus.APPROVED).count())
                .departmentSummaries(departmentSummaries)
                .activeScenarios(scenarioSummaries)
                .build();
    }

    // ==================== HELPER METHODS ====================

    private void updateBudgetAllocations(UUID budgetId) {
        BigDecimal totalPositionCost = positionRepository.getTotalPositionCost(budgetId);
        if (totalPositionCost == null) {
            totalPositionCost = BigDecimal.ZERO;
        }

        HeadcountBudget budget = budgetRepository.findById(budgetId).orElse(null);
        if (budget != null) {
            budget.setAllocatedBudget(totalPositionCost);
            budgetRepository.save(budget);
        }
    }

    private void updateBudgetHeadcount(UUID budgetId) {
        HeadcountBudget budget = budgetRepository.findById(budgetId).orElse(null);
        if (budget != null) {
            long filledCount = positionRepository.countByBudgetAndStatus(budgetId, HeadcountPosition.PositionStatus.FILLED);
            budget.setCurrentHeadcount(budget.getOpeningHeadcount() + (int) filledCount);
            budgetRepository.save(budget);
        }
    }

    private void calculateScenarioProjections(BudgetScenario scenario, HeadcountBudget baseBudget) {
        int baseHeadcount = baseBudget.getClosingHeadcount() != null ? baseBudget.getClosingHeadcount() : 0;
        BigDecimal baseCost = baseBudget.getTotalBudget();

        // Calculate projected headcount
        int projectedHeadcount = baseHeadcount;
        if (scenario.getHeadcountAdjustment() != null) {
            projectedHeadcount += scenario.getHeadcountAdjustment();
        }
        if (scenario.getHiringFreeze() != null && scenario.getHiringFreeze()) {
            // Reduce by planned hires
            projectedHeadcount -= (baseBudget.getPlannedHires() != null ? baseBudget.getPlannedHires() : 0);
        }
        scenario.setProjectedHeadcount(projectedHeadcount);

        // Calculate projected cost
        BigDecimal projectedCost = baseCost;
        if (scenario.getSalaryAdjustmentPercent() != null) {
            BigDecimal adjustment = baseCost.multiply(scenario.getSalaryAdjustmentPercent())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            projectedCost = projectedCost.add(adjustment);
        }

        // Adjust for headcount changes (rough estimate)
        if (baseHeadcount > 0) {
            BigDecimal costPerHead = baseCost.divide(BigDecimal.valueOf(baseHeadcount), 2, RoundingMode.HALF_UP);
            int headcountDelta = projectedHeadcount - baseHeadcount;
            projectedCost = projectedCost.add(costPerHead.multiply(BigDecimal.valueOf(headcountDelta)));
        }

        scenario.setProjectedCost(projectedCost);

        // Calculate variance
        BigDecimal costVariance = projectedCost.subtract(baseCost);
        scenario.setCostVariance(costVariance);

        if (baseCost.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal variancePercent = costVariance.divide(baseCost, 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
            scenario.setVariancePercent(variancePercent);
        }
    }
}
