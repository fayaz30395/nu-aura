package com.hrms.domain.training;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "training_programs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "program_code", nullable = false, length = 50)
    private String programCode;

    @Column(name = "program_name", nullable = false, length = 200)
    private String programName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 50)
    private TrainingCategory category;

    @Enumerated(EnumType.STRING)
    @Column(name = "delivery_mode", length = 30)
    private DeliveryMode deliveryMode;

    @Column(name = "instructor_id")
    private UUID instructorId;

    @Column(name = "duration_hours")
    private Integer durationHours;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "trainer_name", length = 100)
    private String trainerName;

    @Column(name = "trainer_email", length = 100)
    private String trainerEmail;

    @Column(name = "location", length = 200)
    private String location;

    @Column(name = "max_participants")
    private Integer maxParticipants;

    @Column(name = "cost_per_participant", precision = 10, scale = 2)
    private BigDecimal costPerParticipant;

    @Column(name = "cost", precision = 10, scale = 2)
    private BigDecimal cost;

    @Column(name = "prerequisites", columnDefinition = "TEXT")
    private String prerequisites;

    @Column(name = "learning_objectives", columnDefinition = "TEXT")
    private String learningObjectives;

    @Builder.Default
    @Column(name = "is_mandatory")
    private Boolean isMandatory = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private ProgramStatus status = ProgramStatus.DRAFT;

    @Column(name = "materials_url", length = 500)
    private String materialsUrl;

    @Column(name = "certificate_template_url", length = 500)
    private String certificateTemplateUrl;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Version
    private Long version;

    public enum TrainingCategory {
        TECHNICAL, SOFT_SKILLS, LEADERSHIP, COMPLIANCE, SAFETY, PRODUCT, SALES, CUSTOMER_SERVICE, OTHER
    }

    public enum DeliveryMode {
        IN_PERSON, VIRTUAL, HYBRID, SELF_PACED, WORKSHOP
    }

    public enum ProgramStatus {
        DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
    }
}
