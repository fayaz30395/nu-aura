package com.hrms.api.recruitment.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobDescriptionResponse {
    private boolean success;
    private String message;

    private String title;
    private String summary;
    private List<String> responsibilities;
    private List<String> requirements;
    private List<String> preferredQualifications;
    private List<String> benefits;
    private String fullDescription;
}
