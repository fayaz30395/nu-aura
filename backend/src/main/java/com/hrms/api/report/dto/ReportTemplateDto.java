package com.hrms.api.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportTemplateDto {

    private UUID id;
    private String name;
    private String description;
    private String module;
    private List<String> selectedColumns;
    private List<Map<String, String>> filters;
    private String sortBy;
    private String sortDirection;
}
