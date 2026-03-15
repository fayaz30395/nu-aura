package com.hrms.application.exit.service;

import com.hrms.api.exit.dto.*;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.exit.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.exit.repository.*;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ExitManagementService {

    private final ExitProcessRepository exitProcessRepository;
    private final ExitClearanceRepository exitClearanceRepository;
    private final FullAndFinalSettlementRepository settlementRepository;
    private final ExitInterviewRepository exitInterviewRepository;
    private final AssetRecoveryRepository assetRecoveryRepository;
    private final EmployeeRepository employeeRepository;

    // ==================== Exit Process Operations ====================

    @Transactional
    public ExitProcessResponse createExitProcess(ExitProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating exit process for employee {} in tenant {}", request.getEmployeeId(), tenantId);

        // Verify employee exists
        employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        ExitProcess exitProcess = new ExitProcess();
        exitProcess.setId(UUID.randomUUID());
        exitProcess.setTenantId(tenantId);
        exitProcess.setEmployeeId(request.getEmployeeId());
        exitProcess.setExitType(request.getExitType());
        exitProcess.setResignationDate(request.getResignationDate());
        exitProcess.setLastWorkingDate(request.getLastWorkingDate());
        exitProcess.setNoticePeriodDays(request.getNoticePeriodDays());
        exitProcess.setNoticePeriodServed(request.getNoticePeriodServed());
        exitProcess.setBuyoutAmount(request.getBuyoutAmount());
        exitProcess.setReasonForLeaving(request.getReasonForLeaving());
        exitProcess.setNewCompany(request.getNewCompany());
        exitProcess.setNewDesignation(request.getNewDesignation());
        exitProcess.setStatus(request.getStatus() != null ? request.getStatus() : ExitProcess.ExitStatus.INITIATED);
        exitProcess.setRehireEligible(request.getRehireEligible());
        exitProcess.setExitInterviewScheduled(request.getExitInterviewScheduled());
        exitProcess.setExitInterviewDate(request.getExitInterviewDate());
        exitProcess.setExitInterviewFeedback(request.getExitInterviewFeedback());
        exitProcess.setFinalSettlementAmount(request.getFinalSettlementAmount());
        exitProcess.setSettlementDate(request.getSettlementDate());
        exitProcess.setManagerId(request.getManagerId());
        exitProcess.setHrSpocId(request.getHrSpocId());
        exitProcess.setNotes(request.getNotes());

        ExitProcess savedProcess = exitProcessRepository.save(exitProcess);
        return mapToExitProcessResponse(savedProcess);
    }

    @Transactional
    public ExitProcessResponse updateExitProcess(UUID processId, ExitProcessRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating exit process {} for tenant {}", processId, tenantId);

        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit process not found"));

        exitProcess.setResignationDate(request.getResignationDate());
        exitProcess.setLastWorkingDate(request.getLastWorkingDate());
        exitProcess.setNoticePeriodDays(request.getNoticePeriodDays());
        exitProcess.setNoticePeriodServed(request.getNoticePeriodServed());
        exitProcess.setBuyoutAmount(request.getBuyoutAmount());
        exitProcess.setReasonForLeaving(request.getReasonForLeaving());
        exitProcess.setNewCompany(request.getNewCompany());
        exitProcess.setNewDesignation(request.getNewDesignation());
        exitProcess.setStatus(request.getStatus());
        exitProcess.setRehireEligible(request.getRehireEligible());
        exitProcess.setExitInterviewScheduled(request.getExitInterviewScheduled());
        exitProcess.setExitInterviewDate(request.getExitInterviewDate());
        exitProcess.setExitInterviewFeedback(request.getExitInterviewFeedback());
        exitProcess.setFinalSettlementAmount(request.getFinalSettlementAmount());
        exitProcess.setSettlementDate(request.getSettlementDate());
        exitProcess.setManagerId(request.getManagerId());
        exitProcess.setHrSpocId(request.getHrSpocId());
        exitProcess.setNotes(request.getNotes());

        ExitProcess updatedProcess = exitProcessRepository.save(exitProcess);
        return mapToExitProcessResponse(updatedProcess);
    }

    @Transactional
    public ExitProcessResponse updateExitStatus(UUID processId, ExitProcess.ExitStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating exit process {} status to {} for tenant {}", processId, status, tenantId);

        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit process not found"));

        exitProcess.setStatus(status);

        ExitProcess updatedProcess = exitProcessRepository.save(exitProcess);
        return mapToExitProcessResponse(updatedProcess);
    }

    @Transactional(readOnly = true)
    public ExitProcessResponse getExitProcessById(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit process not found"));
        return mapToExitProcessResponse(exitProcess);
    }

    @Transactional(readOnly = true)
    public ExitProcessResponse getExitProcessByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitProcess exitProcess = exitProcessRepository.findByTenantIdAndEmployeeId(tenantId, employeeId)
                .orElseThrow(() -> new IllegalArgumentException("No exit process found for employee"));
        return mapToExitProcessResponse(exitProcess);
    }

    @Transactional(readOnly = true)
    public Page<ExitProcessResponse> getAllExitProcesses(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitProcessRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToExitProcessResponse);
    }

    @Transactional(readOnly = true)
    public List<ExitProcessResponse> getExitProcessesByStatus(ExitProcess.ExitStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitProcessRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToExitProcessResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteExitProcess(UUID processId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitProcess exitProcess = exitProcessRepository.findByIdAndTenantId(processId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit process not found"));
        exitProcessRepository.delete(exitProcess);
    }

    // ==================== Exit Clearance Operations ====================

    @Transactional
    public ExitClearanceResponse createExitClearance(ExitClearanceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating exit clearance for process {} in tenant {}", request.getExitProcessId(), tenantId);

        ExitClearance clearance = new ExitClearance();
        clearance.setId(UUID.randomUUID());
        clearance.setTenantId(tenantId);
        clearance.setExitProcessId(request.getExitProcessId());
        clearance.setDepartment(request.getDepartment());
        clearance.setApproverId(request.getApproverId());
        clearance.setStatus(request.getStatus() != null ? request.getStatus() : ExitClearance.ClearanceStatus.PENDING);
        clearance.setRequestedDate(request.getRequestedDate());
        clearance.setApprovedDate(request.getApprovedDate());
        clearance.setComments(request.getComments());
        clearance.setChecklistItems(request.getChecklistItems());

        ExitClearance savedClearance = exitClearanceRepository.save(clearance);
        return mapToExitClearanceResponse(savedClearance);
    }

    @Transactional
    public ExitClearanceResponse updateExitClearance(UUID clearanceId, ExitClearanceRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating exit clearance {} for tenant {}", clearanceId, tenantId);

        ExitClearance clearance = exitClearanceRepository.findByIdAndTenantId(clearanceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit clearance not found"));

        clearance.setApproverId(request.getApproverId());
        clearance.setStatus(request.getStatus());
        clearance.setRequestedDate(request.getRequestedDate());
        clearance.setApprovedDate(request.getApprovedDate());
        clearance.setComments(request.getComments());
        clearance.setChecklistItems(request.getChecklistItems());

        ExitClearance updatedClearance = exitClearanceRepository.save(clearance);
        return mapToExitClearanceResponse(updatedClearance);
    }

    @Transactional(readOnly = true)
    public List<ExitClearanceResponse> getClearancesByExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitClearanceRepository.findByTenantIdAndExitProcessId(tenantId, exitProcessId).stream()
                .map(this::mapToExitClearanceResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ExitClearanceResponse> getClearancesByApprover(UUID approverId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitClearanceRepository.findByTenantIdAndApproverId(tenantId, approverId).stream()
                .map(this::mapToExitClearanceResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteExitClearance(UUID clearanceId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitClearance clearance = exitClearanceRepository.findByIdAndTenantId(clearanceId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit clearance not found"));
        exitClearanceRepository.delete(clearance);
    }

    // ==================== Mapper Methods ====================

    private ExitProcessResponse mapToExitProcessResponse(ExitProcess exitProcess) {
        String employeeName = employeeRepository.findById(exitProcess.getEmployeeId())
                .map(Employee::getFullName)
                .orElse(null);

        String managerName = null;
        if (exitProcess.getManagerId() != null) {
            managerName = employeeRepository.findById(exitProcess.getManagerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        String hrSpocName = null;
        if (exitProcess.getHrSpocId() != null) {
            hrSpocName = employeeRepository.findById(exitProcess.getHrSpocId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return ExitProcessResponse.builder()
                .id(exitProcess.getId())
                .tenantId(exitProcess.getTenantId())
                .employeeId(exitProcess.getEmployeeId())
                .employeeName(employeeName)
                .exitType(exitProcess.getExitType())
                .resignationDate(exitProcess.getResignationDate())
                .lastWorkingDate(exitProcess.getLastWorkingDate())
                .noticePeriodDays(exitProcess.getNoticePeriodDays())
                .noticePeriodServed(exitProcess.getNoticePeriodServed())
                .buyoutAmount(exitProcess.getBuyoutAmount())
                .reasonForLeaving(exitProcess.getReasonForLeaving())
                .newCompany(exitProcess.getNewCompany())
                .newDesignation(exitProcess.getNewDesignation())
                .status(exitProcess.getStatus())
                .rehireEligible(exitProcess.getRehireEligible())
                .exitInterviewScheduled(exitProcess.getExitInterviewScheduled())
                .exitInterviewDate(exitProcess.getExitInterviewDate())
                .exitInterviewFeedback(exitProcess.getExitInterviewFeedback())
                .finalSettlementAmount(exitProcess.getFinalSettlementAmount())
                .settlementDate(exitProcess.getSettlementDate())
                .managerId(exitProcess.getManagerId())
                .managerName(managerName)
                .hrSpocId(exitProcess.getHrSpocId())
                .hrSpocName(hrSpocName)
                .notes(exitProcess.getNotes())
                .createdAt(exitProcess.getCreatedAt())
                .updatedAt(exitProcess.getUpdatedAt())
                .build();
    }

    private ExitClearanceResponse mapToExitClearanceResponse(ExitClearance clearance) {
        String employeeName = exitProcessRepository.findById(clearance.getExitProcessId())
                .flatMap(ep -> employeeRepository.findById(ep.getEmployeeId()))
                .map(Employee::getFullName)
                .orElse(null);

        String approverName = employeeRepository.findById(clearance.getApproverId())
                .map(Employee::getFullName)
                .orElse(null);

        return ExitClearanceResponse.builder()
                .id(clearance.getId())
                .tenantId(clearance.getTenantId())
                .exitProcessId(clearance.getExitProcessId())
                .employeeName(employeeName)
                .department(clearance.getDepartment())
                .approverId(clearance.getApproverId())
                .approverName(approverName)
                .status(clearance.getStatus())
                .requestedDate(clearance.getRequestedDate())
                .approvedDate(clearance.getApprovedDate())
                .comments(clearance.getComments())
                .checklistItems(clearance.getChecklistItems())
                .createdAt(clearance.getCreatedAt())
                .updatedAt(clearance.getUpdatedAt())
                .build();
    }

    // ==================== Full & Final Settlement Operations ====================

    @Transactional
    public FullAndFinalSettlementResponse createSettlement(FullAndFinalSettlementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();
        log.info("Creating F&F settlement for exit process {} in tenant {}", request.getExitProcessId(), tenantId);

        FullAndFinalSettlement settlement = new FullAndFinalSettlement();
        settlement.setTenantId(tenantId);
        settlement.setExitProcessId(request.getExitProcessId());
        settlement.setEmployeeId(request.getEmployeeId());

        // Earnings
        if (request.getPendingSalary() != null) settlement.setPendingSalary(request.getPendingSalary());
        if (request.getLeaveEncashment() != null) settlement.setLeaveEncashment(request.getLeaveEncashment());
        if (request.getBonusAmount() != null) settlement.setBonusAmount(request.getBonusAmount());
        if (request.getNoticePeriodRecovery() != null) settlement.setNoticePeriodRecovery(request.getNoticePeriodRecovery());
        if (request.getReimbursements() != null) settlement.setReimbursements(request.getReimbursements());
        if (request.getOtherEarnings() != null) settlement.setOtherEarnings(request.getOtherEarnings());

        // Deductions
        if (request.getNoticeBuyout() != null) settlement.setNoticeBuyout(request.getNoticeBuyout());
        if (request.getLoanRecovery() != null) settlement.setLoanRecovery(request.getLoanRecovery());
        if (request.getAdvanceRecovery() != null) settlement.setAdvanceRecovery(request.getAdvanceRecovery());
        if (request.getAssetDamageDeduction() != null) settlement.setAssetDamageDeduction(request.getAssetDamageDeduction());
        if (request.getTaxDeduction() != null) settlement.setTaxDeduction(request.getTaxDeduction());
        if (request.getOtherDeductions() != null) settlement.setOtherDeductions(request.getOtherDeductions());

        // Gratuity
        settlement.setYearsOfService(request.getYearsOfService());
        settlement.setLastDrawnSalary(request.getLastDrawnSalary());
        settlement.calculateGratuity();

        // Calculate totals
        settlement.calculateTotals();

        settlement.setPreparedBy(currentUserId);
        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.DRAFT);
        if (request.getRemarks() != null) settlement.setRemarks(request.getRemarks());

        FullAndFinalSettlement saved = settlementRepository.save(settlement);
        return mapToSettlementResponse(saved);
    }

    @Transactional
    public FullAndFinalSettlementResponse updateSettlement(UUID id, FullAndFinalSettlementRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));

        // Update earnings
        if (request.getPendingSalary() != null) settlement.setPendingSalary(request.getPendingSalary());
        if (request.getLeaveEncashment() != null) settlement.setLeaveEncashment(request.getLeaveEncashment());
        if (request.getBonusAmount() != null) settlement.setBonusAmount(request.getBonusAmount());
        if (request.getNoticePeriodRecovery() != null) settlement.setNoticePeriodRecovery(request.getNoticePeriodRecovery());
        if (request.getReimbursements() != null) settlement.setReimbursements(request.getReimbursements());
        if (request.getOtherEarnings() != null) settlement.setOtherEarnings(request.getOtherEarnings());

        // Update deductions
        if (request.getNoticeBuyout() != null) settlement.setNoticeBuyout(request.getNoticeBuyout());
        if (request.getLoanRecovery() != null) settlement.setLoanRecovery(request.getLoanRecovery());
        if (request.getAdvanceRecovery() != null) settlement.setAdvanceRecovery(request.getAdvanceRecovery());
        if (request.getAssetDamageDeduction() != null) settlement.setAssetDamageDeduction(request.getAssetDamageDeduction());
        if (request.getTaxDeduction() != null) settlement.setTaxDeduction(request.getTaxDeduction());
        if (request.getOtherDeductions() != null) settlement.setOtherDeductions(request.getOtherDeductions());

        // Gratuity
        if (request.getYearsOfService() != null) settlement.setYearsOfService(request.getYearsOfService());
        if (request.getLastDrawnSalary() != null) settlement.setLastDrawnSalary(request.getLastDrawnSalary());
        settlement.calculateGratuity();

        // Recalculate totals
        settlement.calculateTotals();

        if (request.getRemarks() != null) settlement.setRemarks(request.getRemarks());
        if (request.getPaymentMode() != null) settlement.setPaymentMode(request.getPaymentMode());

        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public FullAndFinalSettlementResponse submitForApproval(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL);
        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public FullAndFinalSettlementResponse approveSettlement(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.APPROVED);
        settlement.setApprovedBy(currentUserId);
        settlement.setApprovalDate(LocalDate.now());
        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional
    public FullAndFinalSettlementResponse processPayment(UUID id, FullAndFinalSettlement.PaymentMode paymentMode, String paymentReference) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));

        settlement.setStatus(FullAndFinalSettlement.SettlementStatus.PAID);
        settlement.setPaymentMode(paymentMode);
        settlement.setPaymentReference(paymentReference);
        settlement.setPaymentDate(LocalDate.now());
        return mapToSettlementResponse(settlementRepository.save(settlement));
    }

    @Transactional(readOnly = true)
    public FullAndFinalSettlementResponse getSettlementById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));
        return mapToSettlementResponse(settlement);
    }

    @Transactional(readOnly = true)
    public FullAndFinalSettlementResponse getSettlementByExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        FullAndFinalSettlement settlement = settlementRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Settlement not found"));
        return mapToSettlementResponse(settlement);
    }

    @Transactional(readOnly = true)
    public Page<FullAndFinalSettlementResponse> getAllSettlements(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return settlementRepository.findByTenantId(tenantId, pageable).map(this::mapToSettlementResponse);
    }

    @Transactional(readOnly = true)
    public List<FullAndFinalSettlementResponse> getPendingApprovals() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return settlementRepository.findPendingApprovals(tenantId).stream()
                .map(this::mapToSettlementResponse)
                .collect(Collectors.toList());
    }

    // ==================== Exit Interview Operations ====================

    @Transactional
    public ExitInterviewResponse createExitInterview(ExitInterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating exit interview for process {} in tenant {}", request.getExitProcessId(), tenantId);

        ExitInterview interview = new ExitInterview();
        interview.setTenantId(tenantId);
        interview.setExitProcessId(request.getExitProcessId());
        interview.setEmployeeId(request.getEmployeeId());
        interview.setInterviewerId(request.getInterviewerId());
        interview.setScheduledDate(request.getScheduledDate());
        interview.setScheduledTime(request.getScheduledTime());
        interview.setInterviewMode(request.getInterviewMode());
        interview.setStatus(ExitInterview.InterviewStatus.SCHEDULED);
        interview.setIsConfidential(request.getIsConfidential() != null ? request.getIsConfidential() : true);

        ExitInterview saved = exitInterviewRepository.save(interview);
        return mapToExitInterviewResponse(saved);
    }

    public ExitInterviewResponse conductExitInterview(UUID id, ExitInterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitInterview interview = exitInterviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit interview not found"));

        interview.setActualDate(LocalDate.now());
        interview.setStatus(ExitInterview.InterviewStatus.COMPLETED);

        // Ratings
        interview.setOverallExperienceRating(request.getOverallExperienceRating());
        interview.setManagementRating(request.getManagementRating());
        interview.setWorkLifeBalanceRating(request.getWorkLifeBalanceRating());
        interview.setGrowthOpportunitiesRating(request.getGrowthOpportunitiesRating());
        interview.setCompensationRating(request.getCompensationRating());
        interview.setTeamCultureRating(request.getTeamCultureRating());

        // Feedback
        interview.setPrimaryReasonForLeaving(request.getPrimaryReasonForLeaving());
        interview.setDetailedReason(request.getDetailedReason());
        interview.setWhatLikedMost(request.getWhatLikedMost());
        interview.setWhatCouldImprove(request.getWhatCouldImprove());
        interview.setSuggestions(request.getSuggestions());
        interview.setWouldRecommendCompany(request.getWouldRecommendCompany());
        interview.setWouldConsiderReturning(request.getWouldConsiderReturning());

        // New employer
        interview.setNewEmployer(request.getNewEmployer());
        interview.setNewRole(request.getNewRole());
        interview.setNewSalaryIncreasePercentage(request.getNewSalaryIncreasePercentage());

        interview.setInterviewerNotes(request.getInterviewerNotes());

        return mapToExitInterviewResponse(exitInterviewRepository.save(interview));
    }

    public ExitInterviewResponse rescheduleInterview(UUID id, LocalDate newDate) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitInterview interview = exitInterviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit interview not found"));

        interview.setScheduledDate(newDate);
        interview.setStatus(ExitInterview.InterviewStatus.RESCHEDULED);
        return mapToExitInterviewResponse(exitInterviewRepository.save(interview));
    }

    @Transactional(readOnly = true)
    public ExitInterviewResponse getExitInterviewById(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ExitInterview interview = exitInterviewRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Exit interview not found"));
        return mapToExitInterviewResponse(interview);
    }

    @Transactional(readOnly = true)
    public Page<ExitInterviewResponse> getAllExitInterviews(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitInterviewRepository.findByTenantId(tenantId, pageable).map(this::mapToExitInterviewResponse);
    }

    @Transactional(readOnly = true)
    public List<ExitInterviewResponse> getScheduledInterviews() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return exitInterviewRepository.findByTenantIdAndStatus(tenantId, ExitInterview.InterviewStatus.SCHEDULED)
                .stream().map(this::mapToExitInterviewResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getExitInterviewAnalytics() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> analytics = new HashMap<>();

        // Average ratings
        analytics.put("averageOverallRating", exitInterviewRepository.getAverageOverallRating(tenantId));
        analytics.put("averageManagementRating", exitInterviewRepository.getAverageManagementRating(tenantId));

        // Recommendation stats
        long completed = exitInterviewRepository.countCompleted(tenantId);
        long wouldRecommend = exitInterviewRepository.countWouldRecommend(tenantId);
        long wouldReturn = exitInterviewRepository.countWouldReturn(tenantId);

        analytics.put("totalCompleted", completed);
        analytics.put("recommendationRate", completed > 0 ? (double) wouldRecommend / completed * 100 : 0);
        analytics.put("returnRate", completed > 0 ? (double) wouldReturn / completed * 100 : 0);

        // Leaving reasons
        List<Object[]> reasons = exitInterviewRepository.getLeavingReasonStats(tenantId);
        List<Map<String, Object>> reasonStats = new ArrayList<>();
        for (Object[] reason : reasons) {
            Map<String, Object> stat = new HashMap<>();
            stat.put("reason", reason[0]);
            stat.put("count", reason[1]);
            reasonStats.add(stat);
        }
        analytics.put("leavingReasons", reasonStats);

        return analytics;
    }

    // ==================== Asset Recovery Operations ====================

    @Transactional
    public AssetRecoveryResponse createAssetRecovery(AssetRecoveryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating asset recovery for exit process {} in tenant {}", request.getExitProcessId(), tenantId);

        AssetRecovery asset = new AssetRecovery();
        asset.setTenantId(tenantId);
        asset.setExitProcessId(request.getExitProcessId());
        asset.setEmployeeId(request.getEmployeeId());
        asset.setAssetId(request.getAssetId());
        asset.setAssetName(request.getAssetName());
        asset.setAssetType(request.getAssetType());
        asset.setAssetTag(request.getAssetTag());
        asset.setSerialNumber(request.getSerialNumber());
        asset.setAssignedDate(request.getAssignedDate());
        asset.setExpectedReturnDate(request.getExpectedReturnDate());
        asset.setStatus(AssetRecovery.RecoveryStatus.PENDING);

        AssetRecovery saved = assetRecoveryRepository.save(asset);
        return mapToAssetRecoveryResponse(saved);
    }

    public AssetRecoveryResponse recordAssetReturn(UUID id, AssetRecoveryRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset recovery not found"));

        asset.setActualReturnDate(LocalDate.now());
        asset.setConditionOnReturn(request.getConditionOnReturn());
        asset.setRecoveredBy(currentUserId);

        if (request.getConditionOnReturn() == AssetRecovery.AssetCondition.DAMAGED ||
            request.getConditionOnReturn() == AssetRecovery.AssetCondition.NON_FUNCTIONAL) {
            asset.setStatus(AssetRecovery.RecoveryStatus.DAMAGED);
            asset.setDamageDescription(request.getDamageDescription());
            asset.setDeductionAmount(request.getDeductionAmount() != null ? request.getDeductionAmount() : BigDecimal.ZERO);
        } else {
            asset.setStatus(AssetRecovery.RecoveryStatus.RETURNED);
        }

        asset.setRemarks(request.getRemarks());

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    @Transactional
    public AssetRecoveryResponse markAssetAsLost(UUID id, BigDecimal deductionAmount, String remarks) {
        UUID tenantId = TenantContext.getCurrentTenant();
        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset recovery not found"));

        asset.setStatus(AssetRecovery.RecoveryStatus.LOST);
        asset.setDeductionAmount(deductionAmount != null ? deductionAmount : BigDecimal.ZERO);
        asset.setRemarks(remarks);

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    public AssetRecoveryResponse waiveAssetRecovery(UUID id, String waiverReason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset recovery not found"));

        asset.setStatus(AssetRecovery.RecoveryStatus.WAIVED);
        asset.setIsWaived(true);
        asset.setWaiverReason(waiverReason);
        asset.setWaivedBy(currentUserId);

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    public AssetRecoveryResponse verifyAssetReturn(UUID id) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID currentUserId = SecurityContext.getCurrentUserId();

        AssetRecovery asset = assetRecoveryRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Asset recovery not found"));

        asset.setVerifiedBy(currentUserId);
        asset.setVerificationDate(LocalDate.now());

        return mapToAssetRecoveryResponse(assetRecoveryRepository.save(asset));
    }

    @Transactional(readOnly = true)
    public List<AssetRecoveryResponse> getAssetsByExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRecoveryRepository.findByExitProcessIdAndTenantId(exitProcessId, tenantId)
                .stream().map(this::mapToAssetRecoveryResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AssetRecoveryResponse> getPendingAssetRecoveries() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return assetRecoveryRepository.findAllPending(tenantId)
                .stream().map(this::mapToAssetRecoveryResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalDeductionsForExitProcess(UUID exitProcessId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        BigDecimal total = assetRecoveryRepository.getTotalDeductionsByExitProcess(tenantId, exitProcessId);
        return total != null ? total : BigDecimal.ZERO;
    }

    @Transactional(readOnly = true)
    public boolean areAllAssetsRecovered(UUID exitProcessId) {
        return assetRecoveryRepository.areAllAssetsRecovered(exitProcessId);
    }

    // ==================== Exit Dashboard ====================

    @Transactional(readOnly = true)
    public Map<String, Object> getExitDashboard() {
        UUID tenantId = TenantContext.getCurrentTenant();
        Map<String, Object> dashboard = new HashMap<>();

        // Process stats
        dashboard.put("initiatedProcesses", exitProcessRepository.findByTenantIdAndStatus(tenantId, ExitProcess.ExitStatus.INITIATED).size());
        dashboard.put("inProgressProcesses", exitProcessRepository.findByTenantIdAndStatus(tenantId, ExitProcess.ExitStatus.IN_PROGRESS).size());
        dashboard.put("completedProcesses", exitProcessRepository.findByTenantIdAndStatus(tenantId, ExitProcess.ExitStatus.COMPLETED).size());

        // Settlement stats
        dashboard.put("pendingSettlements", settlementRepository.countByStatus(tenantId, FullAndFinalSettlement.SettlementStatus.PENDING_APPROVAL));
        dashboard.put("approvedSettlements", settlementRepository.countByStatus(tenantId, FullAndFinalSettlement.SettlementStatus.APPROVED));

        // Interview stats
        dashboard.put("scheduledInterviews", exitInterviewRepository.findByTenantIdAndStatus(tenantId, ExitInterview.InterviewStatus.SCHEDULED).size());
        dashboard.put("overdueInterviews", exitInterviewRepository.findOverdue(tenantId, LocalDate.now()).size());

        // Asset stats
        dashboard.put("pendingAssetRecoveries", assetRecoveryRepository.findAllPending(tenantId).size());
        dashboard.put("damagedOrLostAssets", assetRecoveryRepository.findDamagedOrLost(tenantId).size());

        return dashboard;
    }

    // ==================== Additional Mapper Methods ====================

    private FullAndFinalSettlementResponse mapToSettlementResponse(FullAndFinalSettlement settlement) {
        String employeeName = employeeRepository.findById(settlement.getEmployeeId())
                .map(Employee::getFullName).orElse(null);
        String preparedByName = settlement.getPreparedBy() != null ?
                employeeRepository.findById(settlement.getPreparedBy()).map(Employee::getFullName).orElse(null) : null;
        String approvedByName = settlement.getApprovedBy() != null ?
                employeeRepository.findById(settlement.getApprovedBy()).map(Employee::getFullName).orElse(null) : null;

        return FullAndFinalSettlementResponse.builder()
                .id(settlement.getId())
                .tenantId(settlement.getTenantId())
                .exitProcessId(settlement.getExitProcessId())
                .employeeId(settlement.getEmployeeId())
                .employeeName(employeeName)
                .pendingSalary(settlement.getPendingSalary())
                .leaveEncashment(settlement.getLeaveEncashment())
                .bonusAmount(settlement.getBonusAmount())
                .gratuityAmount(settlement.getGratuityAmount())
                .noticePeriodRecovery(settlement.getNoticePeriodRecovery())
                .reimbursements(settlement.getReimbursements())
                .otherEarnings(settlement.getOtherEarnings())
                .noticeBuyout(settlement.getNoticeBuyout())
                .loanRecovery(settlement.getLoanRecovery())
                .advanceRecovery(settlement.getAdvanceRecovery())
                .assetDamageDeduction(settlement.getAssetDamageDeduction())
                .taxDeduction(settlement.getTaxDeduction())
                .otherDeductions(settlement.getOtherDeductions())
                .totalEarnings(settlement.getTotalEarnings())
                .totalDeductions(settlement.getTotalDeductions())
                .netPayable(settlement.getNetPayable())
                .status(settlement.getStatus())
                .paymentMode(settlement.getPaymentMode())
                .paymentReference(settlement.getPaymentReference())
                .paymentDate(settlement.getPaymentDate())
                .preparedBy(settlement.getPreparedBy())
                .preparedByName(preparedByName)
                .approvedBy(settlement.getApprovedBy())
                .approvedByName(approvedByName)
                .approvalDate(settlement.getApprovalDate())
                .remarks(settlement.getRemarks())
                .yearsOfService(settlement.getYearsOfService())
                .isGratuityEligible(settlement.getIsGratuityEligible())
                .lastDrawnSalary(settlement.getLastDrawnSalary())
                .createdAt(settlement.getCreatedAt())
                .updatedAt(settlement.getUpdatedAt())
                .build();
    }

    private ExitInterviewResponse mapToExitInterviewResponse(ExitInterview interview) {
        String employeeName = employeeRepository.findById(interview.getEmployeeId())
                .map(Employee::getFullName).orElse(null);
        String interviewerName = interview.getInterviewerId() != null ?
                employeeRepository.findById(interview.getInterviewerId()).map(Employee::getFullName).orElse(null) : null;

        return ExitInterviewResponse.builder()
                .id(interview.getId())
                .tenantId(interview.getTenantId())
                .exitProcessId(interview.getExitProcessId())
                .employeeId(interview.getEmployeeId())
                .employeeName(employeeName)
                .interviewerId(interview.getInterviewerId())
                .interviewerName(interviewerName)
                .scheduledDate(interview.getScheduledDate())
                .scheduledTime(interview.getScheduledTime())
                .actualDate(interview.getActualDate())
                .interviewMode(interview.getInterviewMode())
                .status(interview.getStatus())
                .overallExperienceRating(interview.getOverallExperienceRating())
                .managementRating(interview.getManagementRating())
                .workLifeBalanceRating(interview.getWorkLifeBalanceRating())
                .growthOpportunitiesRating(interview.getGrowthOpportunitiesRating())
                .compensationRating(interview.getCompensationRating())
                .teamCultureRating(interview.getTeamCultureRating())
                .averageRating(interview.getAverageRating())
                .primaryReasonForLeaving(interview.getPrimaryReasonForLeaving())
                .detailedReason(interview.getDetailedReason())
                .whatLikedMost(interview.getWhatLikedMost())
                .whatCouldImprove(interview.getWhatCouldImprove())
                .suggestions(interview.getSuggestions())
                .wouldRecommendCompany(interview.getWouldRecommendCompany())
                .wouldConsiderReturning(interview.getWouldConsiderReturning())
                .newEmployer(interview.getNewEmployer())
                .newRole(interview.getNewRole())
                .newSalaryIncreasePercentage(interview.getNewSalaryIncreasePercentage())
                .interviewerNotes(interview.getInterviewerNotes())
                .isConfidential(interview.getIsConfidential())
                .createdAt(interview.getCreatedAt())
                .updatedAt(interview.getUpdatedAt())
                .build();
    }

    private AssetRecoveryResponse mapToAssetRecoveryResponse(AssetRecovery asset) {
        String employeeName = employeeRepository.findById(asset.getEmployeeId())
                .map(Employee::getFullName).orElse(null);
        String recoveredByName = asset.getRecoveredBy() != null ?
                employeeRepository.findById(asset.getRecoveredBy()).map(Employee::getFullName).orElse(null) : null;
        String verifiedByName = asset.getVerifiedBy() != null ?
                employeeRepository.findById(asset.getVerifiedBy()).map(Employee::getFullName).orElse(null) : null;
        String waivedByName = asset.getWaivedBy() != null ?
                employeeRepository.findById(asset.getWaivedBy()).map(Employee::getFullName).orElse(null) : null;

        return AssetRecoveryResponse.builder()
                .id(asset.getId())
                .tenantId(asset.getTenantId())
                .exitProcessId(asset.getExitProcessId())
                .employeeId(asset.getEmployeeId())
                .employeeName(employeeName)
                .assetId(asset.getAssetId())
                .assetName(asset.getAssetName())
                .assetType(asset.getAssetType())
                .assetTag(asset.getAssetTag())
                .serialNumber(asset.getSerialNumber())
                .assignedDate(asset.getAssignedDate())
                .expectedReturnDate(asset.getExpectedReturnDate())
                .actualReturnDate(asset.getActualReturnDate())
                .status(asset.getStatus())
                .conditionOnReturn(asset.getConditionOnReturn())
                .damageDescription(asset.getDamageDescription())
                .deductionAmount(asset.getDeductionAmount())
                .recoveredBy(asset.getRecoveredBy())
                .recoveredByName(recoveredByName)
                .verifiedBy(asset.getVerifiedBy())
                .verifiedByName(verifiedByName)
                .verificationDate(asset.getVerificationDate())
                .remarks(asset.getRemarks())
                .isWaived(asset.getIsWaived())
                .waiverReason(asset.getWaiverReason())
                .waivedBy(asset.getWaivedBy())
                .waivedByName(waivedByName)
                .isRecovered(asset.isRecovered())
                .createdAt(asset.getCreatedAt())
                .updatedAt(asset.getUpdatedAt())
                .build();
    }
}
