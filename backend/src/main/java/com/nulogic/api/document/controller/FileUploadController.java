package com.nulogic.api.document.controller;

import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.application.document.service.FileStorageService.FileUploadResult;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.RequiresPermission;
import com.nulogic.common.security.SecurityContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.util.Set;
import java.util.UUID;

/**
 * Controller for file upload and download operations.
 *
 * <p>Audit finding 2.1 (CRITICAL): the tenant-isolation guard
 * {@code objectName.startsWith(tenantId + "/")} was previously dead code because
 * {@code objectName} was set to the opaque Google Drive fileId at upload time.
 * After the V143 mapping refactor, {@code objectName} is the LOGICAL path
 * ({@code tenantId/category/entityId/timestamp_uuid.ext}), so the guard now
 * actually enforces tenant ownership. The Drive fileId is resolved server-side
 * via the {@code drive_file_mapping} table inside the storage provider.</p>
 */
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Tag(name = "File Management", description = "Upload, download and manage files")
public class FileUploadController {

    private final FileStorageService fileStorageService;
    private final com.nulogic.infrastructure.storage.FileMetadataRepository fileMetadataRepository;

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
                // SEC-FIX (2.2): direct Drive URLs are disabled. Clients should call
                // /api/v1/files/download/direct with the objectName to stream the file
                // through the backend (which enforces the tenant guard). We surface a
                // backend-proxied URL hint here rather than calling getDownloadUrl
                // (which now throws because the unbounded Permission grant was removed).
                .downloadUrl("/api/v1/files/download/direct?objectName=" + result.getObjectName())
                .build());
    }

    @PostMapping("/upload/profile-photo/{employeeId}")
    @RequiresPermission(Permission.EMPLOYEE_UPDATE)
    @Operation(summary = "Upload profile photo", description = "Upload a profile photo for an employee")
    public ResponseEntity<FileUploadResponse> uploadProfilePhoto(
            @PathVariable UUID employeeId,
            @RequestParam("file") MultipartFile file) {

        // M-1: legacy endpoint — enforce caller-vs-employee ownership scope before upload
        enforceEmployeeUploadScope(employeeId);

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
                // SEC-FIX (2.2): see note in uploadFile above.
                .downloadUrl("/api/v1/files/download/direct?objectName=" + result.getObjectName())
                .build());
    }

    @PostMapping("/upload/document/{employeeId}")
    @RequiresPermission(Permission.DOCUMENT_UPLOAD)
    @Operation(summary = "Upload employee document", description = "Upload a document for an employee")
    public ResponseEntity<FileUploadResponse> uploadDocument(
            @PathVariable UUID employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "documentType", required = false) String documentType) {

        // M-1: legacy endpoint — enforce caller-vs-employee ownership scope before upload
        enforceEmployeeUploadScope(employeeId);

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
                // SEC-FIX (2.2): see note in uploadFile above.
                .downloadUrl("/api/v1/files/download/direct?objectName=" + result.getObjectName())
                .build());
    }

    @GetMapping("/download")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(summary = "Get download URL", description = "Direct Drive URLs are disabled; use /download/direct.")
    public ResponseEntity<DownloadUrlResponse> getDownloadUrl(@RequestParam("objectName") String objectName) {
        // SEC-FIX (2.1): reject missing objectName (was previously NPE-prone).
        assertTenantOwns(objectName);

        // SEC-FIX (2.2): direct Drive URLs would require granting public reader
        // permission on the Drive file, which had no expiry and could not be
        // revoked. We now refuse to mint such URLs and direct callers to the
        // backend-proxied /download/direct path which enforces tenant ownership
        // on every request.
        return ResponseEntity.ok(new DownloadUrlResponse(
                "/api/v1/files/download/direct?objectName=" + objectName));
    }

    @GetMapping("/download/direct")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(summary = "Download file directly", description = "Download a file directly as a stream")
    public ResponseEntity<InputStreamResource> downloadFile(
            @RequestParam("objectName") String objectName,
            @RequestParam(value = "filename", required = false) String filename) {

        // SEC-FIX (2.1): verify the objectName belongs to the current tenant
        // before opening the Drive stream. After V143, objectName is the logical
        // path, so the startsWith check is meaningful.
        assertTenantOwns(objectName);

        InputStream inputStream = fileStorageService.getFile(objectName);

        String downloadFilename = filename != null ? filename : objectName.substring(objectName.lastIndexOf('/') + 1);

        // SEC-007 FIX: Sanitize filename to prevent Content-Disposition header
        // injection.
        // Remove any characters that could be used for header injection (CR, LF,
        // quotes, backslashes).
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
        // SEC-FIX (2.1): see note in downloadFile.
        assertTenantOwns(objectName);

        fileStorageService.deleteFile(objectName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/exists")
    @RequiresPermission(Permission.DOCUMENT_VIEW)
    @Operation(summary = "Check if file exists", description = "Check if a file exists in storage")
    public ResponseEntity<FileExistsResponse> fileExists(@RequestParam("objectName") String objectName) {
        // SEC-FIX (2.1): see note in downloadFile.
        assertTenantOwns(objectName);

        boolean exists = fileStorageService.fileExists(objectName);
        return ResponseEntity.ok(new FileExistsResponse(exists));
    }

    /**
     * Categories whose {@code entityId} path segment is an employee id, and
     * therefore subject to the same self/manager/HR ownership scope as the
     * {@code /upload/document/{employeeId}} and {@code /upload/profile-photo/{employeeId}}
     * endpoints. Other categories (letters, certificates, reports, attachments)
     * key {@code entityId} to a different entity (letter id, enrollment id,
     * candidate id, tenant id, ...), so applying the employee scope check to
     * them would be incorrect.
     */
    private static final Set<String> EMPLOYEE_SCOPED_CATEGORIES = Set.of(
            FileStorageService.CATEGORY_PROFILE_PHOTO,
            FileStorageService.CATEGORY_DOCUMENTS,
            FileStorageService.CATEGORY_PAYSLIPS);

    /**
     * Tenant ownership guard for all read/delete endpoints.
     *
     * <p>After V143, {@code objectName} is the logical path
     * {@code tenantId/category/entityId/...}, so {@code startsWith} cheaply
     * verifies the caller's tenant owns the file. The provider's resolver in
     * {@code drive_file_mapping} provides a defense-in-depth second check; if
     * the row is missing or owned by another tenant, the provider also throws
     * AccessDeniedException.</p>
     *
     * <p>IDOR FIX: the tenant check alone let any DOCUMENT_VIEW holder in the
     * tenant read/delete any other employee's payslip/PAN/Aadhaar document —
     * upload enforced self/manager/HR scope but download/delete did not. We
     * now re-derive the entityId from the logical path and apply the same
     * scope check for employee-scoped categories.</p>
     */
    private void assertTenantOwns(String objectName) {
        if (objectName == null || objectName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "objectName is required");
        }
        UUID tenantId = com.nulogic.common.security.TenantContext.getCurrentTenant();
        if (tenantId != null && !objectName.startsWith(tenantId.toString() + "/")) {
            throw new org.springframework.security.access.AccessDeniedException(
                    "Access denied: file does not belong to your tenant");
        }
        enforceEmployeeScopeFromObjectName(objectName);
    }

    private void enforceEmployeeScopeFromObjectName(String objectName) {
        String[] parts = objectName.split("/");
        if (parts.length < 3 || !EMPLOYEE_SCOPED_CATEGORIES.contains(parts[1])) {
            return;
        }
        UUID entityId;
        try {
            entityId = UUID.fromString(parts[2]);
        } catch (IllegalArgumentException e) {
            return;
        }
        enforceEmployeeUploadScope(entityId);

        // Sensitive-tier fix: a manager-in-chain passes enforceEmployeeUploadScope above
        // but must not read/delete bank/PAN/Aadhaar/salary documents — self + HR/admin only.
        if (isSelfOrElevated(entityId)) {
            return;
        }
        UUID tenantId = com.nulogic.common.security.TenantContext.getCurrentTenant();
        fileMetadataRepository.findByTenantIdAndStoragePath(tenantId, objectName)
                .filter(meta -> meta.getCategory() == com.nulogic.infrastructure.storage.FileMetadata.FileCategory.SENSITIVE_DOCUMENT)
                .ifPresent(meta -> {
                    throw new org.springframework.security.access.AccessDeniedException(
                            "You are not authorized to access this employee's sensitive documents");
                });
    }

    /** True when the caller may see this employee's sensitive documents: self or HR/admin. */
    private boolean isSelfOrElevated(UUID targetEmployeeId) {
        if (SecurityContext.isSuperAdmin() || SecurityContext.isTenantAdmin() || SecurityContext.isHRManager()) {
            return true;
        }
        UUID currentEmployeeId = SecurityContext.getCurrentEmployeeId();
        if (currentEmployeeId != null && currentEmployeeId.equals(targetEmployeeId)) {
            return true;
        }
        return SecurityContext.hasPermission(Permission.DOCUMENT_VIEW_ALL);
    }

    /**
     * M-1: Ownership scope guard for the legacy per-employee upload endpoints.
     *
     * <p>Mirrors {@code EmployeeDocumentController.enforceEmployeeUploadScope} (kept inline
     * per the established per-controller convention). A caller may upload to their own
     * {@code employeeId}, to a reportee, or when holding the elevated DOCUMENT:VIEW_ALL
     * permission; admins/HR are always allowed. Otherwise the upload is denied.</p>
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

        throw new org.springframework.security.access.AccessDeniedException(
                "You are not authorized to upload documents for this employee");
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

    public record DownloadUrlResponse(String url) {
    }

    public record FileExistsResponse(boolean exists) {
    }
}
