package com.hrms.application.recruitment.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.recruitment.JobBoardPosting;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.recruitment.repository.JobBoardPostingRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Manages job postings to external job boards: Naukri, Indeed, LinkedIn.
 *
 * <p>Each board has its own API integration. Credentials are read from Spring
 * environment properties (configured via K8s secrets).</p>
 *
 * <p>Board API references:</p>
 * <ul>
 *   <li>Naukri: RMS API v2 (POST /v2/jobs)</li>
 *   <li>Indeed: Publisher API v5 (POST /jobs/v5/post)</li>
 *   <li>LinkedIn: Job Postings API v2 (POST /jobPostings)</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class JobBoardIntegrationService {

    // ---- Naukri config ----
    @Value("${integration.naukri.api-url:https://www.naukri.com/api/v2}")
    private String naukriApiUrl;
    @Value("${integration.naukri.client-id:}")
    private String naukriClientId;
    @Value("${integration.naukri.client-secret:}")
    private String naukriClientSecret;

    // ---- Indeed config ----
    @Value("${integration.indeed.api-url:https://apis.indeed.com/graphql}")
    private String indeedApiUrl;
    @Value("${integration.indeed.access-token:}")
    private String indeedAccessToken;
    @Value("${integration.indeed.employer-id:}")
    private String indeedEmployerId;

    // ---- LinkedIn config ----
    @Value("${integration.linkedin.api-url:https://api.linkedin.com/v2}")
    private String linkedinApiUrl;
    @Value("${integration.linkedin.access-token:}")
    private String linkedinAccessToken;
    @Value("${integration.linkedin.organization-id:}")
    private String linkedinOrganizationId;

    private final JobBoardPostingRepository jobBoardPostingRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final RestTemplate restTemplate;

    // ========== Post a job to one or more boards ==========

    /**
     * Post a job opening to the specified boards.
     *
     * @param jobOpeningId UUID of the job opening
     * @param boards       list of boards to post to
     * @return list of created/updated postings
     */
    @Transactional
    public List<JobBoardPosting> postJob(UUID jobOpeningId, List<JobBoardPosting.JobBoard> boards) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        JobOpening job = jobOpeningRepository.findById(jobOpeningId)
                .filter(j -> j.getTenantId().equals(tenantId))
                .orElseThrow(() -> new EntityNotFoundException("Job opening not found: " + jobOpeningId));

        List<JobBoardPosting> results = new ArrayList<>();
        for (JobBoardPosting.JobBoard board : boards) {
            JobBoardPosting posting = getOrCreatePosting(tenantId, jobOpeningId, board);
            if (posting.getStatus() == JobBoardPosting.PostingStatus.ACTIVE) {
                log.info("Job {} is already active on {}; skipping", jobOpeningId, board);
                results.add(posting);
                continue;
            }
            try {
                switch (board) {
                    case NAUKRI   -> postToNaukri(posting, job);
                    case INDEED   -> postToIndeed(posting, job);
                    case LINKEDIN -> postToLinkedIn(posting, job);
                    default       -> log.warn("Board {} integration not yet implemented", board);
                }
                posting.setStatus(JobBoardPosting.PostingStatus.ACTIVE);
                posting.setPostedAt(LocalDateTime.now());
                posting.setExpiresAt(LocalDateTime.now().plusDays(30));
                posting.setLastSyncedAt(LocalDateTime.now());
                posting.setErrorMessage(null);
            } catch (Exception e) {
                log.error("Failed to post job {} to {}: {}", jobOpeningId, board, e.getMessage());
                posting.setStatus(JobBoardPosting.PostingStatus.FAILED);
                posting.setErrorMessage(e.getMessage());
            }
            results.add(jobBoardPostingRepository.save(posting));
        }
        return results;
    }

    /**
     * Pause (deactivate) a posting on a board.
     */
    @Transactional
    public JobBoardPosting pausePosting(UUID postingId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        JobBoardPosting posting = jobBoardPostingRepository.findById(postingId)
                .filter(p -> p.getTenantId().equals(tenantId))
                .orElseThrow(() -> new EntityNotFoundException("Posting not found: " + postingId));

        try {
            switch (posting.getBoardName()) {
                case NAUKRI   -> pauseOnNaukri(posting);
                case INDEED   -> pauseOnIndeed(posting);
                case LINKEDIN -> pauseOnLinkedIn(posting);
                default       -> log.warn("Pause not implemented for {}", posting.getBoardName());
            }
            posting.setStatus(JobBoardPosting.PostingStatus.PAUSED);
        } catch (Exception e) {
            log.error("Failed to pause posting {} on {}: {}", postingId, posting.getBoardName(), e.getMessage());
            posting.setErrorMessage(e.getMessage());
        }
        return jobBoardPostingRepository.save(posting);
    }

    /**
     * Sync application counts from all boards (runs every 6 hours).
     */
    @Scheduled(cron = "0 0 */6 * * *")
    @Transactional
    public void syncApplicationCounts() {
        log.info("Syncing job board application counts");
        List<JobBoardPosting> activePostings = jobBoardPostingRepository
                .findAllExpiredPostings(LocalDateTime.now().plusYears(10)); // all active (not expired yet)
        // Refresh stats for each posting
        for (JobBoardPosting posting : activePostings) {
            try {
                syncPostingStats(posting);
                jobBoardPostingRepository.save(posting);
            } catch (Exception e) {
                log.warn("Failed to sync stats for posting {}: {}", posting.getId(), e.getMessage());
            }
        }
    }

    /**
     * Expire postings past their expiry date (runs daily at 2 AM).
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void expireOldPostings() {
        List<JobBoardPosting> expired = jobBoardPostingRepository
                .findAllExpiredPostings(LocalDateTime.now());
        expired.forEach(p -> {
            p.setStatus(JobBoardPosting.PostingStatus.EXPIRED);
            jobBoardPostingRepository.save(p);
        });
        if (!expired.isEmpty()) {
            log.info("Expired {} job board postings", expired.size());
        }
    }

    // ========== Queries ==========

    @Transactional(readOnly = true)
    public List<JobBoardPosting> getPostingsForJob(UUID jobOpeningId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return jobBoardPostingRepository.findAllByTenantIdAndJobOpeningId(tenantId, jobOpeningId);
    }

    @Transactional(readOnly = true)
    public Page<JobBoardPosting> getAllPostings(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return jobBoardPostingRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<JobBoardPosting> getPostingsByStatus(JobBoardPosting.PostingStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return jobBoardPostingRepository.findAllByTenantIdAndStatus(tenantId, status, pageable);
    }

    // ========== Naukri API ==========

    private void postToNaukri(JobBoardPosting posting, JobOpening job) {
        if (naukriClientId.isBlank() || naukriClientSecret.isBlank()) {
            throw new IllegalStateException("Naukri API credentials not configured");
        }

        String token = getNaukriAuthToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("title", job.getJobTitle());
        payload.put("description", buildJobDescription(job));
        payload.put("location", job.getLocation());
        payload.put("experience", job.getExperienceRequired());
        payload.put("jobType", mapEmploymentType(job.getEmploymentType()));
        payload.put("minSalary", job.getMinSalary());
        payload.put("maxSalary", job.getMaxSalary());
        payload.put("keySkills", job.getSkillsRequired());
        payload.put("noOfVacancies", job.getNumberOfOpenings());
        payload.put("externalRef", job.getJobCode());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    naukriApiUrl + "/jobs", HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Object jobId = response.getBody().get("jobId");
                if (jobId != null) {
                    posting.setExternalJobId(jobId.toString());
                    posting.setExternalUrl("https://www.naukri.com/job-listings-" + jobId);
                }
            }
            log.info("Posted to Naukri: jobCode={} externalId={}", job.getJobCode(), posting.getExternalJobId());
        } catch (RestClientException e) {
            throw new RuntimeException("Naukri API error: " + e.getMessage(), e);
        }
    }

    private String getNaukriAuthToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, String> creds = Map.of(
                "clientId", naukriClientId,
                "clientSecret", naukriClientSecret);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(creds, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
                naukriApiUrl + "/auth/token", HttpMethod.POST, entity, Map.class);
        if (response.getBody() != null && response.getBody().containsKey("access_token")) {
            return response.getBody().get("access_token").toString();
        }
        throw new RuntimeException("Could not obtain Naukri auth token");
    }

    private void pauseOnNaukri(JobBoardPosting posting) {
        if (posting.getExternalJobId() == null || naukriClientId.isBlank()) return;
        String token = getNaukriAuthToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        restTemplate.exchange(
                naukriApiUrl + "/jobs/" + posting.getExternalJobId() + "/deactivate",
                HttpMethod.PUT, new HttpEntity<>(headers), Void.class);
    }

    // ========== Indeed API ==========

    private void postToIndeed(JobBoardPosting posting, JobOpening job) {
        if (indeedAccessToken.isBlank() || indeedEmployerId.isBlank()) {
            throw new IllegalStateException("Indeed API credentials not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(indeedAccessToken);

        // Indeed uses GraphQL
        String mutation = """
            mutation PostJob($input: PostJobInput!) {
              postJob(input: $input) {
                jobId
                url
              }
            }
            """;

        Map<String, Object> variables = Map.of("input", Map.of(
                "employerId", indeedEmployerId,
                "title", job.getJobTitle(),
                "description", buildJobDescription(job),
                "location", job.getLocation(),
                "jobType", mapEmploymentType(job.getEmploymentType()),
                "salaryMin", job.getMinSalary(),
                "salaryMax", job.getMaxSalary(),
                "externalId", job.getJobCode()
        ));

        Map<String, Object> payload = Map.of("query", mutation, "variables", variables);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    indeedApiUrl, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                if (data != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> postJob = (Map<String, Object>) data.get("postJob");
                    if (postJob != null) {
                        posting.setExternalJobId(String.valueOf(postJob.get("jobId")));
                        posting.setExternalUrl(String.valueOf(postJob.get("url")));
                    }
                }
            }
            log.info("Posted to Indeed: jobCode={} externalId={}", job.getJobCode(), posting.getExternalJobId());
        } catch (RestClientException e) {
            throw new RuntimeException("Indeed API error: " + e.getMessage(), e);
        }
    }

    private void pauseOnIndeed(JobBoardPosting posting) {
        if (posting.getExternalJobId() == null || indeedAccessToken.isBlank()) return;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(indeedAccessToken);

        String mutation = """
            mutation CloseJob($jobId: ID!) {
              closeJob(jobId: $jobId) { success }
            }
            """;
        Map<String, Object> payload = Map.of("query", mutation,
                "variables", Map.of("jobId", posting.getExternalJobId()));
        restTemplate.exchange(indeedApiUrl, HttpMethod.POST,
                new HttpEntity<>(payload, headers), Map.class);
    }

    // ========== LinkedIn API ==========

    private void postToLinkedIn(JobBoardPosting posting, JobOpening job) {
        if (linkedinAccessToken.isBlank() || linkedinOrganizationId.isBlank()) {
            throw new IllegalStateException("LinkedIn API credentials not configured");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(linkedinAccessToken);
        headers.set("LinkedIn-Version", "202401");
        headers.set("X-Restli-Protocol-Version", "2.0.0");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("companyApplyUrl", "");
        payload.put("description", Map.of("text", buildJobDescription(job)));
        payload.put("employmentStatus", "FULL_TIME");
        payload.put("externalJobPostingId", job.getJobCode());
        payload.put("listedAt", System.currentTimeMillis());
        payload.put("location", Map.of("countryCode", "IN", "description", job.getLocation()));
        payload.put("title", job.getJobTitle());
        payload.put("integrationContext",
                "urn:li:organization:" + linkedinOrganizationId);
        payload.put("jobPostingOperationType", "CREATE");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    linkedinApiUrl + "/simpleJobPostings", HttpMethod.POST, entity, Map.class);

            if (response.getHeaders().getLocation() != null) {
                String location = response.getHeaders().getLocation().toString();
                // URN format: urn:li:simpleJobPosting:XXXXX
                String jobId = location.substring(location.lastIndexOf(':') + 1);
                posting.setExternalJobId(jobId);
                posting.setExternalUrl("https://www.linkedin.com/jobs/view/" + jobId);
            }
            log.info("Posted to LinkedIn: jobCode={} externalId={}", job.getJobCode(), posting.getExternalJobId());
        } catch (RestClientException e) {
            throw new RuntimeException("LinkedIn API error: " + e.getMessage(), e);
        }
    }

    private void pauseOnLinkedIn(JobBoardPosting posting) {
        if (posting.getExternalJobId() == null || linkedinAccessToken.isBlank()) return;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(linkedinAccessToken);
        headers.set("LinkedIn-Version", "202401");

        Map<String, Object> payload = Map.of("jobPostingOperationType", "CLOSE");
        restTemplate.exchange(
                linkedinApiUrl + "/simpleJobPostings/" + posting.getExternalJobId(),
                HttpMethod.POST, new HttpEntity<>(payload, headers), Void.class);
    }

    // ========== Stats sync ==========

    private void syncPostingStats(JobBoardPosting posting) {
        // Each board's stats API call — simplified stubs; implement per board
        switch (posting.getBoardName()) {
            case NAUKRI -> syncNaukriStats(posting);
            case INDEED -> syncIndeedStats(posting);
            case LINKEDIN -> syncLinkedInStats(posting);
            default -> {}
        }
        posting.setLastSyncedAt(LocalDateTime.now());
    }

    private void syncNaukriStats(JobBoardPosting posting) {
        if (posting.getExternalJobId() == null || naukriClientId.isBlank()) return;
        try {
            String token = getNaukriAuthToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(token);
            ResponseEntity<Map> response = restTemplate.exchange(
                    naukriApiUrl + "/jobs/" + posting.getExternalJobId() + "/stats",
                    HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getBody() != null) {
                Object apps = response.getBody().get("applicationsCount");
                Object views = response.getBody().get("viewsCount");
                if (apps != null) posting.setApplicationsCount(Integer.parseInt(apps.toString()));
                if (views != null) posting.setViewsCount(Integer.parseInt(views.toString()));
            }
        } catch (Exception e) {
            log.debug("Naukri stats sync failed for {}: {}", posting.getId(), e.getMessage());
        }
    }

    private void syncIndeedStats(JobBoardPosting posting) {
        if (posting.getExternalJobId() == null || indeedAccessToken.isBlank()) return;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(indeedAccessToken);
            String query = "{ jobStats(jobId: \"" + posting.getExternalJobId() + "\") { applications views } }";
            ResponseEntity<Map> response = restTemplate.exchange(
                    indeedApiUrl, HttpMethod.POST,
                    new HttpEntity<>(Map.of("query", query), headers), Map.class);
            if (response.getBody() != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> data = (Map<String, Object>) response.getBody().get("data");
                if (data != null) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> stats = (Map<String, Object>) data.get("jobStats");
                    if (stats != null) {
                        Object apps = stats.get("applications");
                        Object views = stats.get("views");
                        if (apps != null) posting.setApplicationsCount(Integer.parseInt(apps.toString()));
                        if (views != null) posting.setViewsCount(Integer.parseInt(views.toString()));
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Indeed stats sync failed for {}: {}", posting.getId(), e.getMessage());
        }
    }

    private void syncLinkedInStats(JobBoardPosting posting) {
        if (posting.getExternalJobId() == null || linkedinAccessToken.isBlank()) return;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(linkedinAccessToken);
            headers.set("LinkedIn-Version", "202401");
            ResponseEntity<Map> response = restTemplate.exchange(
                    linkedinApiUrl + "/simpleJobPostings/" + posting.getExternalJobId() + "/analytics",
                    HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            if (response.getBody() != null) {
                Object apps = response.getBody().get("applications");
                Object views = response.getBody().get("impressions");
                if (apps != null) posting.setApplicationsCount(Integer.parseInt(apps.toString()));
                if (views != null) posting.setViewsCount(Integer.parseInt(views.toString()));
            }
        } catch (Exception e) {
            log.debug("LinkedIn stats sync failed for {}: {}", posting.getId(), e.getMessage());
        }
    }

    // ========== Helpers ==========

    private JobBoardPosting getOrCreatePosting(UUID tenantId, UUID jobOpeningId, JobBoardPosting.JobBoard board) {
        return jobBoardPostingRepository
                .findByTenantIdAndJobOpeningIdAndBoardName(tenantId, jobOpeningId, board)
                .orElseGet(() -> jobBoardPostingRepository.save(
                        JobBoardPosting.builder()
                                .tenantId(tenantId)
                                .jobOpeningId(jobOpeningId)
                                .boardName(board)
                                .status(JobBoardPosting.PostingStatus.PENDING)
                                .build()));
    }

    private String buildJobDescription(JobOpening job) {
        StringBuilder sb = new StringBuilder();
        if (job.getJobDescription() != null) sb.append(job.getJobDescription()).append("\n\n");
        if (job.getRequirements() != null) sb.append("Requirements:\n").append(job.getRequirements()).append("\n\n");
        if (job.getSkillsRequired() != null) sb.append("Skills: ").append(job.getSkillsRequired());
        return sb.toString().trim();
    }

    private String mapEmploymentType(JobOpening.EmploymentType type) {
        if (type == null) return "FULL_TIME";
        return switch (type) {
            case FULL_TIME   -> "FULL_TIME";
            case PART_TIME   -> "PART_TIME";
            case CONTRACT    -> "CONTRACT";
            case TEMPORARY   -> "TEMPORARY";
            case INTERNSHIP  -> "INTERNSHIP";
        };
    }
}
