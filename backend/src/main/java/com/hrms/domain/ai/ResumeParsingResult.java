package com.hrms.domain.ai;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "resume_parsing_results")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumeParsingResult {
    @Id
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "candidate_id")
    private UUID candidateId;

    @Column(name = "job_application_id")
    private UUID jobApplicationId;

    @Column(name = "file_path", length = 500)
    private String filePath;

    @Column(name = "parsed_data", columnDefinition = "TEXT")
    private String parsedData; // JSON with extracted data

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "email", length = 200)
    private String email;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "total_experience_years")
    private Integer totalExperienceYears;

    @Column(name = "skills", columnDefinition = "TEXT")
    private String skills; // JSON array

    @Column(name = "education", columnDefinition = "TEXT")
    private String education; // JSON array

    @Column(name = "work_experience", columnDefinition = "TEXT")
    private String workExperience; // JSON array

    @Column(name = "certifications", columnDefinition = "TEXT")
    private String certifications; // JSON array

    @Column(name = "confidence_score")
    private Double confidenceScore; // 0-100

    @Column(name = "parsing_model", length = 100)
    private String parsingModel;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private UUID createdBy;
}
