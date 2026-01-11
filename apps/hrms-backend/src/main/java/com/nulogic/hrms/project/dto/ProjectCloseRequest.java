package com.nulogic.hrms.project.dto;

import java.time.LocalDate;
import lombok.Data;

@Data
public class ProjectCloseRequest {
    private LocalDate closeDate;
}
