package com.hrms.application.recruitment.service;

import com.hrms.api.recruitment.dto.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.AgencySubmission;
import com.hrms.domain.recruitment.AgencySubmission.InvoiceStatus;
import com.hrms.domain.recruitment.AgencySubmission.SubmissionStatus;
import com.hrms.domain.recruitment.RecruitmentAgency;
import com.hrms.domain.recruitment.RecruitmentAgency.AgencyStatus;
import com.hrms.infrastructure.recruitment.repository.AgencyRepository;
import com.hrms.infrastructure.recruitment.repository.AgencySubmissionRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class AgencyService {

    private static final String AGENCY_NOT_FOUND = "Recruitment agency not found";
    private static final String SUBMISSION_NOT_FOUND = "Agency submission not found";

    private final AgencyRepository agencyRepository;
    private final AgencySubmissionRepository submissionRepository;
    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;

    // ==================== Agency CRUD ====================

    public AgencyDto createAgency(CreateAgencyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        RecruitmentAgency agency = RecruitmentAgency.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .contactPerson(request.getContactPerson())
                .email(request.getEmail())
                .phone(request.getPhone())
                .website(request.getWebsite())
                .address(request.getAddress())
                .feeType(request.getFeeType())
                .feeAmount(request.getFeeAmount())
                .contractStartDate(request.getContractStartDate())
                .contractEndDate(request.getContractEndDate())
                .status(request.getStatus() != null ? request.getStatus() : AgencyStatus.PENDING_APPROVAL)
                .specializations(request.getSpecializations())
                .notes(request.getNotes())
                .rating(request.getRating())
                .build();

        agency = agencyRepository.save(agency);
        log.info("Created recruitment agency: {} for tenant: {}", agency.getId(), tenantId);
        return toAgencyDto(agency);
    }

    @Transactional(readOnly = true)
    public Page<AgencyDto> listAgencies(String status, String search, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (search != null && !search.isBlank()) {
            return agencyRepository.findByTenantIdAndNameContainingIgnoreCase(tenantId, search, pageable)
                    .map(this::toAgencyDto);
        }

        if (status != null && !status.isBlank()) {
            AgencyStatus agencyStatus = AgencyStatus.valueOf(status.toUpperCase());
            return agencyRepository.findByTenantIdAndStatus(tenantId, agencyStatus, pageable)
                    .map(this::toAgencyDto);
        }

        return agencyRepository.findByTenantId(tenantId, pageable)
                .map(this::toAgencyDto);
    }

    @Transactional(readOnly = true)
    public AgencyDto getAgencyById(UUID agencyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RecruitmentAgency agency = agencyRepository.findByIdAndTenantId(agencyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(AGENCY_NOT_FOUND));
        return toAgencyDto(agency);
    }

    public AgencyDto updateAgency(UUID agencyId, UpdateAgencyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RecruitmentAgency agency = agencyRepository.findByIdAndTenantId(agencyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(AGENCY_NOT_FOUND));

        if (request.getName() != null) agency.setName(request.getName());
        if (request.getContactPerson() != null) agency.setContactPerson(request.getContactPerson());
        if (request.getEmail() != null) agency.setEmail(request.getEmail());
        if (request.getPhone() != null) agency.setPhone(request.getPhone());
        if (request.getWebsite() != null) agency.setWebsite(request.getWebsite());
        if (request.getAddress() != null) agency.setAddress(request.getAddress());
        if (request.getFeeType() != null) agency.setFeeType(request.getFeeType());
        if (request.getFeeAmount() != null) agency.setFeeAmount(request.getFeeAmount());
        if (request.getContractStartDate() != null) agency.setContractStartDate(request.getContractStartDate());
        if (request.getContractEndDate() != null) agency.setContractEndDate(request.getContractEndDate());
        if (request.getStatus() != null) agency.setStatus(request.getStatus());
        if (request.getSpecializations() != null) agency.setSpecializations(request.getSpecializations());
        if (request.getNotes() != null) agency.setNotes(request.getNotes());
        if (request.getRating() != null) agency.setRating(request.getRating());

        agency = agencyRepository.save(agency);
        log.info("Updated recruitment agency: {} for tenant: {}", agencyId, tenantId);
        return toAgencyDto(agency);
    }

    public void deleteAgency(UUID agencyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RecruitmentAgency agency = agencyRepository.findByIdAndTenantId(agencyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(AGENCY_NOT_FOUND));
        agency.softDelete();
        agencyRepository.save(agency);
        log.info("Soft-deleted recruitment agency: {} for tenant: {}", agencyId, tenantId);
    }

    // ==================== Submissions ====================

    public AgencySubmissionDto submitCandidate(UUID agencyId, CreateSubmissionRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        agencyRepository.findByIdAndTenantId(agencyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(AGENCY_NOT_FOUND));

        candidateRepository.findByIdAndTenantId(request.getCandidateId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Candidate not found"));

        jobOpeningRepository.findByIdAndTenantId(request.getJobOpeningId(), tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Job opening not found"));

        AgencySubmission submission = AgencySubmission.builder()
                .tenantId(tenantId)
                .agencyId(agencyId)
                .candidateId(request.getCandidateId())
                .jobOpeningId(request.getJobOpeningId())
                .submittedAt(LocalDateTime.now())
                .feeAgreed(request.getFeeAgreed())
                .feeCurrency(request.getFeeCurrency() != null ? request.getFeeCurrency() : "INR")
                .status(SubmissionStatus.SUBMITTED)
                .invoiceStatus(InvoiceStatus.NOT_APPLICABLE)
                .notes(request.getNotes())
                .build();

        submission = submissionRepository.save(submission);
        log.info("Created agency submission: {} for agency: {} tenant: {}", submission.getId(), agencyId, tenantId);
        return toSubmissionDto(submission);
    }

    public AgencySubmissionDto updateSubmissionStatus(UUID submissionId, UpdateSubmissionStatusRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        AgencySubmission submission = submissionRepository.findByIdAndTenantId(submissionId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(SUBMISSION_NOT_FOUND));

        submission.setStatus(request.getStatus());

        if (request.getStatus() == SubmissionStatus.HIRED) {
            submission.setHiredAt(request.getHiredAt() != null ? request.getHiredAt() : java.time.LocalDate.now());
            if (submission.getInvoiceStatus() == InvoiceStatus.NOT_APPLICABLE) {
                submission.setInvoiceStatus(InvoiceStatus.PENDING);
            }
        }

        if (request.getInvoiceStatus() != null) submission.setInvoiceStatus(request.getInvoiceStatus());
        if (request.getInvoiceAmount() != null) submission.setInvoiceAmount(request.getInvoiceAmount());
        if (request.getInvoiceDate() != null) submission.setInvoiceDate(request.getInvoiceDate());
        if (request.getHiredAt() != null) submission.setHiredAt(request.getHiredAt());
        if (request.getNotes() != null) submission.setNotes(request.getNotes());

        submission = submissionRepository.save(submission);
        log.info("Updated submission status: {} to {} for tenant: {}", submissionId, request.getStatus(), tenantId);
        return toSubmissionDto(submission);
    }

    @Transactional(readOnly = true)
    public Page<AgencySubmissionDto> getAgencySubmissions(UUID agencyId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        agencyRepository.findByIdAndTenantId(agencyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(AGENCY_NOT_FOUND));
        return submissionRepository.findByTenantIdAndAgencyId(tenantId, agencyId, pageable)
                .map(this::toSubmissionDto);
    }

    @Transactional(readOnly = true)
    public Page<AgencySubmissionDto> getSubmissionsByJobOpening(UUID jobOpeningId, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return submissionRepository.findByTenantIdAndJobOpeningId(tenantId, jobOpeningId, pageable)
                .map(this::toSubmissionDto);
    }

    // ==================== Performance ====================

    @Transactional(readOnly = true)
    public AgencyPerformanceDto getAgencyPerformance(UUID agencyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        RecruitmentAgency agency = agencyRepository.findByIdAndTenantId(agencyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException(AGENCY_NOT_FOUND));

        long total = submissionRepository.countByTenantIdAndAgencyId(tenantId, agencyId);
        long hired = submissionRepository.countByTenantIdAndAgencyIdAndStatus(tenantId, agencyId, SubmissionStatus.HIRED);
        long rejected = submissionRepository.countByTenantIdAndAgencyIdAndStatus(tenantId, agencyId, SubmissionStatus.REJECTED);

        long active = submissionRepository.countByTenantIdAndAgencyIdAndStatus(tenantId, agencyId, SubmissionStatus.SUBMITTED)
                + submissionRepository.countByTenantIdAndAgencyIdAndStatus(tenantId, agencyId, SubmissionStatus.SCREENING)
                + submissionRepository.countByTenantIdAndAgencyIdAndStatus(tenantId, agencyId, SubmissionStatus.SHORTLISTED)
                + submissionRepository.countByTenantIdAndAgencyIdAndStatus(tenantId, agencyId, SubmissionStatus.INTERVIEW);

        BigDecimal hireRate = total > 0
                ? BigDecimal.valueOf(hired).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        return AgencyPerformanceDto.builder()
                .agencyId(agencyId)
                .agencyName(agency.getName())
                .totalSubmissions(total)
                .hiredCount(hired)
                .rejectedCount(rejected)
                .activeSubmissions(active)
                .hireRate(hireRate)
                .rating(agency.getRating())
                .build();
    }

    // ==================== Mappers ====================

    private AgencyDto toAgencyDto(RecruitmentAgency agency) {
        return AgencyDto.builder()
                .id(agency.getId())
                .tenantId(agency.getTenantId())
                .name(agency.getName())
                .contactPerson(agency.getContactPerson())
                .email(agency.getEmail())
                .phone(agency.getPhone())
                .website(agency.getWebsite())
                .address(agency.getAddress())
                .feeType(agency.getFeeType())
                .feeAmount(agency.getFeeAmount())
                .contractStartDate(agency.getContractStartDate())
                .contractEndDate(agency.getContractEndDate())
                .status(agency.getStatus())
                .specializations(agency.getSpecializations())
                .notes(agency.getNotes())
                .rating(agency.getRating())
                .createdAt(agency.getCreatedAt())
                .updatedAt(agency.getUpdatedAt())
                .createdBy(agency.getCreatedBy())
                .lastModifiedBy(agency.getLastModifiedBy())
                .version(agency.getVersion())
                .build();
    }

    private AgencySubmissionDto toSubmissionDto(AgencySubmission submission) {
        String agencyName = null;
        String candidateName = null;
        String jobTitle = null;

        if (submission.getAgency() != null) {
            agencyName = submission.getAgency().getName();
        }
        if (submission.getCandidate() != null) {
            candidateName = submission.getCandidate().getFullName();
        }
        if (submission.getJobOpening() != null) {
            jobTitle = submission.getJobOpening().getJobTitle();
        }

        return AgencySubmissionDto.builder()
                .id(submission.getId())
                .tenantId(submission.getTenantId())
                .agencyId(submission.getAgencyId())
                .agencyName(agencyName)
                .candidateId(submission.getCandidateId())
                .candidateName(candidateName)
                .jobOpeningId(submission.getJobOpeningId())
                .jobTitle(jobTitle)
                .submittedAt(submission.getSubmittedAt())
                .feeAgreed(submission.getFeeAgreed())
                .feeCurrency(submission.getFeeCurrency())
                .status(submission.getStatus())
                .hiredAt(submission.getHiredAt())
                .invoiceStatus(submission.getInvoiceStatus())
                .invoiceAmount(submission.getInvoiceAmount())
                .invoiceDate(submission.getInvoiceDate())
                .notes(submission.getNotes())
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .version(submission.getVersion())
                .build();
    }
}
