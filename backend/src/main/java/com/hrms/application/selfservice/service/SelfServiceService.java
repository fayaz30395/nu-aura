package com.hrms.application.selfservice.service;

import com.hrms.api.selfservice.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.attendance.AttendanceRecord;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.leave.LeaveBalance;
import com.hrms.domain.leave.LeaveRequest;
import com.hrms.domain.leave.LeaveType;
import com.hrms.domain.selfservice.DocumentRequest;
import com.hrms.domain.selfservice.ProfileUpdateRequest;
import com.hrms.domain.selfservice.ProfileUpdateRequest.RequestStatus;
import com.hrms.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.leave.repository.LeaveBalanceRepository;
import com.hrms.infrastructure.leave.repository.LeaveRequestRepository;
import com.hrms.infrastructure.leave.repository.LeaveTypeRepository;
import com.hrms.infrastructure.selfservice.repository.DocumentRequestRepository;
import com.hrms.infrastructure.selfservice.repository.ProfileUpdateRequestRepository;
import com.hrms.infrastructure.workflow.repository.StepExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class SelfServiceService {

    private final ProfileUpdateRequestRepository profileUpdateRequestRepository;
    private final DocumentRequestRepository documentRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final StepExecutionRepository stepExecutionRepository;

    // ==================== Profile Update Request Operations ====================

    @Transactional
    public ProfileUpdateResponse createProfileUpdateRequest(UUID employeeId, ProfileUpdateRequestDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if there's already a pending request for the same field
        List<ProfileUpdateRequest> existing = profileUpdateRequestRepository
                .findPendingByCategoryAndEmployee(employeeId, tenantId, request.getCategory());

        boolean hasSameFieldPending = existing.stream()
                .anyMatch(r -> r.getFieldName().equals(request.getFieldName()));

        if (hasSameFieldPending) {
            throw new BusinessException("A pending request already exists for this field");
        }

        ProfileUpdateRequest entity = ProfileUpdateRequest.builder()
                .employeeId(employeeId)
                .category(request.getCategory())
                .fieldName(request.getFieldName())
                .currentValue(request.getCurrentValue())
                .requestedValue(request.getRequestedValue())
                .reason(request.getReason())
                .supportingDocumentUrl(request.getSupportingDocumentUrl())
                .status(RequestStatus.PENDING)
                .build();
        entity.setTenantId(tenantId);

        ProfileUpdateRequest saved = profileUpdateRequestRepository.save(entity);
        log.info("Profile update request created: {} for employee: {}", saved.getId(), employeeId);

        return enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(saved), tenantId);
    }

    @Transactional(readOnly = true)
    public ProfileUpdateResponse getProfileUpdateRequestById(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProfileUpdateRequest entity = profileUpdateRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile update request not found: " + requestId));
        return enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(entity), tenantId);
    }

    @Transactional(readOnly = true)
    public Page<ProfileUpdateResponse> getMyProfileUpdateRequests(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return profileUpdateRequestRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(e -> enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(e), tenantId));
    }

    @Transactional(readOnly = true)
    public Page<ProfileUpdateResponse> getPendingProfileUpdateRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<RequestStatus> pendingStatuses = Arrays.asList(RequestStatus.PENDING, RequestStatus.UNDER_REVIEW);
        return profileUpdateRequestRepository.findByStatusIn(tenantId, pendingStatuses, pageable)
                .map(e -> enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(e), tenantId));
    }

    @Transactional(readOnly = true)
    public Page<ProfileUpdateResponse> getAllProfileUpdateRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return profileUpdateRequestRepository.findByTenantId(tenantId, pageable)
                .map(e -> enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(e), tenantId));
    }

    @Transactional
    public ProfileUpdateResponse approveProfileUpdateRequest(UUID requestId, UUID reviewerId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProfileUpdateRequest entity = profileUpdateRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile update request not found: " + requestId));

        if (!entity.isPending()) {
            throw new BusinessException("Request is not in pending state");
        }

        entity.approve(reviewerId, comments);
        ProfileUpdateRequest saved = profileUpdateRequestRepository.save(entity);

        // Apply the update to the employee profile
        applyProfileUpdate(saved, tenantId);

        log.info("Profile update request approved and applied: {}", requestId);
        return enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public ProfileUpdateResponse rejectProfileUpdateRequest(UUID requestId, UUID reviewerId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProfileUpdateRequest entity = profileUpdateRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile update request not found: " + requestId));

        if (!entity.isPending()) {
            throw new BusinessException("Request is not in pending state");
        }

        entity.reject(reviewerId, reason);
        ProfileUpdateRequest saved = profileUpdateRequestRepository.save(entity);

        log.info("Profile update request rejected: {}", requestId);
        return enrichProfileUpdateResponse(ProfileUpdateResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public void cancelProfileUpdateRequest(UUID requestId, UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ProfileUpdateRequest entity = profileUpdateRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile update request not found: " + requestId));

        if (!entity.getEmployeeId().equals(employeeId)) {
            throw new BusinessException("You can only cancel your own requests");
        }

        if (!entity.isPending()) {
            throw new BusinessException("Only pending requests can be cancelled");
        }

        entity.cancel();
        profileUpdateRequestRepository.save(entity);
        log.info("Profile update request cancelled: {}", requestId);
    }

    // ==================== Document Request Operations ====================

    @Transactional
    public DocumentRequestResponse createDocumentRequest(UUID employeeId, DocumentRequestDto request) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check for duplicate pending request
        List<DocumentRequest> existing = documentRequestRepository
                .findPendingByTypeAndEmployee(employeeId, tenantId, request.getDocumentType());

        if (!existing.isEmpty()) {
            throw new BusinessException("A pending request already exists for this document type");
        }

        DocumentRequest entity = DocumentRequest.builder()
                .employeeId(employeeId)
                .documentType(request.getDocumentType())
                .purpose(request.getPurpose())
                .addressedTo(request.getAddressedTo())
                .requiredByDate(request.getRequiredByDate())
                .deliveryMode(request.getDeliveryMode())
                .deliveryAddress(request.getDeliveryAddress())
                .priority(request.getPriority())
                .build();
        entity.setTenantId(tenantId);

        DocumentRequest saved = documentRequestRepository.save(entity);
        log.info("Document request created: {} for employee: {}", saved.getId(), employeeId);

        return enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(saved), tenantId);
    }

    @Transactional(readOnly = true)
    public DocumentRequestResponse getDocumentRequestById(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        DocumentRequest entity = documentRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Document request not found: " + requestId));
        return enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(entity), tenantId);
    }

    @Transactional(readOnly = true)
    public Page<DocumentRequestResponse> getMyDocumentRequests(UUID employeeId, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return documentRequestRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(e -> enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(e), tenantId));
    }

    @Transactional(readOnly = true)
    public Page<DocumentRequestResponse> getPendingDocumentRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        List<DocumentRequest.RequestStatus> pendingStatuses = Arrays.asList(
                DocumentRequest.RequestStatus.PENDING, DocumentRequest.RequestStatus.IN_PROGRESS);
        return documentRequestRepository.findByStatusIn(tenantId, pendingStatuses, pageable)
                .map(e -> enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(e), tenantId));
    }

    @Transactional(readOnly = true)
    public List<DocumentRequestResponse> getUrgentDocumentRequests() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate urgentDate = LocalDate.now().plusDays(3);
        return documentRequestRepository.findUrgentRequests(tenantId, urgentDate).stream()
                .map(e -> enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(e), tenantId))
                .toList();
    }

    public DocumentRequestResponse startProcessingDocument(UUID requestId, UUID processedById) {
        UUID tenantId = TenantContext.getCurrentTenant();
        DocumentRequest entity = documentRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Document request not found: " + requestId));

        if (entity.getStatus() != DocumentRequest.RequestStatus.PENDING) {
            throw new BusinessException("Only pending requests can be started");
        }

        entity.startProcessing(processedById);
        DocumentRequest saved = documentRequestRepository.save(entity);

        log.info("Document processing started: {}", requestId);
        return enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(saved), tenantId);
    }

    public DocumentRequestResponse completeDocumentRequest(UUID requestId, String documentUrl) {
        UUID tenantId = TenantContext.getCurrentTenant();
        DocumentRequest entity = documentRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Document request not found: " + requestId));

        if (entity.getStatus() != DocumentRequest.RequestStatus.IN_PROGRESS) {
            throw new BusinessException("Only in-progress requests can be completed");
        }

        entity.markGenerated(documentUrl);
        DocumentRequest saved = documentRequestRepository.save(entity);

        log.info("Document request completed: {}", requestId);
        return enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public DocumentRequestResponse markDocumentDelivered(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        DocumentRequest entity = documentRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Document request not found: " + requestId));

        if (entity.getStatus() != DocumentRequest.RequestStatus.GENERATED) {
            throw new BusinessException("Only generated documents can be marked as delivered");
        }

        entity.markDelivered();
        DocumentRequest saved = documentRequestRepository.save(entity);

        log.info("Document request delivered: {}", requestId);
        return enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(saved), tenantId);
    }

    @Transactional
    public DocumentRequestResponse rejectDocumentRequest(UUID requestId, UUID rejectedBy, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        DocumentRequest entity = documentRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Document request not found: " + requestId));

        entity.reject(rejectedBy, reason);
        DocumentRequest saved = documentRequestRepository.save(entity);

        log.info("Document request rejected: {}", requestId);
        return enrichDocumentRequestResponse(DocumentRequestResponse.fromEntity(saved), tenantId);
    }

    // ==================== Dashboard Operations ====================

    @Transactional(readOnly = true)
    public SelfServiceDashboardResponse getDashboard(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Get employee info
        Employee employee = employeeRepository.findByIdAndTenantId(employeeId, tenantId).orElse(null);

        // Get pending counts
        long pendingProfileUpdates = profileUpdateRequestRepository
                .findByEmployeeIdAndTenantId(employeeId, tenantId).stream()
                .filter(ProfileUpdateRequest::isPending)
                .count();

        long pendingDocumentRequests = documentRequestRepository
                .findByEmployeeIdAndTenantId(employeeId, tenantId).stream()
                .filter(d -> d.getStatus() == DocumentRequest.RequestStatus.PENDING ||
                             d.getStatus() == DocumentRequest.RequestStatus.IN_PROGRESS)
                .count();

        // Get leave balances
        Map<String, Double> leaveBalances = getLeaveBalancesMap(employeeId, tenantId);

        // Get pending leave requests count
        long pendingLeaveRequests = leaveRequestRepository.countPendingRequests(tenantId, employeeId);

        // Get attendance summary for current month
        AttendanceSummary attendanceSummary = getAttendanceSummaryForMonth(employeeId, tenantId);

        // Get pending approvals count (workflow items assigned to this user for approval)
        long pendingApprovals = stepExecutionRepository.countPendingForUser(tenantId, employeeId);

        SelfServiceDashboardResponse.SelfServiceDashboardResponseBuilder builder = SelfServiceDashboardResponse.builder()
                .pendingProfileUpdates((int) pendingProfileUpdates)
                .pendingDocumentRequests((int) pendingDocumentRequests)
                .leaveBalances(leaveBalances)
                .pendingLeaveRequests((int) pendingLeaveRequests)
                .pendingApprovals((int) pendingApprovals)
                .presentDaysThisMonth(attendanceSummary.presentDays)
                .absentDaysThisMonth(attendanceSummary.absentDays)
                .lateDaysThisMonth(attendanceSummary.lateDays)
                .attendancePercentage(attendanceSummary.attendancePercentage)
                .todayAttendanceStatus(attendanceSummary.todayStatus)
                .todayCheckInTime(attendanceSummary.todayCheckInTime)
                .todayCheckOutTime(attendanceSummary.todayCheckOutTime);

        // Add employee info if available
        if (employee != null) {
            builder.employeeName(employee.getFirstName() + " " + employee.getLastName())
                   .employeeId(employee.getEmployeeCode())
                   .designation(employee.getDesignation())
                   .dateOfJoining(employee.getJoiningDate());

            // Get reporting manager name
            if (employee.getManagerId() != null) {
                employeeRepository.findByIdAndTenantId(employee.getManagerId(), tenantId)
                        .ifPresent(manager -> builder.reportingManager(
                                manager.getFirstName() + " " + manager.getLastName()));
            }
        }

        return builder.build();
    }

    /**
     * Get leave balances map with leave type name as key and available balance as value
     */
    private Map<String, Double> getLeaveBalancesMap(UUID employeeId, UUID tenantId) {
        Map<String, Double> balances = new LinkedHashMap<>();
        int currentYear = Year.now().getValue();

        // Get all leave types for this tenant
        List<LeaveType> leaveTypes = leaveTypeRepository.findAllByTenantIdAndIsActive(tenantId, true);
        Map<UUID, String> leaveTypeNames = leaveTypes.stream()
                .collect(Collectors.toMap(LeaveType::getId, LeaveType::getLeaveName));

        // Get employee's leave balances for current year
        List<LeaveBalance> employeeBalances = leaveBalanceRepository.findByEmployeeIdAndYear(
                employeeId, currentYear, tenantId);

        for (LeaveBalance balance : employeeBalances) {
            String leaveTypeName = leaveTypeNames.get(balance.getLeaveTypeId());
            if (leaveTypeName != null) {
                balances.put(leaveTypeName, balance.getAvailable().doubleValue());
            }
        }

        return balances;
    }

    /**
     * Get attendance summary for the current month
     */
    private AttendanceSummary getAttendanceSummaryForMonth(UUID employeeId, UUID tenantId) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate startOfMonth = currentMonth.atDay(1);
        LocalDate today = LocalDate.now();

        List<AttendanceRecord> records = attendanceRecordRepository
                .findAllByTenantIdAndEmployeeIdAndAttendanceDateBetween(tenantId, employeeId, startOfMonth, today);

        int presentDays = 0;
        int absentDays = 0;
        int lateDays = 0;
        String todayStatus = "NOT_MARKED";
        LocalDateTime todayCheckInTime = null;
        LocalDateTime todayCheckOutTime = null;

        for (AttendanceRecord record : records) {
            AttendanceRecord.AttendanceStatus status = record.getStatus();

            if (status == AttendanceRecord.AttendanceStatus.PRESENT ||
                status == AttendanceRecord.AttendanceStatus.HALF_DAY) {
                presentDays++;
                if (Boolean.TRUE.equals(record.getIsLate())) {
                    lateDays++;
                }
            } else if (status == AttendanceRecord.AttendanceStatus.ABSENT) {
                absentDays++;
            }

            // Check if this is today's record
            if (record.getAttendanceDate().equals(today)) {
                todayStatus = status.name();
                todayCheckInTime = record.getCheckInTime();
                todayCheckOutTime = record.getCheckOutTime();
            }
        }

        // Calculate attendance percentage (considering only working days up to today)
        int totalWorkingDays = presentDays + absentDays;
        double attendancePercentage = totalWorkingDays > 0
                ? (presentDays * 100.0) / totalWorkingDays
                : 0.0;

        return new AttendanceSummary(presentDays, absentDays, lateDays, attendancePercentage, todayStatus,
                todayCheckInTime, todayCheckOutTime);
    }

    // Helper class for attendance summary
    private record AttendanceSummary(int presentDays, int absentDays, int lateDays,
                                     double attendancePercentage, String todayStatus,
                                     LocalDateTime todayCheckInTime, LocalDateTime todayCheckOutTime) {}

    // ==================== Helper Methods ====================

    /**
     * Apply the approved profile update to the employee record
     */
    private void applyProfileUpdate(ProfileUpdateRequest request, UUID tenantId) {
        Employee employee = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found: " + request.getEmployeeId()));

        String fieldName = request.getFieldName();
        String newValue = request.getRequestedValue();

        try {
            switch (fieldName.toLowerCase()) {
                // Personal Information
                case "firstname", "first_name" -> employee.setFirstName(newValue);
                case "lastname", "last_name" -> employee.setLastName(newValue);
                case "middlename", "middle_name" -> employee.setMiddleName(newValue);
                case "personalemail", "personal_email" -> employee.setPersonalEmail(newValue);
                case "phonenumber", "phone_number", "phone" -> employee.setPhoneNumber(newValue);
                case "emergencycontactnumber", "emergency_contact" -> employee.setEmergencyContactNumber(newValue);

                // Address Information
                case "address" -> employee.setAddress(newValue);
                case "city" -> employee.setCity(newValue);
                case "state" -> employee.setState(newValue);
                case "postalcode", "postal_code", "zipcode" -> employee.setPostalCode(newValue);
                case "country" -> employee.setCountry(newValue);

                // Date fields
                case "dateofbirth", "date_of_birth", "dob" -> {
                    if (newValue != null && !newValue.isEmpty()) {
                        employee.setDateOfBirth(LocalDate.parse(newValue));
                    }
                }

                // Gender
                case "gender" -> {
                    if (newValue != null && !newValue.isEmpty()) {
                        employee.setGender(Employee.Gender.valueOf(newValue.toUpperCase()));
                    }
                }

                default -> log.warn("Unknown profile field for update: {}. Update not applied.", fieldName);
            }

            employeeRepository.save(employee);
            log.info("Applied profile update for employee {}: {} = {}",
                    request.getEmployeeId(), fieldName, newValue);

        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.error("Failed to apply profile update for field {}: {}", fieldName, e.getMessage());
            throw new BusinessException("Failed to apply profile update: " + e.getMessage());
        }
    }

    private ProfileUpdateResponse enrichProfileUpdateResponse(ProfileUpdateResponse response, UUID tenantId) {
        employeeRepository.findByIdAndTenantId(response.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName());
                    response.setEmployeeEmail(emp.getPersonalEmail());
                });

        if (response.getReviewedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getReviewedBy(), tenantId)
                    .ifPresent(reviewer -> response.setReviewerName(
                            reviewer.getFirstName() + " " + reviewer.getLastName()));
        }

        return response;
    }

    private DocumentRequestResponse enrichDocumentRequestResponse(DocumentRequestResponse response, UUID tenantId) {
        employeeRepository.findByIdAndTenantId(response.getEmployeeId(), tenantId)
                .ifPresent(emp -> {
                    response.setEmployeeName(emp.getFirstName() + " " + emp.getLastName());
                    response.setEmployeeEmail(emp.getPersonalEmail());
                });

        if (response.getProcessedBy() != null) {
            employeeRepository.findByIdAndTenantId(response.getProcessedBy(), tenantId)
                    .ifPresent(processor -> response.setProcessedByName(
                            processor.getFirstName() + " " + processor.getLastName()));
        }

        return response;
    }
}
