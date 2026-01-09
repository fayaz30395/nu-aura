package com.nulogic.hrms.attendance;

import com.nulogic.hrms.attendance.dto.AttendanceDayResponse;
import com.nulogic.hrms.attendance.dto.RegularizationRequestCreateRequest;
import com.nulogic.hrms.attendance.dto.RegularizationResponse;
import com.nulogic.hrms.attendance.dto.TimeEntryResponse;
import com.nulogic.hrms.config.HrmsProperties;
import com.nulogic.hrms.employee.Employee;
import com.nulogic.hrms.employee.EmployeeRepository;
import com.nulogic.hrms.iam.AuthorizationService;
import com.nulogic.hrms.iam.model.PermissionScope;
import com.nulogic.hrms.org.Org;
import com.nulogic.hrms.org.OrgService;
import com.nulogic.hrms.outbox.OutboxService;
import com.nulogic.hrms.outbox.payload.EmailNotificationPayload;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {
    private final AttendanceDayRepository attendanceDayRepository;
    private final RegularizationRequestRepository regularizationRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final AuthorizationService authorizationService;
    private final OrgService orgService;
    private final HrmsProperties properties;
    private final OutboxService outboxService;

    public AttendanceService(AttendanceDayRepository attendanceDayRepository,
                             RegularizationRequestRepository regularizationRequestRepository,
                             EmployeeRepository employeeRepository,
                             AuthorizationService authorizationService,
                             OrgService orgService,
                             HrmsProperties properties,
                             OutboxService outboxService) {
        this.attendanceDayRepository = attendanceDayRepository;
        this.regularizationRequestRepository = regularizationRequestRepository;
        this.employeeRepository = employeeRepository;
        this.authorizationService = authorizationService;
        this.orgService = orgService;
        this.properties = properties;
        this.outboxService = outboxService;
    }

    @Transactional
    public AttendanceDayResponse checkIn(UUID userId) {
        authorizationService.checkPermission(userId, "ATT", "CREATE", PermissionScope.SELF);
        Org org = orgService.getOrCreateOrg();
        Employee employee = employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        LocalDate today = LocalDate.now(zoneId());
        AttendanceDay day = attendanceDayRepository.findByOrg_IdAndEmployee_IdAndAttendanceDate(org.getId(), employee.getId(), today)
                .orElseGet(() -> createAttendanceDay(org, employee, today));

        if (day.getCheckInAt() != null) {
            throw new IllegalArgumentException("Already checked in for today");
        }

        day.setCheckInAt(OffsetDateTime.now(zoneId()));
        day.setStatus(determineStatus(day));
        return toResponse(attendanceDayRepository.save(day));
    }

    @Transactional
    public AttendanceDayResponse checkOut(UUID userId) {
        authorizationService.checkPermission(userId, "ATT", "UPDATE", PermissionScope.SELF);
        Org org = orgService.getOrCreateOrg();
        Employee employee = employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        LocalDate today = LocalDate.now(zoneId());
        AttendanceDay day = attendanceDayRepository.findByOrg_IdAndEmployee_IdAndAttendanceDate(org.getId(), employee.getId(), today)
                .orElseGet(() -> createAttendanceDay(org, employee, today));

        day.setCheckOutAt(OffsetDateTime.now(zoneId()));
        day.setStatus(determineStatus(day));
        return toResponse(attendanceDayRepository.save(day));
    }

    @Transactional(readOnly = true)
    public Page<AttendanceDayResponse> listDays(UUID userId, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ATT", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return switch (scope) {
            case ORG -> attendanceDayRepository.findByOrg_Id(org.getId(), pageable).map(this::toResponse);
            case DEPARTMENT -> {
                Employee self = getEmployeeForScope(userId, org);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield attendanceDayRepository.findByOrg_IdAndEmployee_DepartmentId(org.getId(), self.getDepartmentId(), pageable)
                        .map(this::toResponse);
            }
            case TEAM -> {
                Employee self = getEmployeeForScope(userId, org);
                yield attendanceDayRepository.findByOrg_IdAndEmployee_Manager_Id(org.getId(), self.getId(), pageable)
                        .map(this::toResponse);
            }
            case SELF -> {
                Employee self = getEmployeeForScope(userId, org);
                yield attendanceDayRepository.findByOrg_IdAndEmployee_Id(org.getId(), self.getId(), pageable)
                        .map(this::toResponse);
            }
        };
    }

    @Transactional(readOnly = true)
    public Page<AttendanceDayResponse> listByDate(UUID userId, LocalDate date, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ATT", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return switch (scope) {
            case ORG -> attendanceDayRepository.findByOrg_IdAndAttendanceDate(org.getId(), date, pageable)
                    .map(this::toResponse);
            case DEPARTMENT -> {
                Employee self = getEmployeeForScope(userId, org);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield attendanceDayRepository.findByOrg_IdAndEmployee_DepartmentIdAndAttendanceDate(
                                org.getId(), self.getDepartmentId(), date, pageable)
                        .map(this::toResponse);
            }
            case TEAM -> {
                Employee self = getEmployeeForScope(userId, org);
                yield attendanceDayRepository.findByOrg_IdAndEmployee_Manager_IdAndAttendanceDate(
                                org.getId(), self.getId(), date, pageable)
                        .map(this::toResponse);
            }
            case SELF -> {
                Employee self = getEmployeeForScope(userId, org);
                yield attendanceDayRepository.findByOrg_IdAndEmployee_IdAndAttendanceDate(
                                org.getId(), self.getId(), date, pageable)
                        .map(this::toResponse);
            }
        };
    }

    @Transactional(readOnly = true)
    public List<AttendanceDayResponse> listDaysInRange(UUID userId, LocalDate startDate, LocalDate endDate) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ATT", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return switch (scope) {
            case ORG -> attendanceDayRepository.findByOrg_IdAndAttendanceDateBetween(
                            org.getId(), startDate, endDate)
                    .stream()
                    .map(this::toResponse)
                    .toList();
            case DEPARTMENT -> {
                Employee self = getEmployeeForScope(userId, org);
                if (self.getDepartmentId() == null) {
                    yield List.of();
                }
                yield attendanceDayRepository.findByOrg_IdAndEmployee_DepartmentIdAndAttendanceDateBetween(
                                org.getId(), self.getDepartmentId(), startDate, endDate)
                        .stream()
                        .map(this::toResponse)
                        .toList();
            }
            case TEAM -> {
                Employee self = getEmployeeForScope(userId, org);
                yield attendanceDayRepository.findByOrg_IdAndEmployee_Manager_IdAndAttendanceDateBetween(
                                org.getId(), self.getId(), startDate, endDate)
                        .stream()
                        .map(this::toResponse)
                        .toList();
            }
            case SELF -> {
                Employee self = getEmployeeForScope(userId, org);
                yield attendanceDayRepository.findByOrg_IdAndEmployee_IdAndAttendanceDateBetween(
                                org.getId(), self.getId(), startDate, endDate)
                        .stream()
                        .map(this::toResponse)
                        .toList();
            }
        };
    }

    @Transactional(readOnly = true)
    public List<TimeEntryResponse> listTimeEntries(UUID userId, LocalDate date) {
        authorizationService.resolveScope(userId, "ATT", "VIEW");
        Org org = orgService.getOrCreateOrg();
        Employee self = getEmployeeForScope(userId, org);
        AttendanceDay day = attendanceDayRepository.findByOrg_IdAndEmployee_IdAndAttendanceDate(
                        org.getId(), self.getId(), date)
                .orElse(null);

        if (day == null || day.getCheckInAt() == null) {
            return List.of();
        }

        OffsetDateTime checkIn = day.getCheckInAt();
        OffsetDateTime checkOut = day.getCheckOutAt();
        long durationMinutes = checkOut != null ? Duration.between(checkIn, checkOut).toMinutes() : 0;

        return List.of(TimeEntryResponse.builder()
                .id(day.getId())
                .attendanceRecordId(day.getId())
                .entryType("REGULAR")
                .checkInTime(checkIn)
                .checkOutTime(checkOut)
                .durationMinutes(durationMinutes)
                .sequenceNumber(1)
                .open(checkOut == null)
                .build());
    }

    @Transactional
    public RegularizationResponse requestRegularization(UUID userId, RegularizationRequestCreateRequest request) {
        authorizationService.checkPermission(userId, "ATT", "CREATE", PermissionScope.SELF);
        Org org = orgService.getOrCreateOrg();
        Employee employee = employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        LocalDate date = request.getDate();
        if (!isWithinWindow(date)) {
            throw new IllegalArgumentException("Regularization window exceeded");
        }

        AttendanceDay day = attendanceDayRepository.findByOrg_IdAndEmployee_IdAndAttendanceDate(org.getId(), employee.getId(), date)
                .orElseGet(() -> createAttendanceDay(org, employee, date));

        if (day.getCheckInAt() != null && day.getCheckOutAt() != null) {
            throw new IllegalArgumentException("Attendance already complete for this date");
        }

        if (regularizationRequestRepository.existsByAttendanceDay_IdAndStatus(day.getId(), RegularizationStatus.PENDING)) {
            throw new IllegalArgumentException("Regularization request already pending for this date");
        }

        RegularizationRequest regularization = new RegularizationRequest();
        regularization.setOrg(org);
        regularization.setAttendanceDay(day);
        regularization.setEmployee(employee);
        regularization.setReasonCode(request.getReason());
        regularization.setComment(request.getComment().trim());
        regularization.setStatus(RegularizationStatus.PENDING);

        return toResponse(regularizationRequestRepository.save(regularization));
    }

    @Transactional(readOnly = true)
    public Page<RegularizationResponse> listRegularizations(UUID userId, Pageable pageable) {
        PermissionScope scope = authorizationService.resolveScope(userId, "ATT", "VIEW");
        Org org = orgService.getOrCreateOrg();
        return switch (scope) {
            case ORG -> regularizationRequestRepository.findByOrg_Id(org.getId(), pageable).map(this::toResponse);
            case DEPARTMENT -> {
                Employee self = getEmployeeForScope(userId, org);
                if (self.getDepartmentId() == null) {
                    yield Page.empty(pageable);
                }
                yield regularizationRequestRepository.findByOrg_IdAndEmployee_DepartmentId(org.getId(), self.getDepartmentId(), pageable)
                        .map(this::toResponse);
            }
            case TEAM -> {
                Employee self = getEmployeeForScope(userId, org);
                yield regularizationRequestRepository.findByOrg_IdAndEmployee_Manager_Id(org.getId(), self.getId(), pageable)
                        .map(this::toResponse);
            }
            case SELF -> {
                Employee self = getEmployeeForScope(userId, org);
                yield regularizationRequestRepository.findByOrg_IdAndEmployee_Id(org.getId(), self.getId(), pageable)
                        .map(this::toResponse);
            }
        };
    }

    @Transactional
    public RegularizationResponse approve(UUID userId, UUID requestId) {
        RegularizationRequest request = regularizationRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Regularization request not found"));
        Org org = orgService.getOrCreateOrg();
        ensureOrg(request, org);
        ensureApprovalScope(userId, request.getEmployee(), org, "ATT");

        if (request.getStatus() != RegularizationStatus.PENDING) {
            throw new IllegalArgumentException("Regularization already processed");
        }

        request.setStatus(RegularizationStatus.APPROVED);
        request.setApproverUserId(userId);
        RegularizationRequest saved = regularizationRequestRepository.save(request);

        AttendanceDay day = saved.getAttendanceDay();
        day.setStatus(AttendanceStatus.REGULARIZED);
        attendanceDayRepository.save(day);

        outboxService.enqueueEmail(EmailNotificationPayload.regularizationApproved(saved));
        return toResponse(saved);
    }

    @Transactional
    public RegularizationResponse reject(UUID userId, UUID requestId) {
        RegularizationRequest request = regularizationRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Regularization request not found"));
        Org org = orgService.getOrCreateOrg();
        ensureOrg(request, org);
        ensureApprovalScope(userId, request.getEmployee(), org, "ATT");

        if (request.getStatus() != RegularizationStatus.PENDING) {
            throw new IllegalArgumentException("Regularization already processed");
        }

        request.setStatus(RegularizationStatus.REJECTED);
        request.setApproverUserId(userId);
        RegularizationRequest saved = regularizationRequestRepository.save(request);

        outboxService.enqueueEmail(EmailNotificationPayload.regularizationRejected(saved));
        return toResponse(saved);
    }

    private AttendanceDay createAttendanceDay(Org org, Employee employee, LocalDate date) {
        AttendanceDay day = new AttendanceDay();
        day.setOrg(org);
        day.setEmployee(employee);
        day.setAttendanceDate(date);
        day.setStatus(AttendanceStatus.INCOMPLETE);
        return day;
    }

    private AttendanceStatus determineStatus(AttendanceDay day) {
        if (day.getCheckInAt() != null && day.getCheckOutAt() != null) {
            return AttendanceStatus.PRESENT;
        }
        return AttendanceStatus.INCOMPLETE;
    }

    private ZoneId zoneId() {
        return ZoneId.of(properties.getAttendance().getTimezone());
    }

    private boolean isWithinWindow(LocalDate date) {
        LocalDate today = LocalDate.now(zoneId());
        int window = properties.getAttendance().getRegularizationWindowDays();
        return !date.isAfter(today) && !date.isBefore(today.minusDays(window));
    }

    private Employee getEmployeeForScope(UUID userId, Org org) {
        return employeeRepository.findByOrg_IdAndUser_Id(org.getId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));
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

    private void ensureOrg(RegularizationRequest request, Org org) {
        if (!request.getOrg().getId().equals(org.getId())) {
            throw new IllegalArgumentException("Regularization request not found");
        }
    }

    private AttendanceDayResponse toResponse(AttendanceDay day) {
        return AttendanceDayResponse.builder()
                .id(day.getId())
                .employeeId(day.getEmployee().getId())
                .date(day.getAttendanceDate())
                .checkInAt(day.getCheckInAt())
                .checkOutAt(day.getCheckOutAt())
                .status(day.getStatus())
                .build();
    }

    private RegularizationResponse toResponse(RegularizationRequest request) {
        return RegularizationResponse.builder()
                .id(request.getId())
                .employeeId(request.getEmployee().getId())
                .date(request.getAttendanceDay().getAttendanceDate())
                .reason(request.getReasonCode())
                .comment(request.getComment())
                .status(request.getStatus())
                .approverUserId(request.getApproverUserId())
                .build();
    }
}
