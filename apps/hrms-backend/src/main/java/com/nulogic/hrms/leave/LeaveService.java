package com.nulogic.hrms.leave;

import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.leave.dto.LeaveBalanceResponse;
import com.nulogic.hrms.leave.dto.LeavePolicyRequest;
import com.nulogic.hrms.leave.dto.LeavePolicyResponse;
import com.nulogic.hrms.leave.dto.LeaveRequestCreateRequest;
import com.nulogic.hrms.leave.dto.LeaveRequestResponse;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.outbox.OutboxService;
import com.nulogic.hrms.outbox.payload.CalendarEventPayload;
import com.nulogic.hrms.outbox.payload.EmailNotificationPayload;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeaveService {
    private static final BigDecimal TWO = BigDecimal.valueOf(2);
    private final LeavePolicyRepository leavePolicyRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final OutboxService outboxService;

    public LeaveService(LeavePolicyRepository leavePolicyRepository,
                        LeaveBalanceRepository leaveBalanceRepository,
                        LeaveRequestRepository leaveRequestRepository,
                        EmployeeRepository employeeRepository,
                        AuthorizationService authorizationService,
                        OrgService orgService,
                        OutboxService outboxService) {
        this.leavePolicyRepository = leavePolicyRepository;
        this.leaveBalanceRepository = leaveBalanceRepository;
        this.leaveRequestRepository = leaveRequestRepository;
        this.employeeRepository = employeeRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.outboxService = outboxService;
    }

    @Transactional(readOnly = true)
    public List<LeavePolicyResponse> listPolicies(UUID userId) {
        authorizationService.resolveScope(userId, "LEAVE", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return leavePolicyRepository.findByOrg_Id(org.getId()).stream()
                .map(this::toPolicyResponse)
                .toList();
    }

    @Transactional
    public LeavePolicyResponse createPolicy(UUID userId, LeavePolicyRequest request) {
        authorizationService.checkPermission(userId, "LEAVE", "CREATE", PermissionScope.ORG);
        Org org = orgService.getOrCreateOrg();
        leavePolicyRepository.findByOrg_IdAndLeaveType(org.getId(), request.getLeaveType())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Leave policy already exists");
                });
        LeavePolicy policy = new LeavePolicy();
        policy.setOrg(org);
        policy.setLeaveType(request.getLeaveType());
        policy.setAnnualAllotment(scaleAmount(request.getAnnualAllotment()));
        return toPolicyResponse(leavePolicyRepository.save(policy));
    }

    @Transactional
    public List<LeaveBalanceResponse> getBalances(UUID userId, int year) {
        PermissionScope scope = authorizationService.resolveScope(userId, "LEAVE", "VIEW");
        Org org = orgService.getOrCreateOrg();
        Employee employee = getEmployeeForScope(userId, org, scope);
        List<LeavePolicy> policies = leavePolicyRepository.findByOrg_Id(org.getId());
        policies.forEach(policy -> ensureBalance(org, employee, policy.getLeaveType(), year, BigDecimal.ZERO));

        return leaveBalanceRepository.findByOrg_IdAndEmployee_IdAndYear(org.getId(), employee.getId(), year).stream()
                .map(balance -> LeaveBalanceResponse.builder()
                        .leaveType(balance.getLeaveType())
                        .year(balance.getYear())
                        .balance(balance.getBalance())
                        .build())
                .toList();
    }

    @Transactional
    public LeaveRequestResponse createRequest(UUID userId, LeaveRequestCreateRequest request) {
        authorizationService.checkPermission(userId, "LEAVE", "CREATE", PermissionScope.SELF);
        Org org = orgService.getOrCreateOrg();
        Employee employee = employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        validateRequest(request);
        if (leaveRequestRepository.existsByOrg_IdAndEmployee_IdAndStatusNotAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                org.getId(), employee.getId(), LeaveRequestStatus.REJECTED, request.getEndDate(), request.getStartDate())) {
            throw new IllegalArgumentException("Leave request overlaps with existing leave");
        }

        BigDecimal days = toHalfDayAmount(calculateLeaveDays(request));
        LeaveBalance balance = ensureBalance(org, employee, request.getLeaveType(), request.getStartDate().getYear(), days);
        if (balance.getBalance().compareTo(days) < 0) {
            throw new IllegalArgumentException("Insufficient leave balance");
        }

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setOrg(org);
        leaveRequest.setEmployee(employee);
        leaveRequest.setLeaveType(request.getLeaveType());
        leaveRequest.setStartDate(request.getStartDate());
        leaveRequest.setEndDate(request.getEndDate());
        leaveRequest.setHalfDay(request.isHalfDay());
        leaveRequest.setHalfDaySession(request.getHalfDaySession());
        leaveRequest.setStatus(LeaveRequestStatus.PENDING);
        leaveRequest.setReason(request.getReason());

        return toRequestResponse(leaveRequestRepository.save(leaveRequest));
    }

    @Transactional(readOnly = true)
    public Page<LeaveRequestResponse> listRequests(UUID userId, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "LEAVE", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return switch (scope) {
            case ORG -> leaveRequestRepository.findByOrg_Id(org.getId(), pageable).map(this::toRequestResponse);
            case DEPARTMENT -> {
                Employee self = getEmployeeForScope(userId, org, scope);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield leaveRequestRepository.findByOrg_IdAndEmployee_DepartmentId(org.getId(), self.getDepartmentId(), pageable)
                        .map(this::toRequestResponse);
            }
            case TEAM -> {
                Employee self = getEmployeeForScope(userId, org, scope);
                yield leaveRequestRepository.findByOrg_IdAndEmployee_Manager_Id(org.getId(), self.getId(), pageable)
                        .map(this::toRequestResponse);
            }
            case SELF -> {
                Employee self = getEmployeeForScope(userId, org, scope);
                yield leaveRequestRepository.findByOrg_IdAndEmployee_Id(org.getId(), self.getId(), pageable)
                        .map(this::toRequestResponse);
            }
        };
    }

    @Transactional
    public LeaveRequestResponse approve(UUID userId, UUID requestId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));
        Org org = orgService.getOrCreateOrg();
        ensureOrg(request, org);
        ensureApprovalScope(userId, request.getEmployee(), org, "LEAVE");

        if (request.getStatus() != LeaveRequestStatus.PENDING) {
            throw new IllegalArgumentException("Leave request already processed");
        }

        BigDecimal days = toHalfDayAmount(calculateLeaveDays(request));
        LeaveBalance balance = ensureBalance(org, request.getEmployee(), request.getLeaveType(), request.getStartDate().getYear(), days);
        if (balance.getBalance().compareTo(days) < 0) {
            throw new IllegalArgumentException("Insufficient leave balance");
        }

        balance.setBalance(roundToHalf(balance.getBalance().subtract(days)));
        leaveBalanceRepository.save(balance);

        request.setStatus(LeaveRequestStatus.APPROVED);
        request.setApproverUserId(userId);
        LeaveRequest saved = leaveRequestRepository.save(request);

        outboxService.enqueueEmail(EmailNotificationPayload.leaveApproved(saved));
        outboxService.enqueueCalendar(CalendarEventPayload.leaveApproved(saved));

        return toRequestResponse(saved);
    }

    @Transactional
    public LeaveRequestResponse reject(UUID userId, UUID requestId) {
        LeaveRequest request = leaveRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Leave request not found"));
        Org org = orgService.getOrCreateOrg();
        ensureOrg(request, org);
        ensureApprovalScope(userId, request.getEmployee(), org, "LEAVE");

        if (request.getStatus() != LeaveRequestStatus.PENDING) {
            throw new IllegalArgumentException("Leave request already processed");
        }

        request.setStatus(LeaveRequestStatus.REJECTED);
        request.setApproverUserId(userId);
        LeaveRequest saved = leaveRequestRepository.save(request);

        outboxService.enqueueEmail(EmailNotificationPayload.leaveRejected(saved));
        return toRequestResponse(saved);
    }

    private void ensureOrg(LeaveRequest request, Org org) {
        if (!request.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("Leave request not found");
        }
    }

    private Employee getEmployeeForScope(UUID userId, Org org, PermissionScope scope) {
        Employee employee = employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
        if (scope == PermissionScope.ORG) {
            return employee;
        }
        return employee;
    }

    private void ensureApprovalScope(UUID userId, Employee target, Org org, String module) {
        PermissionScope scope = authorizationService.resolveScope(userId, module, "APPROVE");
        if (scope == PermissionScope.ORG) {
            return;
        }
        Employee approver = employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Approver not found"));
        switch (scope) {
            case TEAM -> {
                if (target.getManager() == null || !target.getManager().getId().equals(approver.getId())) {
                    throw new IllegalArgumentException("Forbidden");
                }
            }
            case DEPARTMENT -> {
                if (approver.getDepartmentId() == null || target.getDepartmentId() == null
                        || !approver.getDepartmentId().equals(target.getDepartmentId())) {
                    throw new IllegalArgumentException("Forbidden");
                }
            }
            default -> throw new IllegalArgumentException("Forbidden");
        }
    }

    private void validateRequest(LeaveRequestCreateRequest request) {
        if (request.isHalfDay()) {
            if (request.getStartDate() == null || request.getEndDate() == null
                    || !request.getStartDate().equals(request.getEndDate())) {
                throw new IllegalArgumentException("Half-day leave must be for a single date");
            }
            if (request.getHalfDaySession() == null) {
                throw new IllegalArgumentException("Half-day session is required");
            }
        }
        if (request.getStartDate().isAfter(request.getEndDate())) {
            throw new IllegalArgumentException("Invalid date range");
        }
    }

    private double calculateLeaveDays(LeaveRequestCreateRequest request) {
        if (request.isHalfDay()) {
            return 0.5;
        }
        return countWeekdays(request.getStartDate(), request.getEndDate());
    }

    private double calculateLeaveDays(LeaveRequest request) {
        if (request.isHalfDay()) {
            return 0.5;
        }
        return countWeekdays(request.getStartDate(), request.getEndDate());
    }

    private double countWeekdays(LocalDate start, LocalDate end) {
        if (start.isAfter(end)) {
            return 0;
        }
        double count = 0;
        LocalDate current = start;
        while (!current.isAfter(end)) {
            DayOfWeek day = current.getDayOfWeek();
            if (day != DayOfWeek.SATURDAY && day != DayOfWeek.SUNDAY) {
                count += 1;
            }
            current = current.plusDays(1);
        }
        if (count == 0) {
            throw new IllegalArgumentException("Leave request has no working days");
        }
        return count;
    }

    private LeaveBalance ensureBalance(Org org, Employee employee, LeaveType type, int year, BigDecimal requestedDays) {
        LeaveBalance balance = leaveBalanceRepository.findByOrg_IdAndEmployee_IdAndLeaveTypeAndYear(
                org.getId(), employee.getId(), type, year).orElse(null);
        if (balance != null) {
            return balance;
        }
        LeavePolicy policy = leavePolicyRepository.findByOrg_IdAndLeaveType(org.getId(), type)
                .orElseThrow(() -> new IllegalArgumentException("Leave policy not configured"));
        BigDecimal allotment = proratedAllotment(policy.getAnnualAllotment(), employee.getJoinDate(), year);
        LeaveBalance created = new LeaveBalance();
        created.setOrg(org);
        created.setEmployee(employee);
        created.setLeaveType(type);
        created.setYear(year);
        created.setBalance(roundToHalf(allotment));
        return leaveBalanceRepository.save(created);
    }

    private BigDecimal proratedAllotment(BigDecimal annual, LocalDate joinDate, int year) {
        if (joinDate == null || joinDate.getYear() != year) {
            return annual;
        }
        LocalDate endOfYear = LocalDate.of(year, 12, 31);
        long daysRemaining = ChronoUnit.DAYS.between(joinDate, endOfYear.plusDays(1));
        long totalDays = endOfYear.lengthOfYear();
        BigDecimal fraction = BigDecimal.valueOf(daysRemaining)
                .divide(BigDecimal.valueOf(totalDays), 6, RoundingMode.HALF_UP);
        return annual.multiply(fraction);
    }

    private BigDecimal roundToHalf(BigDecimal value) {
        BigDecimal rounded = value.multiply(TWO).setScale(0, RoundingMode.HALF_UP);
        return rounded.divide(TWO, 2, RoundingMode.HALF_UP);
    }

    private BigDecimal toHalfDayAmount(double value) {
        return roundToHalf(BigDecimal.valueOf(value));
    }

    private BigDecimal scaleAmount(BigDecimal value) {
        if (value == null) {
            return null;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private LeavePolicyResponse toPolicyResponse(LeavePolicy policy) {
        return LeavePolicyResponse.builder()
                .id(policy.getId())
                .leaveType(policy.getLeaveType())
                .annualAllotment(policy.getAnnualAllotment())
                .build();
    }

    private LeaveRequestResponse toRequestResponse(LeaveRequest request) {
        return LeaveRequestResponse.builder()
                .id(request.getId())
                .employeeId(request.getEmployee().getId())
                .leaveType(request.getLeaveType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .halfDay(request.isHalfDay())
                .halfDaySession(request.getHalfDaySession())
                .status(request.getStatus())
                .approverUserId(request.getApproverUserId())
                .reason(request.getReason())
                .build();
    }
}
