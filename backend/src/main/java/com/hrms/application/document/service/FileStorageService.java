package com.hrms.application.document.service;

import com.hrms.application.security.service.VirusScanService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Service for file storage operations.
 * Delegates to the active {@link StorageProvider} implementation (Google Drive).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    // File categories
    public static final String CATEGORY_PROFILE_PHOTO = "profile-photos";
    public static final String CATEGORY_DOCUMENTS = "documents";
    public static final String CATEGORY_PAYSLIPS = "payslips";
    public static final String CATEGORY_LETTERS = "letters";
    public static final String CATEGORY_ATTACHMENTS = "attachments";
    public static final String CATEGORY_REPORTS = "reports";
    // Allowed file types
    private static final Map<String, Long> ALLOWED_TYPES = Map.of(
            "image/jpeg", 5L * 1024 * 1024,      // 5MB
            "image/png", 5L * 1024 * 1024,       // 5MB
            "image/gif", 2L * 1024 * 1024,       // 2MB
            "application/pdf", 20L * 1024 * 1024, // 20MB
            "application/msword", 20L * 1024 * 1024,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 20L * 1024 * 1024,
            "application/vnd.ms-excel", 20L * 1024 * 1024,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 20L * 1024 * 1024,
            "text/csv", 10L * 1024 * 1024,
            "text/plain", 5L * 1024 * 1024
    );
    // MIME categories used for magic byte cross-checking
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/gif");
    // SEC-FIX (1.1): "application/zip" intentionally NOT in DOCUMENT_TYPES — any
    // declared type that doesn't already match an OOXML/PDF/etc signature but has
    // ZIP magic bytes will now fall into the "unknown" category and be rejected
    // by validateMagicBytes. OOXML formats are accepted because detectMimeType
    // maps the ZIP signature back to the declared OOXML type when consistent.
    private static final Set<String> DOCUMENT_TYPES = Set.of(
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private static final Set<String> TEXT_TYPES = Set.of("text/csv", "text/plain");
    // OOXML content types whose magic bytes legitimately match the ZIP signature
    // (50 4B 03 04). Any other declared MIME with a ZIP-shaped body is rejected
    // by validateMagicBytes.
    private static final Set<String> OOXML_TYPES = Set.of(
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    private final StorageProvider storageProvider;
    private final JdbcTemplate jdbcTemplate;
    private final VirusScanService virusScanService;
    @Value("${app.storage.url-expiry-hours:24}")
    private int urlExpiryHours;

    /**
     * Upload a file to storage.
     */
    public FileUploadResult uploadFile(MultipartFile file, String category, UUID entityId) {
        validateFile(file);

        UUID tenantId = TenantContext.getCurrentTenant();
        String objectName = generateObjectName(tenantId, category, entityId, file.getOriginalFilename());

        // AV scan BEFORE we open a write connection to the storage provider — failing
        // the scan should never leave a partial Drive object or a dangling mapping row.
        scanForMalware(file);

        try {
            storageProvider.ensureStorageReady();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("tenant-id", tenantId.toString());
            metadata.put("category", category);
            metadata.put("entity-id", entityId.toString());
            metadata.put("original-filename", file.getOriginalFilename());
            metadata.put("uploaded-at", LocalDateTime.now().toString());

            String storageId = storageProvider.upload(objectName, file.getInputStream(), file.getSize(),
                    file.getContentType(), metadata);

            // SEC-FIX (2.1): persist the (tenantId, logicalPath, driveFileId) mapping
            // so subsequent download/delete/exists calls can verify tenant ownership
            // by the logical path prefix, then resolve to the opaque Drive fileId
            // server-side. The objectName returned to clients is the LOGICAL path —
            // never the Drive fileId — so the controller's startsWith(tenantId+"/")
            // guard is meaningful.
            persistDriveMapping(tenantId, objectName, storageId);

            log.info("File uploaded: {} (driveFileId: {})", objectName, storageId);

            return FileUploadResult.builder()
                    .objectName(objectName)
                    .driveFileId(storageId)
                    .bucket("storage")
                    .originalFilename(file.getOriginalFilename())
                    .contentType(file.getContentType())
                    .size(file.getSize())
                    .category(category)
                    .entityId(entityId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Upload a file from InputStream (for generated files like reports).
     */
    public FileUploadResult uploadFile(InputStream inputStream, String filename, String contentType,
                                       long size, String category, UUID entityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String objectName = generateObjectName(tenantId, category, entityId, filename);

        try {
            storageProvider.ensureStorageReady();

            Map<String, String> metadata = new HashMap<>();
            metadata.put("tenant-id", tenantId.toString());
            metadata.put("category", category);
            metadata.put("entity-id", entityId.toString());
            metadata.put("original-filename", filename);
            metadata.put("uploaded-at", LocalDateTime.now().toString());

            String storageId = storageProvider.upload(objectName, inputStream, size, contentType, metadata);

            // SEC-FIX (2.1): see note in the MultipartFile overload above.
            persistDriveMapping(tenantId, objectName, storageId);

            log.info("File uploaded from stream: {} (driveFileId: {})", objectName, storageId);

            return FileUploadResult.builder()
                    .objectName(objectName)
                    .driveFileId(storageId)
                    .bucket("storage")
                    .originalFilename(filename)
                    .contentType(contentType)
                    .size(size)
                    .category(category)
                    .entityId(entityId)
                    .uploadedAt(LocalDateTime.now())
                    .build();

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to upload file from stream: {}", filename, e);
            throw new BusinessException("Failed to upload file: " + e.getMessage());
        }
    }

    /**
     * Get a download URL for a file.
     *
     * <p>SEC-FIX (2.2): previously this delegated to
     * {@code storageProvider.getDownloadUrl}, which for Drive granted a
     * {@code Permission(type=anyone, role=reader)} on the file with no expiry —
     * effectively a permanent public link. We now return a backend-proxied
     * URL pointing at {@code /api/v1/files/download/direct}, which streams the
     * file through the controller after enforcing the tenant guard on every
     * request. The {@code urlExpiryHours} setting is no longer meaningful since
     * the backend-streamed path is gated by Spring Security on each call.</p>
     */
    @Transactional(readOnly = true)
    public String getDownloadUrl(String objectName) {
        if (objectName == null || objectName.isBlank()) {
            throw new BusinessException("objectName is required");
        }
        return "/api/v1/files/download/direct?objectName=" + objectName;
    }

    /**
     * Get file as InputStream.
     */
    @Transactional(readOnly = true)
    public InputStream getFile(String objectName) {
        try {
            return storageProvider.download(objectName);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to get file: {}", objectName, e);
            throw new BusinessException("Failed to retrieve file");
        }
    }

    /**
     * Delete a file from storage.
     */
    @Transactional
    public void deleteFile(String objectName) {
        try {
            storageProvider.delete(objectName);
            log.info("File deleted: {}", objectName);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to delete file: {}", objectName, e);
            throw new BusinessException("Failed to delete file");
        }
    }

    /**
     * Check if a file exists.
     */
    public boolean fileExists(String objectName) {
        return storageProvider.exists(objectName);
    }

    /**
     * Copy a file to a new location.
     */
    public String copyFile(String sourceObjectName, String category, UUID newEntityId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        String destinationObjectName = generateObjectName(tenantId, category, newEntityId,
                sourceObjectName.substring(sourceObjectName.lastIndexOf('/') + 1));

        try {
            String driveFileId = storageProvider.copy(sourceObjectName, destinationObjectName);
            // SEC-FIX (2.1): persist the destination mapping so the new logical path
            // is resolvable for the destination tenant context.
            persistDriveMapping(tenantId, destinationObjectName, driveFileId);
            log.info("File copied from {} to {} (driveFileId: {})", sourceObjectName, destinationObjectName, driveFileId);
            return destinationObjectName;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) { // Intentional broad catch — delegates to pluggable storage provider
            log.error("Failed to copy file: {}", sourceObjectName, e);
            throw new BusinessException("Failed to copy file");
        }
    }

    /**
     * Persists the (tenant_id, object_name, drive_file_id) mapping introduced in
     * V143__add_drive_file_id_mapping.sql. Uses ON CONFLICT DO UPDATE so a
     * re-upload at the same logical path replaces the mapping rather than
     * failing the upload (the UUID component of generateObjectName makes
     * collisions effectively impossible in practice, but defensive nonetheless).
     */
    private void persistDriveMapping(UUID tenantId, String objectName, String driveFileId) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO drive_file_mapping (id, tenant_id, object_name, drive_file_id, created_at) " +
                            "VALUES (gen_random_uuid(), ?, ?, ?, CURRENT_TIMESTAMP) " +
                            "ON CONFLICT (object_name) DO UPDATE SET drive_file_id = EXCLUDED.drive_file_id",
                    tenantId, objectName, driveFileId);
        } catch (Exception e) { // Intentional broad catch — mapping persistence is a hard prereq for download
            log.error("Failed to persist drive_file_mapping for objectName={}", objectName, e);
            throw new BusinessException("Failed to record file mapping");
        }
    }

    /**
     * Run the configured {@link VirusScanService} against the upload body. Called from
     * {@link #uploadFile(MultipartFile, String, UUID)} after declared-type / size /
     * magic-byte checks pass, before any write to the storage provider.
     *
     * <p>On {@link VirusScanService.Infected} we log a SECURITY-tagged WARN with the
     * tenant, user, original filename, and signature, then throw
     * {@link VirusScanService.VirusInfectedFileException} which the global handler
     * maps to HTTP 422.</p>
     *
     * <p>On {@link VirusScanService.Error} we log at WARN but allow the upload to
     * proceed. Failing closed on a transient clamd outage would create an availability
     * incident every time the AV daemon restarts; the {@link NoOpScanner} branch already
     * documents that dev environments have no AV coverage. Operators wanting fail-closed
     * semantics should monitor the {@code SECURITY clamd scan failed} log line and alert
     * on rate; tightening this to throw is a one-line follow-up if policy changes.</p>
     */
    private void scanForMalware(MultipartFile file) {
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            log.error("Failed to read file bytes for AV scan: {}", file.getOriginalFilename(), e);
            throw new BusinessException("Unable to read file content for scanning");
        }

        VirusScanService.ScanResult result = virusScanService.scan(bytes, file.getOriginalFilename());
        switch (result) {
            case VirusScanService.Clean ignored -> {
                // no-op — fall through to upload
            }
            case VirusScanService.Infected infected -> {
                UUID tenantId = TenantContext.getCurrentTenant();
                UUID userId = safeCurrentUserId();
                log.warn("SECURITY virus-infected upload blocked tenantId={} userId={} filename={} signature={}",
                        tenantId, userId, infected.filename(), infected.signature());
                throw new VirusScanService.VirusInfectedFileException(
                        infected.filename(), infected.signature());
            }
            case VirusScanService.Error error -> {
                // Fail open — see method javadoc. Logged so dashboards can pick it up.
                log.warn("SECURITY virus-scan error filename={} reason={} — upload allowed",
                        file.getOriginalFilename(), error.reason());
            }
        }
    }

    /**
     * Best-effort current-user lookup for SECURITY logs. We never want a missing
     * SecurityContext to mask an infected-upload event, so any failure here is
     * swallowed and the user is logged as {@code null}.
     */
    private UUID safeCurrentUserId() {
        try {
            return SecurityContext.getCurrentUserId();
        } catch (Exception e) { // Intentional broad catch — log-only path
            return null;
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.containsKey(contentType)) {
            throw new BusinessException("File type not allowed: " + contentType);
        }

        long maxSize = ALLOWED_TYPES.get(contentType);
        if (file.getSize() > maxSize) {
            throw new BusinessException("File size exceeds limit: " + (maxSize / 1024 / 1024) + "MB");
        }

        // Magic byte validation to prevent MIME spoofing attacks
        validateMagicBytes(file, contentType);
    }

    /**
     * Validate that file magic bytes match the declared content type.
     * Prevents attackers from uploading malicious files disguised as images/documents.
     */
    private void validateMagicBytes(MultipartFile file, String contentType) {
        byte[] headerBytes = new byte[16];
        try (InputStream is = file.getInputStream()) {
            int bytesRead = is.read(headerBytes);
            if (bytesRead < 1) {
                throw new BusinessException("Unable to read file content for validation");
            }
        } catch (IOException e) {
            log.error("Failed to read file header for magic byte validation", e);
            throw new BusinessException("Unable to validate file content");
        }

        String detectedType = detectMimeType(headerBytes, contentType);
        String declaredCategory = getMimeCategory(contentType);
        String detectedCategory = getMimeCategory(detectedType);

        // Reject if the broad category doesn't match (e.g., declared image/* but detected application/zip)
        if (!declaredCategory.equals(detectedCategory)) {
            log.warn("MIME spoofing detected: declared={}, detected={}, filename={}",
                    contentType, detectedType, file.getOriginalFilename());
            throw new BusinessException("File content does not match declared type: " + contentType);
        }
    }

    /**
     * Detect MIME type from file magic bytes (file signature).
     *
     * <p>The {@code declaredContentType} argument disambiguates the ZIP magic
     * signature (50 4B 03 04): OOXML formats (DOCX/XLSX/PPTX) legitimately use
     * the ZIP container, so the ZIP signature is reported back as the declared
     * OOXML type only when the declared type matches. For any other declared
     * type, a ZIP-shaped body is reported as {@code application/zip} so
     * validateMagicBytes will reject it as a category mismatch. This closes the
     * archive-upload vector described in audit finding 1.1.</p>
     */
    private String detectMimeType(byte[] headerBytes, String declaredContentType) {
        // JPEG: FF D8 FF
        if (headerBytes.length >= 3
                && headerBytes[0] == (byte) 0xFF
                && headerBytes[1] == (byte) 0xD8
                && headerBytes[2] == (byte) 0xFF) {
            return "image/jpeg";
        }
        // PNG: 89 50 4E 47
        if (headerBytes.length >= 4
                && headerBytes[0] == (byte) 0x89
                && headerBytes[1] == 0x50
                && headerBytes[2] == 0x4E
                && headerBytes[3] == 0x47) {
            return "image/png";
        }
        // PDF: 25 50 44 46
        if (headerBytes.length >= 4
                && headerBytes[0] == 0x25
                && headerBytes[1] == 0x50
                && headerBytes[2] == 0x44
                && headerBytes[3] == 0x46) {
            return "application/pdf";
        }
        // GIF: 47 49 46 38
        if (headerBytes.length >= 4
                && headerBytes[0] == 0x47
                && headerBytes[1] == 0x49
                && headerBytes[2] == 0x46
                && headerBytes[3] == 0x38) {
            return "image/gif";
        }
        // OOXML (XLSX/DOCX/PPTX) uses ZIP container: 50 4B 03 04.
        // Only accept ZIP magic as a "document" if the client declared an OOXML
        // type. Otherwise report bare "application/zip" so validateMagicBytes
        // rejects it (we don't accept bare archive uploads anywhere today).
        if (headerBytes.length >= 4
                && headerBytes[0] == 0x50
                && headerBytes[1] == 0x4B
                && headerBytes[2] == 0x03
                && headerBytes[3] == 0x04) {
            if (declaredContentType != null && OOXML_TYPES.contains(declaredContentType)) {
                return declaredContentType;
            }
            // Bare ZIP body but no OOXML declaration → reject downstream.
            return "application/zip";
        }
        // CSV/TXT: starts with printable ASCII
        if (headerBytes.length > 0
                && headerBytes[0] >= 0x20
                && headerBytes[0] <= 0x7E) {
            return "text/plain";
        }
        return "application/octet-stream";
    }

    /**
     * Map a specific MIME type to a broad category for cross-validation.
     */
    private String getMimeCategory(String mimeType) {
        if (IMAGE_TYPES.contains(mimeType)) return "image";
        if (DOCUMENT_TYPES.contains(mimeType)) return "document";
        if (TEXT_TYPES.contains(mimeType)) return "text";
        return "unknown";
    }

    private String generateObjectName(UUID tenantId, String category, UUID entityId, String originalFilename) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        String extension = getFileExtension(originalFilename);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);

        return String.format("%s/%s/%s/%s_%s%s",
                tenantId,
                category,
                entityId,
                timestamp,
                uniqueId,
                extension);
    }

    /**
     * Hardened extension extraction (audit finding 1.1).
     * <ul>
     *   <li>Strips any path components a client may have injected (no path
     *       traversal into the generated objectName).</li>
     *   <li>Drops control bytes that could be used in shell/path injection
     *       downstream.</li>
     *   <li>Restricts to an allowlist — any other extension is rejected so the
     *       extension portion of the generated objectName is a known set.</li>
     * </ul>
     */
    private String getFileExtension(String filename) {
        if (filename == null) return "";
        String base = java.nio.file.Paths.get(filename).getFileName().toString();
        base = base.replaceAll("[\\x00-\\x1F\\x7F]", "");
        int dot = base.lastIndexOf('.');
        if (dot < 0) return "";
        String ext = base.substring(dot + 1).toLowerCase();
        java.util.Set<String> allowed = java.util.Set.of(
                "jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx",
                "csv", "txt", "ppt", "pptx", "odt", "ods", "odp"
        );
        if (!allowed.contains(ext)) {
            throw new com.hrms.common.exception.BusinessException("Disallowed file extension: " + ext);
        }
        return "." + ext;
    }

    /**
     * Result of a file upload operation.
     *
     * <p>After audit finding 2.1, {@code objectName} is the LOGICAL path
     * ({@code tenantId/category/entityId/timestamp_uuid.ext}) — never the
     * opaque Drive fileId. {@code driveFileId} holds the Drive identifier and
     * exists primarily for diagnostics; callers should NOT return it to
     * clients, since exposing it re-introduces the tenant-isolation gap.</p>
     */
    @lombok.Builder
    @lombok.Data
    public static class FileUploadResult {
        private String objectName;
        private String driveFileId;
        private String bucket;
        private String originalFilename;
        private String contentType;
        private long size;
        private String category;
        private UUID entityId;
        private LocalDateTime uploadedAt;
    }
}
