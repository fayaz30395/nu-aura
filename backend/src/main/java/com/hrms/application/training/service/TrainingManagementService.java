package com.hrms.application.training.service;

import com.hrms.api.training.dto.*;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.training.TrainingEnrollment;
import com.hrms.domain.training.TrainingProgram;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.training.repository.TrainingEnrollmentRepository;
import com.hrms.infrastructure.training.repository.TrainingProgramRepository;
import com.hrms.common.security.TenantContext;
import com.hrms.application.audit.service.AuditLogService;
import com.hrms.domain.audit.AuditLog.AuditAction;
import com.hrms.application.event.DomainEventPublisher;
import com.hrms.domain.event.training.TrainingCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class TrainingManagementService {

    private final TrainingProgramRepository programRepository;
    private final TrainingEnrollmentRepository enrollmentRepository;
    private final EmployeeRepository employeeRepository;
    private final DomainEventPublisher domainEventPublisher;
    private final AuditLogService auditLogService;

    // ==================== Training Program Operations ====================

    @Transactional
    public TrainingProgramResponse createProgram(TrainingProgramRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating training program {} for tenant {}", request.getProgramCode(), tenantId);

        if (programRepository.existsByTenantIdAndProgramCode(tenantId, request.getProgramCode())) {
            throw new IllegalArgumentException("Program with code " + request.getProgramCode() + " already exists");
        }

        TrainingProgram program = new TrainingProgram();
        // BUG-FIX: Do NOT set ID manually — entity uses @GeneratedValue(strategy = UUID)
        // Setting ID manually causes Hibernate to treat this as a merge (update) instead of persist,
        // which fails with OptimisticLockingFailureException since the row doesn't exist yet.
        program.setTenantId(tenantId);
        program.setProgramCode(request.getProgramCode());
        program.setProgramName(request.getProgramName());
        program.setDescription(request.getDescription());
        program.setCategory(request.getCategory());
        program.setDeliveryMode(request.getDeliveryMode());
        program.setInstructorId(request.getInstructorId());
        program.setDurationHours(request.getDurationHours());
        program.setMaxParticipants(request.getMaxParticipants());
        program.setStartDate(request.getStartDate());
        program.setEndDate(request.getEndDate());
        program.setLocation(request.getLocation());
        program.setCost(request.getCost());
        program.setStatus(request.getStatus() != null ? request.getStatus() : TrainingProgram.ProgramStatus.DRAFT);
        program.setPrerequisites(request.getPrerequisites());
        program.setLearningObjectives(request.getLearningObjectives());

        TrainingProgram savedProgram = programRepository.save(program);
        return mapToProgramResponse(savedProgram);
    }

    @Transactional
    public TrainingProgramResponse updateProgram(UUID programId, TrainingProgramRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating training program {} for tenant {}", programId, tenantId);

        TrainingProgram program = programRepository.findByIdAndTenantId(programId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Training program not found"));

        program.setProgramName(request.getProgramName());
        program.setDescription(request.getDescription());
        program.setCategory(request.getCategory());
        program.setDeliveryMode(request.getDeliveryMode());
        program.setInstructorId(request.getInstructorId());
        program.setDurationHours(request.getDurationHours());
        program.setMaxParticipants(request.getMaxParticipants());
        program.setStartDate(request.getStartDate());
        program.setEndDate(request.getEndDate());
        program.setLocation(request.getLocation());
        program.setCost(request.getCost());
        program.setStatus(request.getStatus());
        program.setPrerequisites(request.getPrerequisites());
        program.setLearningObjectives(request.getLearningObjectives());

        TrainingProgram updatedProgram = programRepository.save(program);
        return mapToProgramResponse(updatedProgram);
    }

    @Transactional(readOnly = true)
    public TrainingProgramResponse getProgramById(UUID programId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TrainingProgram program = programRepository.findByIdAndTenantId(programId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Training program not found"));
        return mapToProgramResponse(program);
    }

    @Transactional(readOnly = true)
    public Page<TrainingProgramResponse> getAllPrograms(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return programRepository.findAll(
                (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId),
                pageable
        ).map(this::mapToProgramResponse);
    }

    @Transactional(readOnly = true)
    public List<TrainingProgramResponse> getProgramsByStatus(TrainingProgram.ProgramStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return programRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToProgramResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteProgram(UUID programId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TrainingProgram program = programRepository.findByIdAndTenantId(programId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Training program not found"));
        programRepository.delete(program);
    }

    // ==================== Training Enrollment Operations ====================

    public TrainingEnrollmentResponse enrollEmployee(TrainingEnrollmentRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Enrolling employee {} in program {} for tenant {}", request.getEmployeeId(), request.getProgramId(), tenantId);

        // Check if program exists
        TrainingProgram program = programRepository.findByIdAndTenantId(request.getProgramId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Training program not found"));

        // Check if employee exists
        Employee employee = employeeRepository.findByIdAndTenantId(request.getEmployeeId(), tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        // Check for duplicate enrollment
        if (enrollmentRepository.existsByTenantIdAndProgramIdAndEmployeeId(tenantId, request.getProgramId(), request.getEmployeeId())) {
            throw new IllegalArgumentException("Employee is already enrolled in this program");
        }

        // Check max participants
        Long currentEnrollments = enrollmentRepository.count(
                (root, query, cb) -> cb.and(
                        cb.equal(root.get("tenantId"), tenantId),
                        cb.equal(root.get("programId"), request.getProgramId()),
                        cb.notEqual(root.get("status"), TrainingEnrollment.EnrollmentStatus.CANCELLED)
                )
        );

        if (program.getMaxParticipants() != null && currentEnrollments >= program.getMaxParticipants()) {
            throw new IllegalArgumentException("Training program has reached maximum capacity");
        }

        TrainingEnrollment enrollment = new TrainingEnrollment();
        enrollment.setId(UUID.randomUUID());
        enrollment.setTenantId(tenantId);
        enrollment.setProgramId(request.getProgramId());
        enrollment.setEmployeeId(request.getEmployeeId());
        enrollment.setEnrollmentDate(request.getEnrollmentDate() != null ? request.getEnrollmentDate() : LocalDate.now());
        enrollment.setStatus(TrainingEnrollment.EnrollmentStatus.ENROLLED);
        enrollment.setNotes(request.getNotes());

        TrainingEnrollment savedEnrollment = enrollmentRepository.save(enrollment);

        try {
            auditLogService.logAction("TRAINING_ENROLLMENT", savedEnrollment.getId(), AuditAction.CREATE, null, null, "Employee " + request.getEmployeeId() + " enrolled in program " + request.getProgramId());
        } catch (Exception e) {
            log.warn("Audit log failed for training enroll: {}", e.getMessage());
        }

        return mapToEnrollmentResponse(savedEnrollment);
    }

    @Transactional
    public TrainingEnrollmentResponse updateEnrollmentStatus(UUID enrollmentId, TrainingEnrollment.EnrollmentStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TrainingEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Training enrollment not found"));

        enrollment.setStatus(status);
        if (status == TrainingEnrollment.EnrollmentStatus.COMPLETED) {
            enrollment.setCompletionDate(LocalDate.now());
        }

        TrainingEnrollment updatedEnrollment = enrollmentRepository.save(enrollment);
        return mapToEnrollmentResponse(updatedEnrollment);
    }

    @Transactional(readOnly = true)
    public List<TrainingEnrollmentResponse> getEnrollmentsByProgram(UUID programId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentRepository.findByTenantIdAndProgramId(tenantId, programId).stream()
                .map(this::mapToEnrollmentResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TrainingEnrollmentResponse> getEnrollmentsByEmployee(UUID employeeId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return enrollmentRepository.findByTenantIdAndEmployeeId(tenantId, employeeId).stream()
                .map(this::mapToEnrollmentResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public TrainingEnrollmentResponse completeTraining(UUID enrollmentId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Completing training enrollment {} for tenant {}", enrollmentId, tenantId);

        TrainingEnrollment enrollment = enrollmentRepository.findByIdAndTenantId(enrollmentId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Training enrollment not found"));

        if (enrollment.getStatus() == TrainingEnrollment.EnrollmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Training enrollment is already completed");
        }

        if (enrollment.getStatus() == TrainingEnrollment.EnrollmentStatus.CANCELLED
                || enrollment.getStatus() == TrainingEnrollment.EnrollmentStatus.DROPPED) {
            throw new IllegalArgumentException(
                    "Cannot complete a training enrollment with status " + enrollment.getStatus());
        }

        enrollment.setStatus(TrainingEnrollment.EnrollmentStatus.COMPLETED);
        enrollment.setCompletionDate(LocalDate.now());
        enrollment.setCompletedAt(LocalDateTime.now());

        TrainingEnrollment savedEnrollment = enrollmentRepository.save(enrollment);

        // Look up program name for the event
        String programName = programRepository.findByIdAndTenantId(enrollment.getProgramId(), tenantId)
                .map(TrainingProgram::getProgramName)
                .orElse("Unknown");

        domainEventPublisher.publish(TrainingCompletedEvent.of(
                this,
                tenantId,
                savedEnrollment.getId(),
                savedEnrollment.getEmployeeId(),
                savedEnrollment.getProgramId(),
                programName,
                savedEnrollment.getCompletedAt()
        ));

        try {
            auditLogService.logAction("TRAINING_ENROLLMENT", savedEnrollment.getId(), AuditAction.STATUS_CHANGE, null, null, "Training completed for program " + programName);
        } catch (Exception e) {
            log.warn("Audit log failed for training complete: {}", e.getMessage());
        }

        log.info("Training enrollment {} marked as COMPLETED, event published", enrollmentId);
        return mapToEnrollmentResponse(savedEnrollment);
    }

    // ==================== Mapper Methods ====================

    private TrainingProgramResponse mapToProgramResponse(TrainingProgram program) {
        String instructorName = null;
        if (program.getInstructorId() != null) {
            instructorName = employeeRepository.findByIdAndTenantId(program.getInstructorId(), program.getTenantId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        Integer currentEnrollments = Math.toIntExact(enrollmentRepository.count(
                (root, query, cb) -> cb.and(
                        cb.equal(root.get("tenantId"), program.getTenantId()),
                        cb.equal(root.get("programId"), program.getId()),
                        cb.notEqual(root.get("status"), TrainingEnrollment.EnrollmentStatus.CANCELLED)
                )
        ));

        return TrainingProgramResponse.builder()
                .id(program.getId())
                .tenantId(program.getTenantId())
                .programCode(program.getProgramCode())
                .programName(program.getProgramName())
                .description(program.getDescription())
                .category(program.getCategory())
                .deliveryMode(program.getDeliveryMode())
                .instructorId(program.getInstructorId())
                .instructorName(instructorName)
                .durationHours(program.getDurationHours())
                .maxParticipants(program.getMaxParticipants())
                .currentEnrollments(currentEnrollments)
                .startDate(program.getStartDate())
                .endDate(program.getEndDate())
                .location(program.getLocation())
                .cost(program.getCost())
                .status(program.getStatus())
                .prerequisites(program.getPrerequisites())
                .learningObjectives(program.getLearningObjectives())
                .createdAt(program.getCreatedAt())
                .updatedAt(program.getUpdatedAt())
                .build();
    }

    private TrainingEnrollmentResponse mapToEnrollmentResponse(TrainingEnrollment enrollment) {
        String programName = programRepository.findByIdAndTenantId(enrollment.getProgramId(), enrollment.getTenantId())
                .map(TrainingProgram::getProgramName)
                .orElse(null);

        String employeeName = employeeRepository.findByIdAndTenantId(enrollment.getEmployeeId(), enrollment.getTenantId())
                .map(Employee::getFullName)
                .orElse(null);

        return TrainingEnrollmentResponse.builder()
                .id(enrollment.getId())
                .tenantId(enrollment.getTenantId())
                .programId(enrollment.getProgramId())
                .programName(programName)
                .employeeId(enrollment.getEmployeeId())
                .employeeName(employeeName)
                .enrollmentDate(enrollment.getEnrollmentDate())
                .completionDate(enrollment.getCompletionDate())
                .status(enrollment.getStatus())
                .scorePercentage(enrollment.getScorePercentage())
                .feedback(enrollment.getFeedback())
                .certificateUrl(enrollment.getCertificateUrl())
                .notes(enrollment.getNotes())
                .createdAt(enrollment.getCreatedAt())
                .updatedAt(enrollment.getUpdatedAt())
                .build();
    }
}
