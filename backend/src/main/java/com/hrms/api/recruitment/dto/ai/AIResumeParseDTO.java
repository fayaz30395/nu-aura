package com.hrms.api.recruitment.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO mapping AI resume parse JSON output.
 * Ignores unknown properties to handle extra fields from AI responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AIResumeParseDTO {
    private String fullName;
    private String email;
    private String phone;
    private String currentLocation;
    private String currentCompany;
    private String currentDesignation;
    private Number totalExperienceYears;

    private List<String> skills;
    private List<EducationEntry> education;
    private List<ExperienceEntry> experience;
    private List<String> certifications;
    private List<String> languages;
    private String summary;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EducationEntry {
        private String degree;
        private String institution;
        private Number year;
        private String score;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ExperienceEntry {
        private String company;
        private String designation;
        private String startDate;
        private String endDate;
        private String description;
    }
}
