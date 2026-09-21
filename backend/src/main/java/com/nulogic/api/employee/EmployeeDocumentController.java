package com.nulogic.api.employee;

import com.nulogic.api.document.controller.FileUploadController.FileUploadResponse;
import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.application.document.service.FileStorageService.FileUploadResult;
import com.nulogic.application.notification.service.WebSocketNotificationService;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.storage.FileMetadata;
import com.nulogic.infrastructure.storage.FileMetadataRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * BUG-QA3-005 FIX: Provides the spec-documented path for employee document upload.
 *
 * <p>Frontend/spec expects: POST /api/v1/employees/{id}/documents
 * The existing upload logic lives in FileUploadController at /api/v1/files/upload/document/{id}.
 * This controller adds the canonical alias without changing the existing endpoint.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employee Documents", description = "Upload documents for an employee (canonical spec path)")
public class EmployeeDocumentController {

    private static final String ENTITY_TYPE_EMPLOYEE = "EMPLOYEE";

    private final FileStorageService fileStorageService;
    private final FileMetadataRepository fileMetadataRepository;
    private final EmployeeRepository employeeRepository;
    private final WebSocketNotificationService webSocketNotificationService;

    @GetMapping("/{id}/documents")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(
            summary = "List employee documents",
            description = "Returns the documents uploaded for an employee. Scope: self, HR/admin, or manager-in-chain."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Documents retrieved successfully"),
            @ApiResponse(responseCode = "403", description = "Forbidden — caller is not in target employee's authorized scope")
    })
    public ResponseEntity<List<EmployeeDocumentResponse>> listEmployeeDocuments(
            @Parameter(description = "Employee UUID") @PathVariable("id") UUID employeeId) {
        enforceEmployeeUploadScope(employeeId);

        UUID tenantId = TenantContext.getCurrentTenant();
        List<EmployeeDocumentResponse> documents = fileMetadataRepository
                .findByTenantIdAndEntityTypeAndEntityIdOrderByCreatedAtDesc(tenantId, ENTITY_TYPE_EMPLOYEE, employeeId)
                .stream()
                .map(meta -> new EmployeeDocumentResponse(
                        meta.getId(),
                        meta.getFileName(),
                        meta.getContentType(),
                        meta.getFileSize(),
                        meta.getCreatedAt(),
                        meta.getCreatedBy(),
                        meta.getStoragePath(),
                        fileStorageService.getDownloadUrl(meta.getStoragePath())))
                .toList();
        return ResponseEntity.ok(documents);
    }

    @PostMapping("/{id}/documents")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    @Operation(
            summary = "Upload employee document",
            description = "Upload a document for an employee. Spec-canonical path: POST /api/v1/employees/{id}/documents. Scope: self, HR/admin, or manager-in-chain."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Document uploaded successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid file or missing payload"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated"),
            @ApiResponse(responseCode = "403", description = "Forbidden — caller is not in target employee's authorized scope"),
            @ApiResponse(responseCode = "404", description = "Employee not found")
    })
    public ResponseEntity<FileUploadResponse> uploadEmployeeDocument(
            @Parameter(description = "Employee UUID") @PathVariable("id") UUID employeeId,
            @Parameter(description = "File to upload (multipart)") @RequestParam("file") MultipartFile file,
            @Parameter(description = "Optional document type label", example = "OFFER_LETTER") @RequestParam(value = "documentType", required = false) String documentType) {

        // IDOR FIX: any holder of DOCUMENT:UPLOAD could previously target ANY employee's document space.
        // Require the caller to be the same employee, an HR/admin, or a manager-in-chain.
        enforceEmployeeUploadScope(employeeId);

        FileUploadResult result = fileStorageService.uploadFile(
                file,
                FileStorageService.CATEGORY_DOCUMENTS,
                employeeId);

        FileMetadata metadata = FileMetadata.builder()
                .fileName(result.getOriginalFilename())
                .storagePath(result.getObjectName())
                .contentType(result.getContentType())
                .fileSize(result.getSize())
                .entityType(ENTITY_TYPE_EMPLOYEE)
                .entityId(employeeId)
                .category(FileMetadata.FileCategory.EMPLOYEE_DOCUMENT)
                .description(documentType)
                .build();
        try {
            fileMetadataRepository.save(metadata);
        } catch (RuntimeException e) {
            // Compensating rollback: the file already landed in storage before this DB
            // insert failed — without cleanup it would be a permanently orphaned, untracked
            // Drive file. Best-effort delete; log and keep the original failure if it fails too.
            log.error("FileMetadata insert failed for employee {} document {}; deleting orphaned storage object {}",
                    employeeId, result.getOriginalFilename(), result.getObjectName(), e);
            try {
                fileStorageService.deleteFile(result.getObjectName());
            } catch (RuntimeException cleanupFailure) {
                log.error("Failed to clean up orphaned storage object {} after DB insert failure",
                        result.getObjectName(), cleanupFailure);
            }
            throw e;
        }

        try {
            employeeRepository.findByIdAndTenantId(employeeId, TenantContext.getCurrentTenant())
                    .map(Employee::getUser)
                    .ifPresent(user -> webSocketNotificationService.notifyDocumentUploaded(
                            user.getId(), result.getOriginalFilename()));
        } catch (RuntimeException e) {
            log.warn("Failed to send document-uploaded notification for employee {}: {}", employeeId, e.getMessage());
        }

        return ResponseEntity.ok(FileUploadResponse.builder()
                .objectName(result.getObjectName())
                .originalFilename(result.getOriginalFilename())
                .contentType(result.getContentType())
                .size(result.getSize())
                .category(result.getCategory())
                .entityId(result.getEntityId())
                .downloadUrl(fileStorageService.getDownloadUrl(result.getObjectName()))
                .build());
    }

    /**
     * Inline scope guard mirroring {@code EmployeeController.enforceEmployeeUpdateScope} —
     * we deliberately do not extract a shared helper for one call-site.
     */
    private void enforceEmployeeUploadScope(UUID targetEmployeeId) {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin() || SecurityContext.isHRManager()) {
            return;
        }

        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return;
        }

        Set<UUID> reporteeIds = SecurityContext.getAllReporteeIds();
        if (reporteeIds != null && reporteeIds.contains(targetEmployeeId)) {
            return;
        }

        if (SecurityContext.hasPermission(Permission.DOCUMENT_VIEW_ALL)) {
            return;
        }

        throw new AccessDeniedException(
                "You are not authorized to upload documents for this employee");
    }

    public record EmployeeDocumentResponse(
            UUID id,
            String fileName,
            String contentType,
            long fileSize,
            LocalDateTime uploadedAt,
            UUID uploadedBy,
            String objectName,
            String downloadUrl) {
    }
}
