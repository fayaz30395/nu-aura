package com.hrms.api.document.controller;

import com.hrms.application.document.service.FileStorageService;
import com.hrms.application.document.service.FileStorageService.FileUploadResult;
import com.hrms.common.security.Permission;
import com.hrms.common.security.RequiresPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

/**
 * Controller for file upload and download operations.
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "File Management", description = "Upload, download and manage files")
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    @Operation(summary = "Upload a file", description = "Upload a file to the specified category")
    public ResponseEntity<FileUploadResponse> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("category") String category,
            @RequestParam("entityId") UUID entityId) {

        FileUploadResult result = fileStorageService.uploadFile(file, category, entityId);

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

    @PostMapping("/upload/profile-photo/{employeeId}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Upload profile photo", description = "Upload a profile photo for an employee")
    public ResponseEntity<FileUploadResponse> uploadProfilePhoto(
            @PathVariable UUID employeeId,
            @RequestParam("file") MultipartFile file) {

        FileUploadResult result = fileStorageService.uploadFile(
                file,
                FileStorageService.CATEGORY_PROFILE_PHOTO,
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

    @PostMapping("/upload/document/{employeeId}")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    @Operation(summary = "Upload employee document", description = "Upload a document for an employee")
    public ResponseEntity<FileUploadResponse> uploadDocument(
            @PathVariable UUID employeeId,
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

    @GetMapping("/download")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(summary = "Get download URL", description = "Get a pre-signed URL for downloading a file")
    public ResponseEntity<DownloadUrlResponse> getDownloadUrl(@RequestParam("objectName") String objectName) {
        // SEC-008 FIX: Verify the objectName belongs to the current tenant
        UUID tenantId = com.hrms.common.security.TenantContext.getCurrentTenant();
        if (tenantId != null && !objectName.startsWith(tenantId.toString() + "/")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Access denied: file does not belong to your tenant");
        }

        String url = fileStorageService.getDownloadUrl(objectName);
        return ResponseEntity.ok(new DownloadUrlResponse(url));
    }

    @GetMapping("/download/direct")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(summary = "Download file directly", description = "Download a file directly as a stream")
    public ResponseEntity<InputStreamResource> downloadFile(
            @RequestParam("objectName") String objectName,
            @RequestParam(value = "filename", required = false) String filename) {

        // SEC-008 FIX: Verify the objectName belongs to the current tenant
        UUID tenantId = com.hrms.common.security.TenantContext.getCurrentTenant();
        if (tenantId != null && !objectName.startsWith(tenantId.toString() + "/")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Access denied: file does not belong to your tenant");
        }

        InputStream inputStream = fileStorageService.getFile(objectName);

        String downloadFilename = filename != null ? filename :
                objectName.substring(objectName.lastIndexOf('/') + 1);

        // SEC-007 FIX: Sanitize filename to prevent Content-Disposition header injection.
        // Remove any characters that could be used for header injection (CR, LF, quotes, backslashes).
        String sanitizedFilename = downloadFilename
                .replaceAll("[\\r\\n\"\\\\]", "_")
                .replaceAll("[^a-zA-Z0-9._\\-]", "_");
        if (sanitizedFilename.isEmpty()) {
            sanitizedFilename = "download";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + sanitizedFilename + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(inputStream));
    }

    @DeleteMapping
    @RequiresPermission(Permission.DOCUMENT_DELETE)
    @Operation(summary = "Delete a file", description = "Delete a file from storage")
    public ResponseEntity<Void> deleteFile(@RequestParam("objectName") String objectName) {
        // SEC-008 FIX: Verify the objectName belongs to the current tenant
        UUID tenantId = com.hrms.common.security.TenantContext.getCurrentTenant();
        if (tenantId != null && !objectName.startsWith(tenantId.toString() + "/")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Access denied: file does not belong to your tenant");
        }

        fileStorageService.deleteFile(objectName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/exists")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(summary = "Check if file exists", description = "Check if a file exists in storage")
    public ResponseEntity<FileExistsResponse> fileExists(@RequestParam("objectName") String objectName) {
        // SEC-008 FIX: Verify the objectName belongs to the current tenant
        UUID tenantId = com.hrms.common.security.TenantContext.getCurrentTenant();
        if (tenantId != null && !objectName.startsWith(tenantId.toString() + "/")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Access denied: file does not belong to your tenant");
        }

        boolean exists = fileStorageService.fileExists(objectName);
        return ResponseEntity.ok(new FileExistsResponse(exists));
    }

    // Response DTOs

    @lombok.Builder
    @lombok.Data
    public static class FileUploadResponse {
        private String objectName;
        private String originalFilename;
        private String contentType;
        private long size;
        private String category;
        private UUID entityId;
        private String downloadUrl;
    }

    public record DownloadUrlResponse(String url) {}

    public record FileExistsResponse(boolean exists) {}
}
