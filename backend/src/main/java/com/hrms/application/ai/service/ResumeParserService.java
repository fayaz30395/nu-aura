package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Handles resume parsing and text extraction from multiple sources:
 * plain text, URL, binary file bytes (PDF/DOCX via Apache Tika), and base64-encoded files.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ResumeParserService {

    private final ResumeTextExtractor resumeTextExtractor;
    private final AIRecruitmentHelper aiHelper;
    private final ObjectMapper objectMapper;

    // ==================== PUBLIC API ====================

    /**
     * Parse resume text and extract structured candidate information.
     */
    public ResumeParseResponse parseResume(String resumeText) {
        log.info("Parsing resume text of length: {}", resumeText.length());

        String prompt = buildResumeParsePrompt(resumeText);
        String aiResponse = aiHelper.callOpenAI(prompt);

        return parseResumeResponse(aiResponse);
    }

    /**
     * Parse resume from URL — fetches content and extracts plain text for analysis.
     * Supports plain text, HTML, PDF, DOCX, DOC, RTF, and other document formats.
     * Binary formats are automatically handled using Apache Tika.
     *
     * <p>SSRF hardening:</p>
     * <ul>
     *   <li>HTTPS-only (http:// is rejected to prevent cleartext + downgrade tricks)</li>
     *   <li>Redirects are NOT followed by the JVM — each 3xx Location is re-validated
     *       through SsrfProtectionUtils and we manually follow up to 3 hops</li>
     *   <li>Every hop runs through full SSRF validation (incl. DNS rebind defenses)</li>
     * </ul>
     */
    public ResumeParseResponse parseResumeFromUrl(String resumeUrl) {
        log.info("Parsing resume from URL: {}", resumeUrl);
        try {
            // SSRF protection: validate URL before making any outbound request
            com.hrms.common.validation.SsrfProtectionUtils.validateUrlSafety(resumeUrl);

            java.net.URI uri = java.net.URI.create(resumeUrl);
            String scheme = uri.getScheme();
            // SECURITY: HTTPS-only. http:// was previously accepted; this allowed both
            // plaintext exfiltration of any Authorization the server might add, and
            // simpler downgrade attacks via DNS-level redirection.
            if (!"https".equalsIgnoreCase(scheme)) {
                return ResumeParseResponse.builder()
                        .success(false)
                        .message("Only HTTPS URLs are supported for remote resume fetch.")
                        .build();
            }

            java.net.HttpURLConnection conn = openConnectionWithManualRedirects(uri.toURL(), 3);
            if (conn == null) {
                return ResumeParseResponse.builder()
                        .success(false)
                        .message("Resume URL rejected (too many redirects or unsafe redirect target).")
                        .build();
            }
            // Request method, timeouts and headers were already set in the helper
            // before we issued the request (necessary because getResponseCode connects).

            String contentType = conn.getContentType() != null ? conn.getContentType().toLowerCase() : "";

            String resumeText;

            // Handle binary formats using Apache Tika
            if (resumeTextExtractor.isSupportedBinaryFormat(contentType)) {
                log.info("Binary document format detected ({}). Using Tika for extraction.", contentType);

                try (java.io.InputStream inputStream = conn.getInputStream()) {
                    byte[] fileBytes = inputStream.readAllBytes();
                    resumeText = resumeTextExtractor.extractText(fileBytes, "resume-from-url");

                    if (resumeText.isBlank()) {
                        return ResumeParseResponse.builder()
                                .success(false)
                                .message("No text content could be extracted from the URL.")
                                .build();
                    }
                }
            } else {
                // Handle text and HTML formats
                try (java.io.BufferedReader reader = new java.io.BufferedReader(
                        new java.io.InputStreamReader(conn.getInputStream(),
                                java.nio.charset.StandardCharsets.UTF_8))) {
                    resumeText = reader.lines()
                            .collect(java.util.stream.Collectors.joining("\n"));
                }

                if (resumeText == null || resumeText.isBlank()) {
                    return ResumeParseResponse.builder()
                            .success(false)
                            .message("No text content could be extracted from the URL.")
                            .build();
                }

                // Strip HTML tags if the content is HTML
                if (contentType.contains("text/html")) {
                    resumeText = resumeText.replaceAll("<[^>]+>", " ")
                            .replaceAll("\\s{2,}", " ")
                            .trim();
                }

                // Cap to 10,000 chars to stay within AI context limits
                if (resumeText.length() > 10_000) {
                    resumeText = resumeText.substring(0, 10_000);
                }
            }

            return parseResume(resumeText);

        } catch (TikaException e) {
            log.error("Tika parsing failed for URL {}: {}", resumeUrl, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to extract text from document: " + e.getMessage())
                    .build();
        } catch (java.io.IOException e) {
            log.error("Failed to fetch or parse resume from URL {}: {}", resumeUrl, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to fetch resume from URL: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Parse resume from binary file bytes (PDF, DOCX, etc.).
     * Extracts text using Apache Tika and processes it for resume parsing.
     *
     * @param fileBytes the raw file bytes
     * @param fileName  the original filename
     * @return parsed resume response
     */
    public ResumeParseResponse parseResumeFromFile(byte[] fileBytes, String fileName) {
        log.info("Parsing resume from file: {} ({} bytes)", fileName, fileBytes.length);

        try {
            String extractedText = resumeTextExtractor.extractText(fileBytes, fileName);

            if (extractedText.isBlank()) {
                return ResumeParseResponse.builder()
                        .success(false)
                        .message("No text content could be extracted from the file.")
                        .build();
            }

            return parseResume(extractedText);

        } catch (TikaException e) {
            log.error("Tika parsing failed for file {}: {}", fileName, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to extract text from document: " + e.getMessage())
                    .build();
        } catch (IOException e) {
            log.error("IO error reading file {}: {}", fileName, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to read file: " + e.getMessage())
                    .build();
        } catch (RuntimeException e) {
            log.error("Unexpected error parsing file {}: {}", fileName, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to parse resume: " + e.getMessage())
                    .build();
        }
    }

    /**
     * Parse resume from base64-encoded file bytes.
     * Decodes the base64 content and processes it using parseResumeFromFile.
     *
     * @param base64Content the base64-encoded file content
     * @param fileName      the original filename
     * @return parsed resume response
     */
    public ResumeParseResponse parseResumeFromBase64(String base64Content, String fileName) {
        log.info("Parsing resume from base64-encoded file: {}", fileName);

        try {
            byte[] decodedBytes = java.util.Base64.getDecoder().decode(base64Content);
            return parseResumeFromFile(decodedBytes, fileName);

        } catch (IllegalArgumentException e) {
            log.error("Invalid base64 content for file {}: {}", fileName, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Invalid base64 encoding: " + e.getMessage())
                    .build();
        } catch (RuntimeException e) {
            log.error("Error parsing base64 file {}: {}", fileName, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to parse resume: " + e.getMessage())
                    .build();
        }
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Open an {@link java.net.HttpURLConnection} to {@code initialUrl}, manually re-validating
     * any 3xx redirect's Location through {@link com.hrms.common.validation.SsrfProtectionUtils}.
     *
     * <p>The JVM's built-in redirect-follow is disabled because it does NOT re-run our SSRF
     * policy on the redirected URL — an attacker could host a public resume URL that 302s
     * to {@code https://169.254.169.254/latest/meta-data/}.</p>
     *
     * @param initialUrl the URL after the initial SSRF check passed
     * @param maxHops    maximum number of redirect hops to follow (3 is the standard limit)
     * @return a connected {@link java.net.HttpURLConnection} positioned on a 2xx response,
     *         or {@code null} if we ran out of hops or any hop failed SSRF validation
     */
    private java.net.HttpURLConnection openConnectionWithManualRedirects(java.net.URL initialUrl, int maxHops)
            throws java.io.IOException {
        java.net.URL current = initialUrl;
        for (int hop = 0; hop < maxHops; hop++) {
            java.net.HttpURLConnection conn =
                    (java.net.HttpURLConnection) current.openConnection();
            conn.setInstanceFollowRedirects(false);  // SECURITY: never auto-follow
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(30_000);
            conn.setRequestProperty("User-Agent", "NuLogic-HRMS/1.0");
            // We must call getResponseCode() to actually issue the request and inspect headers.
            int status = conn.getResponseCode();
            if (status >= 300 && status < 400) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null || location.isBlank()) {
                    log.warn("Resume URL returned redirect without Location header");
                    return null;
                }
                // Resolve relative redirects against current URL
                java.net.URL next;
                try {
                    next = new java.net.URL(current, location);
                } catch (java.net.MalformedURLException e) {
                    log.warn("Resume URL redirect to malformed location: {}", location);
                    return null;
                }
                // SECURITY: re-validate every hop through full SSRF policy.
                try {
                    com.hrms.common.validation.SsrfProtectionUtils.validateUrlSafety(next.toString());
                } catch (com.hrms.common.exception.BusinessException ssrf) {
                    log.warn("Resume URL redirect rejected by SSRF policy: {} ({})",
                            next, ssrf.getMessage());
                    return null;
                }
                current = next;
                continue;
            }
            return conn; // 2xx (or 4xx/5xx — caller handles non-2xx)
        }
        log.warn("Resume URL exceeded {} redirect hops", maxHops);
        return null;
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
            String json = aiHelper.extractJson(aiResponse);

            AIResumeParseDTO dto = objectMapper.readValue(json, AIResumeParseDTO.class);

            ResumeParseResponse.ResumeParseResponseBuilder builder = ResumeParseResponse.builder();
            builder.success(true);
            builder.rawJson(json);
            builder.fullName(dto.getFullName());
            builder.email(dto.getEmail());
            builder.phone(dto.getPhone());
            builder.currentLocation(dto.getCurrentLocation());
            builder.currentCompany(dto.getCurrentCompany());
            builder.currentDesignation(dto.getCurrentDesignation());

            if (dto.getTotalExperienceYears() != null) {
                builder.totalExperienceYears(new BigDecimal(dto.getTotalExperienceYears().toString()));
            }

            builder.skills(dto.getSkills());
            builder.certifications(dto.getCertifications());
            builder.languages(dto.getLanguages());
            builder.summary(dto.getSummary());

            if (dto.getEducation() != null) {
                List<ResumeParseResponse.Education> educationList = new ArrayList<>();
                for (AIResumeParseDTO.EducationEntry entry : dto.getEducation()) {
                    educationList.add(ResumeParseResponse.Education.builder()
                            .degree(entry.getDegree())
                            .institution(entry.getInstitution())
                            .year(entry.getYear() != null ? entry.getYear().intValue() : null)
                            .score(entry.getScore())
                            .build());
                }
                builder.education(educationList);
            }

            if (dto.getExperience() != null) {
                List<ResumeParseResponse.Experience> experienceList = new ArrayList<>();
                for (AIResumeParseDTO.ExperienceEntry entry : dto.getExperience()) {
                    experienceList.add(ResumeParseResponse.Experience.builder()
                            .company(entry.getCompany())
                            .designation(entry.getDesignation())
                            .startDate(entry.getStartDate())
                            .endDate(entry.getEndDate())
                            .description(entry.getDescription())
                            .build());
                }
                builder.experience(experienceList);
            }

            return builder.build();
        } catch (JsonProcessingException e) {
            log.error("Error parsing AI response: {}", e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Error parsing resume: " + e.getMessage())
                    .build();
        }
    }
}
