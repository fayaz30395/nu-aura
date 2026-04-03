package com.hrms.application.event.listener;

import com.hrms.api.employee.dto.CreateEmployeeRequest;
import com.hrms.api.onboarding.dto.OnboardingProcessRequest;
import com.hrms.application.employee.service.EmployeeService;
import com.hrms.application.onboarding.service.OnboardingManagementService;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.compensation.SalaryRevision;
import com.hrms.domain.event.recruitment.CandidateHiredEvent;
import com.hrms.domain.onboarding.OnboardingProcess;
import com.hrms.domain.payroll.SalaryStructure;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.compensation.repository.SalaryRevisionRepository;
import com.hrms.infrastructure.payroll.repository.SalaryStructureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Event listener that processes candidate hired events.
 *
 * <p>When a candidate transitions to the JOINED recruitment stage, this listener:</p>
 * <ul>
 *   <li>Creates an Employee record from candidate data</li>
 *   <li>Initiates the onboarding process</li>
 *   <li>Creates an initial SalaryStructure and SalaryRevision from the offered CTC</li>
 * </ul>
 *
 * <p>Uses {@link TransactionalEventListener} to ensure operations complete after
 * the candidate status update is committed, providing better isolation and error handling.</p>
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class CandidateHiredEventListener {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final EmployeeService employeeService;
    private final OnboardingManagementService onboardingService;
    private final SalaryStructureRepository salaryStructureRepository;
    private final SalaryRevisionRepository salaryRevisionRepository;

    /**
     * Handles the candidate hired event by:
     * 1. Creating an employee from candidate data
     * 2. Initiating the onboarding process
     * <p>
     * Runs AFTER the candidate status update transaction commits for better isolation.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCandidateHired(CandidateHiredEvent event) {
        log.info("Processing CandidateHiredEvent for candidate: {} ({})", event.getCandidateId(), event.getCandidateName());

        UUID tenantId = event.getTenantId();

        try {
            // Set tenant context for the operations
            TenantContext.setCurrentTenant(tenantId);

            // Step A: Create Employee from Candidate data
            CreateEmployeeRequest createEmployeeRequest = mapCandidateToEmployeeRequest(event);
            var employeeResponse = employeeService.createEmployee(createEmployeeRequest);
            UUID employeeId = employeeResponse.getId();
            log.info("Employee created successfully for candidate {}: {}", event.getCandidateId(), employeeId);

            // Step B: Trigger onboarding process generation
            try {
                OnboardingProcessRequest onboardingRequest = new OnboardingProcessRequest();
                onboardingRequest.setEmployeeId(employeeId);
                onboardingRequest.setProcessType(OnboardingProcess.ProcessType.ONBOARDING);
                onboardingRequest.setStartDate(event.getProposedJoiningDate() != null ? event.getProposedJoiningDate() : LocalDate.now());
                // Expected completion is 30 days from start
                if (event.getProposedJoiningDate() != null) {
                    onboardingRequest.setExpectedCompletionDate(event.getProposedJoiningDate().plusDays(30));
                }
                onboardingRequest.setNotes("Onboarding initiated automatically for hired candidate: " + event.getCandidateName());

                var onboardingResponse = onboardingService.createProcess(onboardingRequest);
                log.info("Onboarding process created successfully for employee {}: {}", employeeId, onboardingResponse.getId());
            } catch (RuntimeException e) {
                log.warn("Could not create onboarding process for employee {}: {}", employeeId, e.getMessage());
                // Don't fail the entire flow if onboarding creation fails
            }

            // Step C: Create initial salary structure and revision from offered CTC
            if (event.getOfferedCtc() != null && event.getOfferedCtc().compareTo(BigDecimal.ZERO) > 0) {
                try {
                    LocalDate effectiveDate = event.getProposedJoiningDate() != null
                            ? event.getProposedJoiningDate() : LocalDate.now();

                    SalaryStructure structure = SalaryStructure.builder()
                            .tenantId(tenantId)
                            .employeeId(employeeId)
                            .basicSalary(event.getOfferedCtc())
                            .effectiveDate(effectiveDate)
                            .isActive(true)
                            .build();
                    salaryStructureRepository.save(structure);
                    log.info("Initial salary structure created for employee {} with CTC {}",
                            employeeId, event.getOfferedCtc());

                    SalaryRevision revision = SalaryRevision.builder()
                            .tenantId(tenantId)
                            .employeeId(employeeId)
                            .revisionType(SalaryRevision.RevisionType.PROBATION_CONFIRMATION)
                            .previousSalary(BigDecimal.ZERO)
                            .newSalary(event.getOfferedCtc())
                            .incrementAmount(event.getOfferedCtc())
                            .effectiveDate(effectiveDate)
                            .status(SalaryRevision.RevisionStatus.APPLIED)
                            .justification("Initial salary from offer acceptance")
                            .newDesignation(event.getOfferedDesignation())
                            .currency("USD")
                            .build();
                    revision.calculateIncrement();
                    salaryRevisionRepository.save(revision);
                    log.info("Initial salary revision created for employee {}", employeeId);
                } catch (RuntimeException e) {
                    log.warn("Could not create initial salary structure for employee {}: {}",
                            employeeId, e.getMessage());
                    // Don't fail the entire flow if salary creation fails
                }
            }

            log.info("CandidateHiredEvent processing completed successfully for candidate: {}", event.getCandidateId());
        } catch (Exception e) { // Intentional broad catch — best-effort after-commit event listener
            log.error("Error processing CandidateHiredEvent for candidate {} ({}): {}",
                    event.getCandidateId(), event.getCandidateName(), e.getMessage(), e);
            // Log the error but don't propagate - the candidate hire is already committed
        } finally {
            TenantContext.clear();
        }
    }

    /**
     * Maps candidate and job opening data to an employee creation request.
     */
    private CreateEmployeeRequest mapCandidateToEmployeeRequest(CandidateHiredEvent event) {
        CreateEmployeeRequest request = new CreateEmployeeRequest();

        // Generate employee code from candidate code (prefix with "EMP-" and timestamp for uniqueness)
        String employeeCode = "EMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        request.setEmployeeCode(employeeCode);

        // Basic info from candidate
        String[] nameParts = event.getCandidateName().split("\\s+", 2);
        request.setFirstName(nameParts.length > 0 ? nameParts[0] : event.getCandidateName());
        request.setLastName(nameParts.length > 1 ? nameParts[1] : "");
        request.setWorkEmail(event.getEmail());
        request.setPhoneNumber(event.getPhone());

        // Job and organizational info
        request.setDesignation(event.getOfferedDesignation());
        request.setDepartmentId(event.getDepartmentId());
        request.setEmploymentType(mapEmploymentType(event.getEmploymentType()));
        request.setJoiningDate(event.getProposedJoiningDate() != null ? event.getProposedJoiningDate() : LocalDate.now());

        // Generate a temporary password - in production this should use secure generation or SSO
        String temporaryPassword = generateTemporaryPassword();
        request.setPassword(temporaryPassword);

        return request;
    }

    /**
     * Generates a cryptographically secure temporary password for the new employee.
     * Uses SecureRandom instead of Math.random() for security compliance.
     */
    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        StringBuilder password = new StringBuilder();
        for (int i = 0; i < 16; i++) {
            password.append(chars.charAt(SECURE_RANDOM.nextInt(chars.length())));
        }
        return password.toString();
    }

    /**
     * Map JobOpening.EmploymentType to Employee.EmploymentType
     */
    private Employee.EmploymentType mapEmploymentType(JobOpening.EmploymentType jobEmploymentType) {
        if (jobEmploymentType == null) {
            return Employee.EmploymentType.FULL_TIME; // default
        }

        return switch (jobEmploymentType) {
            case FULL_TIME -> Employee.EmploymentType.FULL_TIME;
            case PART_TIME -> Employee.EmploymentType.PART_TIME;
            case CONTRACT -> Employee.EmploymentType.CONTRACT;
            case INTERNSHIP -> Employee.EmploymentType.INTERN;
            case TEMPORARY -> Employee.EmploymentType.CONSULTANT;
        };
    }
}
