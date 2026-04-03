package com.hrms.api.employee;

import com.hrms.api.document.controller.FileUploadController.FileUploadResponse;
import com.hrms.application.document.service.FileStorageService;
import com.hrms.application.document.service.FileStorageService.FileUploadResult;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * BUG-QA3-005 FIX: Provides the spec-documented path for employee document upload.
 *
 * <p>Frontend/spec expects: POST /api/v1/employees/{id}/documents
 * The existing upload logic lives in FileUploadController at /api/v1/files/upload/document/{id}.
 * This controller adds the canonical alias without changing the existing endpoint.
 */
@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
@Tag(name = "Employee Documents", description = "Upload documents for an employee")
public class EmployeeDocumentController {

    private final FileStorageService fileStorageService;

    @PostMapping("/{id}/documents")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    @Operation(
            summary = "Upload employee document",
            description = "Upload a document for an employee. Spec-canonical path: POST /api/v1/employees/{id}/documents"
    )
    public ResponseEntity<FileUploadResponse> uploadEmployeeDocument(
            @PathVariable("id") UUID employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentType", required = false) String documentType) {

        FileUploadResult result = fileStorageService.uploadFile(
                file,
                FileStorageService.CATEGORY_DOCUMENTS,
                employeeId);

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
}
