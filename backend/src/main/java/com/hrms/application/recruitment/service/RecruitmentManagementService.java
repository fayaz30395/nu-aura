package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.*;
import com.hrms.domain.employee.Employee;
import com.hrms.domain.recruitment.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recruitment.repository.*;
import com.hrms.common.security.DataScopeService;
import com.hrms.common.security.Permission;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RecruitmentManagementService {

    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateRepository candidateRepository;
    private final InterviewRepository interviewRepository;
    private final EmployeeRepository employeeRepository;
    private final DataScopeService dataScopeService;

    // ==================== Job Opening Operations ====================

    public JobOpeningResponse createJobOpening(JobOpeningRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating job opening {} for tenant {}", request.getJobCode(), tenantId);

        if (jobOpeningRepository.existsByTenantIdAndJobCode(tenantId, request.getJobCode())) {
            throw new IllegalArgumentException("Job opening with code " + request.getJobCode() + " already exists");
        }

        JobOpening jobOpening = new JobOpening();
        jobOpening.setId(UUID.randomUUID());
        jobOpening.setTenantId(tenantId);
        jobOpening.setJobCode(request.getJobCode());
        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setDepartmentId(request.getDepartmentId());
        jobOpening.setLocation(request.getLocation());
        jobOpening.setEmploymentType(request.getEmploymentType());
        jobOpening.setExperienceRequired(request.getExperienceRequired());
        jobOpening.setMinSalary(request.getMinSalary());
        jobOpening.setMaxSalary(request.getMaxSalary());
        jobOpening.setNumberOfOpenings(request.getNumberOfOpenings());
        jobOpening.setJobDescription(request.getJobDescription());
        jobOpening.setRequirements(request.getRequirements());
        jobOpening.setSkillsRequired(request.getSkillsRequired());
        jobOpening.setHiringManagerId(request.getHiringManagerId());
        jobOpening.setStatus(request.getStatus() != null ? request.getStatus() : JobOpening.JobStatus.DRAFT);
        jobOpening.setPostedDate(request.getPostedDate());
        jobOpening.setClosingDate(request.getClosingDate());
        jobOpening.setPriority(request.getPriority());
        jobOpening.setIsActive(request.getIsActive() != null ? request.getIsActive() : true);

        JobOpening savedJobOpening = jobOpeningRepository.save(jobOpening);
        return mapToJobOpeningResponse(savedJobOpening);
    }

    public JobOpeningResponse updateJobOpening(UUID jobOpeningId, JobOpeningRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating job opening {} for tenant {}", jobOpeningId, tenantId);

        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        jobOpening.setJobTitle(request.getJobTitle());
        jobOpening.setDepartmentId(request.getDepartmentId());
        jobOpening.setLocation(request.getLocation());
        jobOpening.setEmploymentType(request.getEmploymentType());
        jobOpening.setExperienceRequired(request.getExperienceRequired());
        jobOpening.setMinSalary(request.getMinSalary());
        jobOpening.setMaxSalary(request.getMaxSalary());
        jobOpening.setNumberOfOpenings(request.getNumberOfOpenings());
        jobOpening.setJobDescription(request.getJobDescription());
        jobOpening.setRequirements(request.getRequirements());
        jobOpening.setSkillsRequired(request.getSkillsRequired());
        jobOpening.setHiringManagerId(request.getHiringManagerId());
        jobOpening.setStatus(request.getStatus());
        jobOpening.setPostedDate(request.getPostedDate());
        jobOpening.setClosingDate(request.getClosingDate());
        jobOpening.setPriority(request.getPriority());
        jobOpening.setIsActive(request.getIsActive());

        JobOpening updatedJobOpening = jobOpeningRepository.save(jobOpening);
        return mapToJobOpeningResponse(updatedJobOpening);
    }

    @Transactional(readOnly = true)
    public JobOpeningResponse getJobOpeningById(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));
        return mapToJobOpeningResponse(jobOpening);
    }

    @Transactional(readOnly = true)
    public Page<JobOpeningResponse> getAllJobOpenings(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<JobOpening> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<JobOpening> scopeSpec = dataScopeService.getScopeSpecification(Permission.RECRUITMENT_VIEW);

        return jobOpeningRepository.findAll(Specification.where(tenantSpec).and(scopeSpec), pageable)
                .map(this::mapToJobOpeningResponse);
    }

    @Transactional(readOnly = true)
    public List<JobOpeningResponse> getJobOpeningsByStatus(JobOpening.JobStatus status) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return jobOpeningRepository.findByTenantIdAndStatus(tenantId, status).stream()
                .map(this::mapToJobOpeningResponse)
                .collect(Collectors.toList());
    }

    public void deleteJobOpening(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        JobOpening jobOpening = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));
        jobOpeningRepository.delete(jobOpening);
    }

    // ==================== Candidate Operations ====================

    public CandidateResponse createCandidate(CandidateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating candidate {} for tenant {}", request.getEmail(), tenantId);

        if (candidateRepository.existsByTenantIdAndCandidateCode(tenantId, request.getCandidateCode())) {
            throw new IllegalArgumentException("Candidate with code " + request.getCandidateCode() + " already exists");
        }

        Candidate candidate = new Candidate();
        candidate.setId(UUID.randomUUID());
        candidate.setTenantId(tenantId);
        candidate.setCandidateCode(request.getCandidateCode());
        candidate.setJobOpeningId(request.getJobOpeningId());
        candidate.setFirstName(request.getFirstName());
        candidate.setLastName(request.getLastName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setCurrentLocation(request.getCurrentLocation());
        candidate.setCurrentCompany(request.getCurrentCompany());
        candidate.setCurrentDesignation(request.getCurrentDesignation());
        candidate.setTotalExperience(request.getTotalExperience());
        candidate.setCurrentCtc(request.getCurrentCtc());
        candidate.setExpectedCtc(request.getExpectedCtc());
        candidate.setNoticePeriodDays(request.getNoticePeriodDays());
        candidate.setResumeUrl(request.getResumeUrl());
        candidate.setSource(request.getSource());
        candidate.setStatus(request.getStatus() != null ? request.getStatus() : Candidate.CandidateStatus.NEW);
        candidate.setCurrentStage(request.getCurrentStage());
        candidate.setAppliedDate(request.getAppliedDate());
        candidate.setNotes(request.getNotes());
        candidate.setAssignedRecruiterId(request.getAssignedRecruiterId());

        Candidate savedCandidate = candidateRepository.save(candidate);
        return mapToCandidateResponse(savedCandidate);
    }

    public CandidateResponse updateCandidate(UUID candidateId, CandidateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating candidate {} for tenant {}", candidateId, tenantId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        candidate.setFirstName(request.getFirstName());
        candidate.setLastName(request.getLastName());
        candidate.setEmail(request.getEmail());
        candidate.setPhone(request.getPhone());
        candidate.setCurrentLocation(request.getCurrentLocation());
        candidate.setCurrentCompany(request.getCurrentCompany());
        candidate.setCurrentDesignation(request.getCurrentDesignation());
        candidate.setTotalExperience(request.getTotalExperience());
        candidate.setCurrentCtc(request.getCurrentCtc());
        candidate.setExpectedCtc(request.getExpectedCtc());
        candidate.setNoticePeriodDays(request.getNoticePeriodDays());
        candidate.setResumeUrl(request.getResumeUrl());
        candidate.setSource(request.getSource());
        candidate.setStatus(request.getStatus());
        candidate.setCurrentStage(request.getCurrentStage());
        candidate.setNotes(request.getNotes());
        candidate.setAssignedRecruiterId(request.getAssignedRecruiterId());

        Candidate updatedCandidate = candidateRepository.save(candidate);
        return mapToCandidateResponse(updatedCandidate);
    }

    @Transactional(readOnly = true)
    public CandidateResponse getCandidateById(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));
        return mapToCandidateResponse(candidate);
    }

    @Transactional(readOnly = true)
    public Page<CandidateResponse> getAllCandidates(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Specification<Candidate> tenantSpec = (root, query, cb) -> cb.equal(root.get("tenantId"), tenantId);
        Specification<Candidate> scopeSpec = dataScopeService.getScopeSpecification(Permission.CANDIDATE_VIEW);

        return candidateRepository.findAll(Specification.where(tenantSpec).and(scopeSpec), pageable)
                .map(this::mapToCandidateResponse);
    }

    @Transactional(readOnly = true)
    public List<CandidateResponse> getCandidatesByJobOpening(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return candidateRepository.findByTenantIdAndJobOpeningId(tenantId, jobOpeningId).stream()
                .map(this::mapToCandidateResponse)
                .collect(Collectors.toList());
    }

    public void deleteCandidate(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));
        candidateRepository.delete(candidate);
    }

    // ==================== Interview Operations ====================

    public InterviewResponse scheduleInterview(InterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Scheduling interview for candidate {} for tenant {}", request.getCandidateId(), tenantId);

        Interview interview = new Interview();
        interview.setId(UUID.randomUUID());
        interview.setTenantId(tenantId);
        interview.setCandidateId(request.getCandidateId());
        interview.setJobOpeningId(request.getJobOpeningId());
        interview.setInterviewRound(request.getInterviewRound());
        interview.setInterviewType(request.getInterviewType());
        interview.setScheduledAt(request.getScheduledAt());
        interview.setDurationMinutes(request.getDurationMinutes());
        interview.setInterviewerId(request.getInterviewerId());
        interview.setLocation(request.getLocation());
        interview.setMeetingLink(request.getMeetingLink());
        interview.setStatus(request.getStatus() != null ? request.getStatus() : Interview.InterviewStatus.SCHEDULED);
        interview.setFeedback(request.getFeedback());
        interview.setRating(request.getRating());
        interview.setResult(request.getResult());
        interview.setNotes(request.getNotes());

        Interview savedInterview = interviewRepository.save(interview);
        return mapToInterviewResponse(savedInterview);
    }

    public InterviewResponse updateInterview(UUID interviewId, InterviewRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Updating interview {} for tenant {}", interviewId, tenantId);

        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Interview not found"));

        interview.setInterviewRound(request.getInterviewRound());
        interview.setInterviewType(request.getInterviewType());
        interview.setScheduledAt(request.getScheduledAt());
        interview.setDurationMinutes(request.getDurationMinutes());
        interview.setInterviewerId(request.getInterviewerId());
        interview.setLocation(request.getLocation());
        interview.setMeetingLink(request.getMeetingLink());
        interview.setStatus(request.getStatus());
        interview.setFeedback(request.getFeedback());
        interview.setRating(request.getRating());
        interview.setResult(request.getResult());
        interview.setNotes(request.getNotes());

        Interview updatedInterview = interviewRepository.save(interview);
        return mapToInterviewResponse(updatedInterview);
    }

    @Transactional(readOnly = true)
    public InterviewResponse getInterviewById(UUID interviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Interview not found"));
        return mapToInterviewResponse(interview);
    }

    @Transactional(readOnly = true)
    public List<InterviewResponse> getInterviewsByCandidate(UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return interviewRepository.findByTenantIdAndCandidateId(tenantId, candidateId).stream()
                .map(this::mapToInterviewResponse)
                .collect(Collectors.toList());
    }

    public void deleteInterview(UUID interviewId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        Interview interview = interviewRepository.findByIdAndTenantId(interviewId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Interview not found"));
        interviewRepository.delete(interview);
    }

    // ==================== Mapper Methods ====================

    private JobOpeningResponse mapToJobOpeningResponse(JobOpening jobOpening) {
        String hiringManagerName = null;
        if (jobOpening.getHiringManagerId() != null) {
            hiringManagerName = employeeRepository.findById(jobOpening.getHiringManagerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        Integer candidateCount = candidateRepository.findByTenantIdAndJobOpeningId(
                jobOpening.getTenantId(), jobOpening.getId()).size();

        return JobOpeningResponse.builder()
                .id(jobOpening.getId())
                .tenantId(jobOpening.getTenantId())
                .jobCode(jobOpening.getJobCode())
                .jobTitle(jobOpening.getJobTitle())
                .departmentId(jobOpening.getDepartmentId())
                .departmentName(null)
                .location(jobOpening.getLocation())
                .employmentType(jobOpening.getEmploymentType())
                .experienceRequired(jobOpening.getExperienceRequired())
                .minSalary(jobOpening.getMinSalary())
                .maxSalary(jobOpening.getMaxSalary())
                .numberOfOpenings(jobOpening.getNumberOfOpenings())
                .jobDescription(jobOpening.getJobDescription())
                .requirements(jobOpening.getRequirements())
                .skillsRequired(jobOpening.getSkillsRequired())
                .hiringManagerId(jobOpening.getHiringManagerId())
                .hiringManagerName(hiringManagerName)
                .status(jobOpening.getStatus())
                .postedDate(jobOpening.getPostedDate())
                .closingDate(jobOpening.getClosingDate())
                .priority(jobOpening.getPriority())
                .isActive(jobOpening.getIsActive())
                .candidateCount(candidateCount)
                .createdAt(jobOpening.getCreatedAt())
                .updatedAt(jobOpening.getUpdatedAt())
                .build();
    }

    private CandidateResponse mapToCandidateResponse(Candidate candidate) {
        String jobTitle = jobOpeningRepository.findById(candidate.getJobOpeningId())
                .map(JobOpening::getJobTitle)
                .orElse(null);

        String recruiterName = null;
        if (candidate.getAssignedRecruiterId() != null) {
            recruiterName = employeeRepository.findById(candidate.getAssignedRecruiterId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return CandidateResponse.builder()
                .id(candidate.getId())
                .tenantId(candidate.getTenantId())
                .candidateCode(candidate.getCandidateCode())
                .jobOpeningId(candidate.getJobOpeningId())
                .jobTitle(jobTitle)
                .firstName(candidate.getFirstName())
                .lastName(candidate.getLastName())
                .fullName(candidate.getFullName())
                .email(candidate.getEmail())
                .phone(candidate.getPhone())
                .currentLocation(candidate.getCurrentLocation())
                .currentCompany(candidate.getCurrentCompany())
                .currentDesignation(candidate.getCurrentDesignation())
                .totalExperience(candidate.getTotalExperience())
                .currentCtc(candidate.getCurrentCtc())
                .expectedCtc(candidate.getExpectedCtc())
                .noticePeriodDays(candidate.getNoticePeriodDays())
                .resumeUrl(candidate.getResumeUrl())
                .source(candidate.getSource())
                .status(candidate.getStatus())
                .currentStage(candidate.getCurrentStage())
                .appliedDate(candidate.getAppliedDate())
                .notes(candidate.getNotes())
                .assignedRecruiterId(candidate.getAssignedRecruiterId())
                .assignedRecruiterName(recruiterName)
                .createdAt(candidate.getCreatedAt())
                .updatedAt(candidate.getUpdatedAt())
                .build();
    }

    private InterviewResponse mapToInterviewResponse(Interview interview) {
        String candidateName = candidateRepository.findById(interview.getCandidateId())
                .map(Candidate::getFullName)
                .orElse(null);

        String jobTitle = jobOpeningRepository.findById(interview.getJobOpeningId())
                .map(JobOpening::getJobTitle)
                .orElse(null);

        String interviewerName = null;
        if (interview.getInterviewerId() != null) {
            interviewerName = employeeRepository.findById(interview.getInterviewerId())
                    .map(Employee::getFullName)
                    .orElse(null);
        }

        return InterviewResponse.builder()
                .id(interview.getId())
                .tenantId(interview.getTenantId())
                .candidateId(interview.getCandidateId())
                .candidateName(candidateName)
                .jobOpeningId(interview.getJobOpeningId())
                .jobTitle(jobTitle)
                .interviewRound(interview.getInterviewRound())
                .interviewType(interview.getInterviewType())
                .scheduledAt(interview.getScheduledAt())
                .durationMinutes(interview.getDurationMinutes())
                .interviewerId(interview.getInterviewerId())
                .interviewerName(interviewerName)
                .location(interview.getLocation())
                .meetingLink(interview.getMeetingLink())
                .status(interview.getStatus())
                .feedback(interview.getFeedback())
                .rating(interview.getRating())
                .result(interview.getResult())
                .notes(interview.getNotes())
                .createdAt(interview.getCreatedAt())
                .updatedAt(interview.getUpdatedAt())
                .build();
    }
}
