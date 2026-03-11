package com.hrms.api.recruitment.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO mapping AI job description JSON output.
 * Ignores unknown properties to handle extra fields from AI responses.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class AIJobDescriptionDTO {
    private String title;
    private String summary;
    private List<String> responsibilities;
    private List<String> requirements;
    private List<String> preferredQualifications;
    private List<String> benefits;
    private String aboutCompany;
    private String fullDescription;
}
