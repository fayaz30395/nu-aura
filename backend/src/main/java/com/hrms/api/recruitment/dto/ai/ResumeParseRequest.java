package com.hrms.api.recruitment.dto.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeParseRequest {
    private String resumeText;
    private String resumeUrl;
    private String fileBase64; // For direct file upload
    private String fileName;
}
