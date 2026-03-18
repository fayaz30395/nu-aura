package com.hrms.application.ai.service;

import com.hrms.api.recruitment.dto.ai.*;
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
     */
    public ResumeParseResponse parseResumeFromUrl(String resumeUrl) {
        log.info("Parsing resume from URL: {}", resumeUrl);
        try {
            java.net.URI uri = java.net.URI.create(resumeUrl);
            String scheme = uri.getScheme();
            if (!"https".equalsIgnoreCase(scheme) && !"http".equalsIgnoreCase(scheme)) {
                return ResumeParseResponse.builder()
                        .success(false)
                        .message("Only HTTP/HTTPS URLs are supported.")
                        .build();
            }

            java.net.HttpURLConnection conn =
                    (java.net.HttpURLConnection) uri.toURL().openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(10_000);
            conn.setReadTimeout(30_000);
            conn.setRequestProperty("User-Agent", "NuLogic-HRMS/1.0");

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
        } catch (Exception e) {
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
        } catch (Exception e) {
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
        } catch (Exception e) {
            log.error("Error parsing base64 file {}: {}", fileName, e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Failed to parse resume: " + e.getMessage())
                    .build();
        }
    }

    // ==================== PRIVATE HELPERS ====================

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
        } catch (Exception e) {
            log.error("Error parsing AI response: {}", e.getMessage());
            return ResumeParseResponse.builder()
                    .success(false)
                    .message("Error parsing resume: " + e.getMessage())
                    .build();
        }
    }
}
