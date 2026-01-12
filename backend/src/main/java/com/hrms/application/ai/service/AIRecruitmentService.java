package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.*;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.ai.CandidateMatchScore;
import com.hrms.domain.recruitment.Candidate;
import com.hrms.domain.recruitment.JobOpening;
import com.hrms.infrastructure.ai.repository.CandidateMatchScoreRepository;
import com.hrms.infrastructure.recruitment.repository.CandidateRepository;
import com.hrms.infrastructure.recruitment.repository.JobOpeningRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.regex.Pattern;

/**
 * AI-powered recruitment service for:
 * - Resume parsing and data extraction
 * - Candidate-job matching and scoring
 * - Job description generation
 * - Interview question suggestions
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AIRecruitmentService {

    private final CandidateRepository candidateRepository;
    private final JobOpeningRepository jobOpeningRepository;
    private final CandidateMatchScoreRepository matchScoreRepository;
    private final RestTemplate restTemplate;

    @Value("${ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${ai.openai.base-url:https://api.openai.com/v1}")
    private String openAiBaseUrl;

    @Value("${ai.openai.model:gpt-4o-mini}")
    private String openAiModel;

    private static final String AI_MODEL_VERSION = "gpt-4o-mini-v1";

    // ==================== RESUME PARSING ====================

    /**
     * Parse resume text and extract structured candidate information
     */
    public ResumeParseResponse parseResume(String resumeText) {
        log.info("Parsing resume text of length: {}", resumeText.length());

        String prompt = buildResumeParsePrompt(resumeText);
        String aiResponse = callOpenAI(prompt);

        return parseResumeResponse(aiResponse);
    }

    /**
     * Parse resume from URL (PDF/DOC)
     */
    public ResumeParseResponse parseResumeFromUrl(String resumeUrl) {
        log.info("Parsing resume from URL: {}", resumeUrl);
        // For now, return a placeholder - would need PDF parsing library
        // In production, use Apache Tika or similar to extract text first
        return ResumeParseResponse.builder()
                .success(false)
                .message("URL parsing requires document extraction. Please provide resume text.")
                .build();
    }

    private String buildResumeParsePrompt(String resumeText) {
        return """
                You are an expert HR resume parser. Extract the following information from this resume in JSON format:

                {
                  "fullName": "string",
                  "email": "string",
                  "phone": "string",
                  "currentLocation": "string",
                  "currentCompany": "string",
                  "currentDesignation": "string",
                  "totalExperienceYears": number,
                  "skills": ["skill1", "skill2"],
                  "education": [
                    {
                      "degree": "string",
                      "institution": "string",
                      "year": number,
                      "score": "string"
                    }
                  ],
                  "experience": [
                    {
                      "company": "string",
                      "designation": "string",
                      "startDate": "string",
                      "endDate": "string",
                      "description": "string"
                    }
                  ],
                  "certifications": ["cert1", "cert2"],
                  "languages": ["lang1", "lang2"],
                  "summary": "Brief professional summary"
                }

                Resume:
                ---
                %s
                ---

                Return ONLY valid JSON, no explanations.
                """.formatted(resumeText);
    }

    private ResumeParseResponse parseResumeResponse(String aiResponse) {
        try {
            // Extract JSON from response
            String json = extractJson(aiResponse);

            // Parse the JSON response manually for now
            // In production, use Jackson ObjectMapper
            ResumeParseResponse.ResumeParseResponseBuilder builder = ResumeParseResponse.builder();
            builder.success(true);
            builder.rawJson(json);

            // Extract basic fields using regex (simple parsing)
            builder.fullName(extractJsonField(json, "fullName"));
            builder.email(extractJsonField(json, "email"));
            builder.phone(extractJsonField(json, "phone"));
            builder.currentLocation(extractJsonField(json, "currentLocation"));
            builder.currentCompany(extractJsonField(json, "currentCompany"));
            builder.currentDesignation(extractJsonField(json, "currentDesignation"));

            String expYears = extractJsonField(json, "totalExperienceYears");
            if (expYears != null && !expYears.isEmpty()) {
                try {
                    builder.totalExperienceYears(new BigDecimal(expYears.replaceAll("[^0-9.]", "")));
                } catch (NumberFormatException e) {
                    builder.totalExperienceYears(BigDecimal.ZERO);
                }
            }

            builder.skills(extractJsonArray(json, "skills"));
            builder.certifications(extractJsonArray(json, "certifications"));
            builder.languages(extractJsonArray(json, "languages"));
            builder.summary(extractJsonField(json, "summary"));

            return builder.build();
        } catch (Exception e) {
            log.error("Error parsing AI response: {}", e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Error parsing resume: " + e.getMessage())
                    .build();
        }
    }

    // ==================== CANDIDATE MATCHING ====================

    /**
     * Calculate match score between a candidate and a job opening using AI
     */
    public CandidateMatchResponse calculateMatchScore(UUID candidateId, UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Calculating match score for candidate {} and job {}", candidateId, jobOpeningId);

        Candidate candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Candidate not found"));

        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        String prompt = buildMatchingPrompt(candidate, job);
        String aiResponse = callOpenAI(prompt);

        CandidateMatchResponse response = parseMatchResponse(aiResponse, candidate, job);

        // Save the match score
        saveMatchScore(candidate, job, response);

        return response;
    }

    /**
     * Get AI-ranked candidates for a job opening
     */
    public List<CandidateMatchResponse> rankCandidatesForJob(UUID jobOpeningId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Ranking candidates for job {}", jobOpeningId);

        jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        List<Candidate> candidates = candidateRepository.findByTenantIdAndJobOpeningId(tenantId, jobOpeningId);

        List<CandidateMatchResponse> rankedCandidates = new ArrayList<>();

        for (Candidate candidate : candidates) {
            try {
                CandidateMatchResponse match = calculateMatchScore(candidate.getId(), jobOpeningId);
                rankedCandidates.add(match);
            } catch (Exception e) {
                log.error("Error calculating match for candidate {}: {}", candidate.getId(), e.getMessage());
            }
        }

        // Sort by overall score descending
        rankedCandidates.sort((a, b) -> Double.compare(b.getOverallScore(), a.getOverallScore()));

        return rankedCandidates;
    }

    private String buildMatchingPrompt(Candidate candidate, JobOpening job) {
        return """
                You are an expert HR recruiter. Analyze the match between this candidate and job opening.

                JOB OPENING:
                - Title: %s
                - Description: %s
                - Requirements: %s
                - Required Skills: %s
                - Experience Required: %s
                - Location: %s

                CANDIDATE:
                - Name: %s
                - Current Role: %s at %s
                - Total Experience: %s years
                - Location: %s
                - Current CTC: %s
                - Expected CTC: %s
                - Notice Period: %s days

                Provide analysis in this JSON format:
                {
                  "overallScore": number (0-100),
                  "skillsScore": number (0-100),
                  "experienceScore": number (0-100),
                  "educationScore": number (0-100),
                  "culturalFitScore": number (0-100),
                  "strengths": ["strength1", "strength2"],
                  "gaps": ["gap1", "gap2"],
                  "recommendation": "HIGHLY_RECOMMENDED" | "RECOMMENDED" | "CONSIDER" | "NOT_RECOMMENDED",
                  "summary": "Brief assessment summary",
                  "interviewFocus": ["area1", "area2"]
                }

                Return ONLY valid JSON.
                """.formatted(
                job.getJobTitle(),
                job.getJobDescription() != null ? job.getJobDescription() : "Not specified",
                job.getRequirements() != null ? job.getRequirements() : "Not specified",
                job.getSkillsRequired() != null ? job.getSkillsRequired() : "Not specified",
                job.getExperienceRequired() != null ? job.getExperienceRequired() : "Not specified",
                job.getLocation() != null ? job.getLocation() : "Not specified",
                candidate.getFullName(),
                candidate.getCurrentDesignation() != null ? candidate.getCurrentDesignation() : "Not specified",
                candidate.getCurrentCompany() != null ? candidate.getCurrentCompany() : "Not specified",
                candidate.getTotalExperience() != null ? candidate.getTotalExperience() : "Not specified",
                candidate.getCurrentLocation() != null ? candidate.getCurrentLocation() : "Not specified",
                candidate.getCurrentCtc() != null ? candidate.getCurrentCtc() : "Not specified",
                candidate.getExpectedCtc() != null ? candidate.getExpectedCtc() : "Not specified",
                candidate.getNoticePeriodDays() != null ? candidate.getNoticePeriodDays() : "Not specified");
    }

    private CandidateMatchResponse parseMatchResponse(String aiResponse, Candidate candidate, JobOpening job) {
        try {
            String json = extractJson(aiResponse);

            return CandidateMatchResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .overallScore(parseDouble(extractJsonField(json, "overallScore"), 0))
                    .skillsScore(parseDouble(extractJsonField(json, "skillsScore"), 0))
                    .experienceScore(parseDouble(extractJsonField(json, "experienceScore"), 0))
                    .educationScore(parseDouble(extractJsonField(json, "educationScore"), 0))
                    .culturalFitScore(parseDouble(extractJsonField(json, "culturalFitScore"), 0))
                    .strengths(extractJsonArray(json, "strengths"))
                    .gaps(extractJsonArray(json, "gaps"))
                    .recommendation(extractJsonField(json, "recommendation"))
                    .summary(extractJsonField(json, "summary"))
                    .interviewFocus(extractJsonArray(json, "interviewFocus"))
                    .aiModelVersion(AI_MODEL_VERSION)
                    .build();
        } catch (Exception e) {
            log.error("Error parsing match response: {}", e.getMessage());
            return CandidateMatchResponse.builder()
                    .candidateId(candidate.getId())
                    .candidateName(candidate.getFullName())
                    .jobOpeningId(job.getId())
                    .jobTitle(job.getJobTitle())
                    .overallScore(0)
                    .recommendation("CONSIDER")
                    .summary("Unable to analyze - " + e.getMessage())
                    .build();
        }
    }

    private void saveMatchScore(Candidate candidate, JobOpening job, CandidateMatchResponse response) {
        UUID tenantId = TenantContext.getCurrentTenant();

        // Check if score already exists
        Optional<CandidateMatchScore> existing = matchScoreRepository
                .findByCandidateIdAndJobOpeningIdAndTenantId(candidate.getId(), job.getId(), tenantId);

        CandidateMatchScore score;
        if (existing.isPresent()) {
            score = existing.get();
        } else {
            score = new CandidateMatchScore();
            score.setId(UUID.randomUUID());
            score.setTenantId(tenantId);
            score.setCandidateId(candidate.getId());
            score.setJobOpeningId(job.getId());
        }

        score.setOverallMatchScore(response.getOverallScore());
        score.setSkillsMatchScore(response.getSkillsScore());
        score.setExperienceMatchScore(response.getExperienceScore());
        score.setEducationMatchScore(response.getEducationScore());
        score.setCulturalFitScore(response.getCulturalFitScore());
        score.setStrengths(String.join(",", response.getStrengths() != null ? response.getStrengths() : List.of()));
        score.setGaps(String.join(",", response.getGaps() != null ? response.getGaps() : List.of()));
        score.setAiModelVersion(AI_MODEL_VERSION);

        try {
            score.setRecommendation(CandidateMatchScore.Recommendation.valueOf(response.getRecommendation()));
        } catch (Exception e) {
            score.setRecommendation(CandidateMatchScore.Recommendation.CONSIDER);
        }

        matchScoreRepository.save(score);
    }

    // ==================== JOB DESCRIPTION GENERATION ====================

    /**
     * Generate a job description using AI
     */
    public JobDescriptionResponse generateJobDescription(JobDescriptionRequest request) {
        log.info("Generating job description for: {}", request.getJobTitle());

        String prompt = buildJobDescriptionPrompt(request);
        String aiResponse = callOpenAI(prompt);

        return parseJobDescriptionResponse(aiResponse, request);
    }

    private String buildJobDescriptionPrompt(JobDescriptionRequest request) {
        return """
                You are an expert HR professional. Generate a compelling job description.

                Job Details:
                - Title: %s
                - Department: %s
                - Location: %s
                - Employment Type: %s
                - Experience Range: %s
                - Key Skills: %s
                - Industry: %s
                - Company Culture: %s

                Generate a professional job description in this JSON format:
                {
                  "title": "Enhanced job title if needed",
                  "summary": "2-3 sentence job summary",
                  "responsibilities": ["responsibility1", "responsibility2", ...],
                  "requirements": ["requirement1", "requirement2", ...],
                  "preferredQualifications": ["qualification1", "qualification2", ...],
                  "benefits": ["benefit1", "benefit2", ...],
                  "aboutCompany": "Brief company description placeholder",
                  "fullDescription": "Complete formatted job description text"
                }

                Return ONLY valid JSON.
                """.formatted(
                request.getJobTitle(),
                request.getDepartment() != null ? request.getDepartment() : "Not specified",
                request.getLocation() != null ? request.getLocation() : "Remote/Flexible",
                request.getEmploymentType() != null ? request.getEmploymentType() : "Full-time",
                request.getExperienceRange() != null ? request.getExperienceRange() : "Not specified",
                request.getKeySkills() != null ? String.join(", ", request.getKeySkills()) : "Not specified",
                request.getIndustry() != null ? request.getIndustry() : "Technology",
                request.getCompanyCulture() != null ? request.getCompanyCulture() : "Innovative and collaborative");
    }

    private JobDescriptionResponse parseJobDescriptionResponse(String aiResponse, JobDescriptionRequest request) {
        try {
            String json = extractJson(aiResponse);

            return JobDescriptionResponse.builder()
                    .success(true)
                    .title(extractJsonField(json, "title"))
                    .summary(extractJsonField(json, "summary"))
                    .responsibilities(extractJsonArray(json, "responsibilities"))
                    .requirements(extractJsonArray(json, "requirements"))
                    .preferredQualifications(extractJsonArray(json, "preferredQualifications"))
                    .benefits(extractJsonArray(json, "benefits"))
                    .fullDescription(extractJsonField(json, "fullDescription"))
                    .build();
        } catch (Exception e) {
            log.error("Error parsing job description response: {}", e.getMessage());
            return JobDescriptionResponse.builder()
                    .success(false)
                    .message("Error generating job description: " + e.getMessage())
                    .build();
        }
    }

    // ==================== INTERVIEW QUESTIONS ====================

    /**
     * Generate interview questions based on job and candidate
     */
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId, UUID candidateId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Generating interview questions for job {} and candidate {}", jobOpeningId, candidateId);

        JobOpening job = jobOpeningRepository.findByIdAndTenantId(jobOpeningId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Job opening not found"));

        Candidate candidate = null;
        if (candidateId != null) {
            candidate = candidateRepository.findByIdAndTenantId(candidateId, tenantId).orElse(null);
        }

        String prompt = buildInterviewQuestionsPrompt(job, candidate);
        String aiResponse = callOpenAI(prompt);

        return parseInterviewQuestionsResponse(aiResponse);
    }

    /**
     * Generate interview questions for a job (generic, not candidate-specific)
     */
    public InterviewQuestionsResponse generateInterviewQuestions(UUID jobOpeningId) {
        return generateInterviewQuestions(jobOpeningId, null);
    }

    private String buildInterviewQuestionsPrompt(JobOpening job, Candidate candidate) {
        String candidateInfo = "";
        if (candidate != null) {
            candidateInfo = """

                    CANDIDATE BACKGROUND:
                    - Current Role: %s at %s
                    - Experience: %s years
                    - Focus areas based on their profile to probe
                    """.formatted(
                    candidate.getCurrentDesignation() != null ? candidate.getCurrentDesignation() : "Not specified",
                    candidate.getCurrentCompany() != null ? candidate.getCurrentCompany() : "Not specified",
                    candidate.getTotalExperience() != null ? candidate.getTotalExperience() : "Not specified");
        }

        return """
                You are an expert interviewer. Generate interview questions for this role.

                JOB:
                - Title: %s
                - Description: %s
                - Requirements: %s
                - Skills: %s
                %s

                Generate questions in this JSON format:
                {
                  "technicalQuestions": [
                    {"question": "string", "purpose": "what it evaluates", "difficulty": "easy|medium|hard"}
                  ],
                  "behavioralQuestions": [
                    {"question": "string", "competency": "what competency it tests"}
                  ],
                  "situationalQuestions": [
                    {"question": "string", "scenario": "brief scenario description"}
                  ],
                  "culturalFitQuestions": [
                    {"question": "string", "value": "company value it relates to"}
                  ],
                  "roleSpecificQuestions": [
                    {"question": "string", "focus": "specific role aspect"}
                  ]
                }

                Generate 3-5 questions per category. Return ONLY valid JSON.
                """.formatted(
                job.getJobTitle(),
                job.getJobDescription() != null ? job.getJobDescription() : "Not specified",
                job.getRequirements() != null ? job.getRequirements() : "Not specified",
                job.getSkillsRequired() != null ? job.getSkillsRequired() : "Not specified",
                candidateInfo);
    }

    private InterviewQuestionsResponse parseInterviewQuestionsResponse(String aiResponse) {
        try {
            String json = extractJson(aiResponse);

            return InterviewQuestionsResponse.builder()
                    .success(true)
                    .rawJson(json)
                    .build();
        } catch (Exception e) {
            log.error("Error parsing interview questions response: {}", e.getMessage());
            return InterviewQuestionsResponse.builder()
                    .success(false)
                    .message("Error generating questions: " + e.getMessage())
                    .build();
        }
    }

    // ==================== HELPER METHODS ====================

    private String callOpenAI(String prompt) {
        if (openAiApiKey == null || openAiApiKey.isEmpty()) {
            log.warn("OpenAI API key not configured, returning mock response");
            return getMockResponse(prompt);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(openAiApiKey);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openAiModel);
            requestBody.put("messages", List.of(
                    Map.of("role", "user", "content", prompt)));
            requestBody.put("temperature", 0.7);
            requestBody.put("max_tokens", 2000);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    openAiBaseUrl + "/chat/completions",
                    HttpMethod.POST,
                    entity,
                    new org.springframework.core.ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getBody() != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
                    return (String) message.get("content");
                }
            }

            return "";
        } catch (Exception e) {
            log.error("Error calling OpenAI API: {}", e.getMessage());
            return getMockResponse(prompt);
        }
    }

    private String getMockResponse(String prompt) {
        // Return mock responses for testing when API is not available
        if (prompt.contains("resume")) {
            return """
                    {
                      "fullName": "John Doe",
                      "email": "john.doe@email.com",
                      "phone": "+91 9876543210",
                      "currentLocation": "Bangalore, India",
                      "currentCompany": "Tech Corp",
                      "currentDesignation": "Senior Software Engineer",
                      "totalExperienceYears": 5,
                      "skills": ["Java", "Spring Boot", "Microservices", "AWS", "Docker"],
                      "education": [{"degree": "B.Tech", "institution": "IIT Delhi", "year": 2018}],
                      "certifications": ["AWS Solutions Architect"],
                      "languages": ["English", "Hindi"],
                      "summary": "Experienced software engineer with 5 years in backend development"
                    }
                    """;
        } else if (prompt.contains("match")) {
            return """
                    {
                      "overallScore": 78,
                      "skillsScore": 85,
                      "experienceScore": 75,
                      "educationScore": 80,
                      "culturalFitScore": 70,
                      "strengths": ["Strong technical skills", "Relevant experience", "Good communication"],
                      "gaps": ["Limited leadership experience", "No cloud certification"],
                      "recommendation": "RECOMMENDED",
                      "summary": "Strong candidate with relevant technical skills. Recommended for interview.",
                      "interviewFocus": ["Leadership potential", "Cloud architecture knowledge"]
                    }
                    """;
        } else if (prompt.contains("job description")) {
            return """
                    {
                      "title": "Senior Software Engineer",
                      "summary": "We are looking for an experienced Software Engineer to join our team.",
                      "responsibilities": ["Design and develop scalable applications", "Mentor junior developers", "Participate in code reviews"],
                      "requirements": ["5+ years of experience", "Proficiency in Java/Python", "Experience with cloud platforms"],
                      "preferredQualifications": ["AWS certification", "Open source contributions"],
                      "benefits": ["Competitive salary", "Health insurance", "Flexible work hours"],
                      "fullDescription": "Join our innovative team as a Senior Software Engineer..."
                    }
                    """;
        } else {
            return """
                    {
                      "technicalQuestions": [
                        {"question": "Explain microservices architecture", "purpose": "Technical knowledge", "difficulty": "medium"},
                        {"question": "How do you handle database optimization?", "purpose": "Problem solving", "difficulty": "medium"}
                      ],
                      "behavioralQuestions": [
                        {"question": "Tell me about a challenging project", "competency": "Problem solving"}
                      ],
                      "situationalQuestions": [
                        {"question": "How would you handle a production outage?", "scenario": "Crisis management"}
                      ],
                      "culturalFitQuestions": [
                        {"question": "How do you prefer to receive feedback?", "value": "Growth mindset"}
                      ],
                      "roleSpecificQuestions": [
                        {"question": "What's your experience with agile methodologies?", "focus": "Process"}
                      ]
                    }
                    """;
        }
    }

    private String extractJson(String response) {
        // Try to find JSON block
        int start = response.indexOf("{");
        int end = response.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return response.substring(start, end + 1);
        }
        return response;
    }

    private String extractJsonField(String json, String fieldName) {
        Pattern pattern = Pattern.compile("\"" + fieldName + "\"\\s*:\\s*\"([^\"]*?)\"");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }

        // Try for numeric values
        pattern = Pattern.compile("\"" + fieldName + "\"\\s*:\\s*([0-9.]+)");
        matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return null;
    }

    private List<String> extractJsonArray(String json, String fieldName) {
        Pattern pattern = Pattern.compile("\"" + fieldName + "\"\\s*:\\s*\\[([^\\]]*?)\\]");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            String arrayContent = matcher.group(1);
            // Extract quoted strings
            Pattern itemPattern = Pattern.compile("\"([^\"]+)\"");
            Matcher itemMatcher = itemPattern.matcher(arrayContent);
            List<String> items = new ArrayList<>();
            while (itemMatcher.find()) {
                items.add(itemMatcher.group(1));
            }
            return items;
        }
        return new ArrayList<>();
    }

    private double parseDouble(String value, double defaultValue) {
        if (value == null || value.isEmpty()) {
            return defaultValue;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
