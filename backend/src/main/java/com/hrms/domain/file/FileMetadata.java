package com.hrms.domain.file;

import com.hrms.common.entity.TenantAware;
import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@SQLRestriction("is_deleted = false")
@Entity
@Table(name = "file_metadata", indexes = {
        @Index(name = "idx_file_tenant", columnList = "tenantId"),
        @Index(name = "idx_file_entity", columnList = "entityType,entityId"),
        @Index(name = "idx_file_category", columnList = "category")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class FileMetadata extends TenantAware {

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false, length = 500)
    private String storagePath;

    @Column(nullable = false, length = 100)
    private String contentType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(length = 100)
    private String entityType;

    @Column
    private UUID entityId;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private FileCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 64)
    private String checksum;

    public enum FileCategory {
        EMPLOYEE_DOCUMENT,
        PROFILE_PHOTO,
        CONTRACT,
        CERTIFICATE,
        PAYSLIP,
        LEAVE_ATTACHMENT,
        OTHER
    }
}
