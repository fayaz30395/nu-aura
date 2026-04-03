package com.hrms.application.publicapi.service;

import com.hrms.application.document.service.FileStorageService;
import com.hrms.domain.recruitment.Applicant;
import com.hrms.domain.recruitment.ApplicationStatus;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.recruitment.repository.ApplicantRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for the public career portal.
 *
 * <p>All methods are tenant-scoped but do NOT require authentication — they are
 * designed for use by anonymous candidates browsing the job board and submitting
 * applications. The tenant ID must be resolved by the caller (typically from
 * {@code TenantContext}, which is populated by {@code TenantFilter} via the
 * {@code X-Tenant-ID} request header).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PublicCareerService {

    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateRepository candidateRepository;
    private final ApplicantRepository applicantRepository;
    private final FileStorageService fileStorageService;

    // ─────────────────────────────────────────────────────────────────────────
    // Public API: Job Listings
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns a paginated list of publicly visible (OPEN) job postings for a tenant.
     *
     * @param tenantId       Tenant whose jobs to query.
     * @param q              Full-text search against job title and description.
     * @param department     Filter by department UUID (optional).
     * @param location       Partial match against location field (optional).
     * @param employmentType Exact match against employmentType enum name (optional).
     * @param page           Zero-based page number.
     * @param size           Page size (max enforced to 50).
     * @return Paginated response map with content, pagination metadata.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> findPublicOpenJobs(UUID tenantId, String q, String department,
                                                  String location, String employmentType,
                                                  int page, int size) {
        // Cap page size to prevent abuse
        int cappedSize = Math.min(size, 50);
        Pageable pageable = PageRequest.of(page, cappedSize, Sort.by(Sort.Direction.DESC, "postedDate"));

        Specification<JobOpening> spec = buildPublicJobSpec(tenantId, q, department, location, employmentType);
        Page<JobOpening> jobPage = jobOpeningRepository.findAll(spec, pageable);

        List<Map<String, Object>> content = jobPage.getContent().stream()
                .map(this::toPublicJobSummaryDto)
                .collect(Collectors.toList());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", content);
        response.put("totalElements", jobPage.getTotalElements());
        response.put("totalPages", jobPage.getTotalPages());
        response.put("currentPage", page);
        response.put("pageSize", cappedSize);
        response.put("hasNext", jobPage.hasNext());
        response.put("hasPrevious", jobPage.hasPrevious());
        return response;
    }

    /**
     * Returns the full detail of a single OPEN job posting.
     *
     * @param jobId    UUID of the job opening.
     * @param tenantId Tenant context for isolation.
     * @return Job detail DTO, or {@link Optional#empty()} if not found / not OPEN.
     */
    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> findPublicJobById(UUID jobId, UUID tenantId) {
        return jobOpeningRepository.findByIdAndTenantId(jobId, tenantId)
                .filter(job -> job.getStatus() == JobOpening.JobStatus.OPEN)
                .filter(job -> !job.isDeleted())
                .map(this::toPublicJobDetailDto);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API: Application Submission
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Processes a job application submitted through the public career portal.
     *
     * <p>Workflow:
     * <ol>
     *   <li>Validate the job opening is OPEN.</li>
     *   <li>Find an existing {@link Candidate} by email, or create one.</li>
     *   <li>Reject duplicate applications (same candidate + job).</li>
     *   <li>Upload resume to MinIO (non-blocking — failure is logged, not rethrown).</li>
     *   <li>Create the {@link Applicant} record linking the candidate to the job.</li>
     * </ol>
     *
     * @return Response map with {@code success}, {@code applicationReference}, and {@code message}.
     */
    @Transactional
    public Map<String, Object> submitPublicApplication(UUID tenantId, UUID jobId,
                                                       String firstName, String lastName,
                                                       String email, String phone,
                                                       String coverLetter, String expectedSalary,
                                                       MultipartFile resume) {
        // 1 – Validate job
        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobId, tenantId)
                .filter(j -> j.getStatus() == JobOpening.JobStatus.OPEN)
                .filter(j -> !j.isDeleted())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Job opening not found or is no longer accepting applications."));

        // 2 – Find or create candidate (email-deduplicated per tenant)
        Candidate candidate = candidateRepository.findByEmailAndTenantId(email, tenantId)
                .orElseGet(() -> createPublicCandidate(tenantId, jobId, firstName, lastName, email, phone));

        // 3 – Reject duplicate application
        if (applicantRepository.existsByCandidateIdAndJobOpeningIdAndTenantId(
                candidate.getId(), jobId, tenantId)) {
            log.info("Duplicate public application blocked: candidateEmail={}, jobId={}", email, jobId);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("success", false);
            response.put("alreadyApplied", true);
            response.put("applicationReference", candidate.getCandidateCode());
            response.put("message",
                    "You have already applied for this position. We will review your application and be in touch.");
            return response;
        }

        // 4 – Upload resume (best-effort; failure does not abort the application)
        String resumeObjectName = null;
        if (resume != null && !resume.isEmpty()) {
            try {
                FileStorageService.FileUploadResult result =
                        fileStorageService.uploadFile(resume, FileStorageService.CATEGORY_ATTACHMENTS, candidate.getId());
                resumeObjectName = result.getObjectName();
                if (candidate.getResumeUrl() == null) {
                    candidate.setResumeUrl(resumeObjectName);
                }
            } catch (Exception e) { // Intentional broad catch — public API error boundary
                log.warn("Resume upload failed for candidate {} (application will still be saved): {}",
                        email, e.getMessage());
            }
        }

        // 5 – Build and save applicant record
        Applicant applicant = new Applicant();
        applicant.setTenantId(tenantId);
        applicant.setCandidateId(candidate.getId());
        applicant.setJobOpeningId(jobId);
        applicant.setStatus(ApplicationStatus.APPLIED);
        applicant.setAppliedDate(LocalDate.now());
        applicant.setCurrentStageEnteredAt(LocalDateTime.now());
        applicant.setNotes(coverLetter);

        if (expectedSalary != null && !expectedSalary.isBlank()) {
            try {
                // Strip non-numeric characters (e.g. currency symbols, commas)
                String numericSalary = expectedSalary.replaceAll("[^\\d.]", "");
                if (!numericSalary.isBlank()) {
                    applicant.setExpectedSalary(new BigDecimal(numericSalary));
                }
            } catch (NumberFormatException ignored) {
                log.debug("Could not parse expectedSalary '{}' — ignoring", expectedSalary);
            }
        }

        candidateRepository.save(candidate);
        applicantRepository.save(applicant);

        log.info("Public application submitted: jobId={}, jobTitle='{}', candidateEmail={}, ref={}",
                jobId, job.getJobTitle(), email, candidate.getCandidateCode());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("success", true);
        response.put("applicationReference", candidate.getCandidateCode());
        response.put("jobTitle", job.getJobTitle());
        response.put("message",
                "Your application has been submitted successfully! We will review it and reach out soon.");
        response.put("submittedAt", LocalDateTime.now().toString());
        return response;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public API: Filter Options
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Returns distinct filter option values derived from currently OPEN job postings.
     * Locations and employment types are sorted alphabetically for consistent UI rendering.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getPublicJobFilters(UUID tenantId) {
        List<JobOpening> openJobs = jobOpeningRepository.findByTenantIdAndStatus(
                tenantId, JobOpening.JobStatus.OPEN);

        List<String> locations = openJobs.stream()
                .map(JobOpening::getLocation)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(l -> !l.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<String> employmentTypes = openJobs.stream()
                .map(JobOpening::getEmploymentType)
                .filter(Objects::nonNull)
                .map(Object::toString)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

        List<UUID> departmentIds = openJobs.stream()
                .map(JobOpening::getDepartmentId)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        int totalOpenPositions = openJobs.stream()
                .mapToInt(j -> j.getNumberOfOpenings() != null ? j.getNumberOfOpenings() : 1)
                .sum();

        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("locations", locations);
        filters.put("employmentTypes", employmentTypes);
        filters.put("departmentIds", departmentIds);
        filters.put("totalOpenPositions", totalOpenPositions);
        filters.put("totalOpenJobs", openJobs.size());
        return filters;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Builds a JPA {@link Specification} for public job search.
     * All predicates are ANDed; optional filters are skipped when blank/null.
     */
    private Specification<JobOpening> buildPublicJobSpec(UUID tenantId, String q, String department,
                                                         String location, String employmentType) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Mandatory: tenant + open status + not deleted
            predicates.add(cb.equal(root.get("tenantId"), tenantId));
            predicates.add(cb.equal(root.get("status"), JobOpening.JobStatus.OPEN));
            predicates.add(cb.or(
                    cb.isNull(root.get("isDeleted")),
                    cb.equal(root.get("isDeleted"), false)
            ));

            // Optional: full-text search (title OR description)
            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("jobTitle")), pattern),
                        cb.like(cb.lower(root.get("jobDescription")), pattern)
                ));
            }

            // Optional: department (accepts UUID string)
            if (department != null && !department.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("departmentId"), UUID.fromString(department)));
                } catch (IllegalArgumentException e) {
                    log.debug("Ignoring invalid department UUID filter: {}", department);
                }
            }

            // Optional: location (partial match)
            if (location != null && !location.isBlank()) {
                predicates.add(cb.like(
                        cb.lower(root.get("location")),
                        "%" + location.trim().toLowerCase() + "%"
                ));
            }

            // Optional: employment type (exact, case-insensitive via toUpperCase)
            if (employmentType != null && !employmentType.isBlank()) {
                predicates.add(cb.equal(
                        root.get("employmentType").as(String.class),
                        employmentType.trim().toUpperCase()
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Creates a new {@link Candidate} entity for a public applicant.
     * Uses a generated candidate code ({@code CAND-YYYYMMDD-XXXXXX}).
     */
    private Candidate createPublicCandidate(UUID tenantId, UUID jobOpeningId,
                                            String firstName, String lastName,
                                            String email, String phone) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE); // e.g. 20260316
        String suffix = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String code = "CAND-" + dateStr + "-" + suffix;

        Candidate candidate = new Candidate();
        candidate.setId(UUID.randomUUID());
        candidate.setTenantId(tenantId);
        candidate.setCandidateCode(code);
        candidate.setJobOpeningId(jobOpeningId);
        candidate.setFirstName(firstName);
        candidate.setLastName(lastName);
        candidate.setEmail(email);
        candidate.setPhone(phone);
        candidate.setSource(Candidate.CandidateSource.JOB_PORTAL);
        candidate.setStatus(Candidate.CandidateStatus.NEW);
        candidate.setAppliedDate(LocalDate.now());
        return candidate;
    }

    /**
     * Maps a {@link JobOpening} to a lightweight summary DTO for list views.
     * Deliberately omits salary, hiring manager, and internal fields.
     */
    private Map<String, Object> toPublicJobSummaryDto(JobOpening job) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", job.getId().toString());
        dto.put("jobCode", job.getJobCode());
        dto.put("jobTitle", job.getJobTitle());
        dto.put("location", job.getLocation());
        dto.put("employmentType", job.getEmploymentType());
        dto.put("experienceRequired", job.getExperienceRequired());
        dto.put("numberOfOpenings", job.getNumberOfOpenings());
        dto.put("priority", job.getPriority());
        dto.put("postedDate", job.getPostedDate());
        dto.put("closingDate", job.getClosingDate());
        dto.put("departmentId", job.getDepartmentId());

        // Teaser: first 300 chars of description for card views
        String desc = job.getJobDescription();
        if (desc != null && desc.length() > 300) {
            dto.put("descriptionTeaser", desc.substring(0, 297) + "...");
        } else {
            dto.put("descriptionTeaser", desc);
        }

        return dto;
    }

    /**
     * Maps a {@link JobOpening} to the full detail DTO shown on the job detail page.
     */
    private Map<String, Object> toPublicJobDetailDto(JobOpening job) {
        Map<String, Object> dto = new LinkedHashMap<>(toPublicJobSummaryDto(job));
        // Override teaser with full description
        dto.put("descriptionTeaser", null);
        dto.put("jobDescription", job.getJobDescription());
        dto.put("requirements", job.getRequirements());
        dto.put("skillsRequired", job.getSkillsRequired());
        return dto;
    }
}
