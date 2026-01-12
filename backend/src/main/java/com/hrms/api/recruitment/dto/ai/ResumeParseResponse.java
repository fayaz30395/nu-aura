package com.hrms.api.recruitment.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeParseResponse {
    private boolean success;
    private String message;

    // Extracted candidate information
    private String fullName;
    private String email;
    private String phone;
    private String currentLocation;
    private String currentCompany;
    private String currentDesignation;
    private BigDecimal totalExperienceYears;

    private List<String> skills;
    private List<Education> education;
    private List<Experience> experience;
    private List<String> certifications;
    private List<String> languages;
    private String summary;

    // Raw JSON for debugging
    private String rawJson;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Education {
        private String degree;
        private String institution;
        private Integer year;
        private String score;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Experience {
        private String company;
        private String designation;
        private String startDate;
        private String endDate;
        private String description;
    }
}
