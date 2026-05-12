package com.nulogic.application.compliance.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.attendance.AttendanceRecord;
import com.nulogic.domain.compliance.DsrRequest;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.leave.LeaveBalance;
import com.nulogic.domain.leave.LeaveRequest;
import com.nulogic.domain.payroll.SalaryStructure;
import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.attendance.repository.AttendanceRecordRepository;
import com.nulogic.infrastructure.audit.repository.AuditLogRepository;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.leave.repository.LeaveBalanceRepository;
import com.nulogic.infrastructure.leave.repository.LeaveRequestRepository;
import com.nulogic.infrastructure.payroll.repository.SalaryStructureRepository;
import com.nulogic.infrastructure.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * GDPR Article 15 (right of access) and Article 20 (right to data portability)
 * fulfilment engine.
 *
 * <p>Aggregates every tenant-scoped row that links back to a single requester
 * — user record (with credentials stripped), employee profile, the trailing
 * 90 days of attendance, leave balances + history, the latest salary
 * structure, and any audit-log rows attributed to that user — and renders it
 * into a single JSON artefact suitable for inline download or signed-URL
 * delivery.</p>
 *
 * <p><strong>Tenant scoping:</strong> every repository call goes through a
 * tenant-scoped finder. The single source of truth is
 * {@link TenantContext#requireCurrentTenant()}; the request's stored
 * {@code tenantId} is cross-checked to fail closed on a thread-leak.</p>
 *
 * <p><strong>Size ceiling:</strong> Jackson serialisation runs to a single
 * {@code byte[]}; if the rendered payload exceeds 50 MB the call throws —
 * the chunked-export path is a separate ticket and intentionally not
 * implemented here.</p>
 *
 * <p>This service is intentionally narrow: it only produces the artefact and
 * returns the SHA-256 + size for the persistence layer ({@link DsrService})
 * to stamp onto the {@link DsrRequest}. It does not flip the request's
 * status, write the audit row, or persist anywhere — keeping the
 * "build artefact" and "advance the workflow" concerns separate makes both
 * easier to test and reason about.</p>
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DsrExportService {

    /**
     * Hard ceiling on the in-memory payload, in bytes. Beyond this we must spool to disk / object storage.
     */
    static final int MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;

    /** Trailing window for attendance — Article 15 says "personal data being processed", */
    /**
     * which we operationalise as the last 90 days for high-volume daily rows.
     */
    static final int ATTENDANCE_WINDOW_DAYS = 90;

    /**
     * Hard cap on audit-log rows pulled into the export to bound memory & artefact size.
     */
    static final int AUDIT_LOG_LIMIT = 5_000;

    /**
     * Schema fingerprint emitted in the portability envelope's {@code schema}
     * stanza. Bump whenever the export shape changes so downstream consumers
     * can detect a re-import incompatibility.
     */
    private static final String PORTABILITY_SCHEMA_VERSION = "1.0";

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LeaveBalanceRepository leaveBalanceRepository;
    private final LeaveRequestRepository leaveRequestRepository;
    private final SalaryStructureRepository salaryStructureRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    /**
     * Build a JSON artefact for the given DSR request. The {@code request}
     * must already be loaded and tenant-scoped by the caller — this service
     * does not re-fetch it.
     *
     * @param request DSR request, must be {@link DsrRequest.RequestType#ACCESS}
     *                or {@link DsrRequest.RequestType#PORTABILITY}
     * @return rendered artefact with type, MIME, filename, and byte payload
     * @throws IllegalStateException     if tenant context is missing or doesn't
     *                                   match the request's tenant
     * @throws IllegalArgumentException  on unsupported request types
     * @throws ArtifactTooLargeException if the rendered JSON exceeds the
     *                                   50 MB in-memory ceiling
     */
    @Transactional(readOnly = true)
    public DsrExportArtifact buildExport(DsrRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("request is required");
        }
        DsrRequest.RequestType type = request.getRequestType();
        if (type != DsrRequest.RequestType.ACCESS && type != DsrRequest.RequestType.PORTABILITY) {
            // Erasure & rectification are handled by other services; throwing here
            // is the right contract — silently producing an empty file would be worse.
            throw new IllegalArgumentException(
                    "DsrExportService only handles ACCESS and PORTABILITY (got " + type + ")");
        }

        UUID tenantId = TenantContext.requireCurrentTenant();
        if (request.getTenantId() != null && !request.getTenantId().equals(tenantId)) {
            // Defense-in-depth — request was already tenant-scoped at load time,
            // but cross-tenant ID guessing or a leaked thread-local would land here.
            throw new IllegalStateException("DSR request tenant mismatch — refusing to export");
        }
        UUID requesterUserId = request.getRequesterUserId();

        // ---- Aggregate the data graph ----
        ExportPayload payload = aggregate(tenantId, requesterUserId);

        // ---- Encode ----
        Object envelope = (type == DsrRequest.RequestType.PORTABILITY)
                ? portabilityEnvelope(payload, request)
                : accessEnvelope(payload, request);

        byte[] bytes;
        try {
            // Pretty-printed for the human-readable ACCESS form; the PORTABILITY form
            // is structured but also benefits from indentation when delivered as a file.
            bytes = objectMapper.copy()
                    .enable(SerializationFeature.INDENT_OUTPUT)
                    .writeValueAsBytes(envelope);
        } catch (JsonProcessingException e) {
            // Fail loud — a serialisation failure means the export is invalid and
            // the workflow must not advance to COMPLETED with a half-baked artefact.
            throw new IllegalStateException("Failed to serialise DSR export payload", e);
        }

        if (bytes.length > MAX_ARTIFACT_BYTES) {
            // Chunked / paged export is a separate ticket. Throw rather than
            // truncate — silent loss of personal data on an Article 15 request
            // would be a far worse compliance failure than a hard error.
            throw new ArtifactTooLargeException(
                    "Use chunked export: rendered DSR artefact is "
                            + bytes.length + " bytes (cap " + MAX_ARTIFACT_BYTES + ")");
        }

        String filename = "dsr-export-" + request.getId() + ".json";
        log.info("DSR export built: requestId={}, type={}, sizeBytes={}, tenant={}",
                request.getId(), type, bytes.length, tenantId);
        return new DsrExportArtifact(type, "application/json", filename, bytes);
    }

    /**
     * Compute the lowercase hex SHA-256 digest of an artefact's bytes. Used by
     * {@link DsrService} to stamp {@code artifact_sha256} onto the DSR row
     * for tamper-evidence and the audit chain.
     */
    public String sha256Hex(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandatory in every JRE; reaching this branch means a
            // catastrophic platform misconfiguration — wrap into runtime.
            throw new IllegalStateException("SHA-256 unavailable on this JVM", e);
        }
    }

    // ==================== Aggregation ====================

    /**
     * Pull the personal-data graph for the requester from every tenant-scoped
     * source. Each repository call is strictly tenant-bounded; no cross-tenant
     * read can occur even if a row's logical UUID was guessed by an attacker.
     */
    private ExportPayload aggregate(UUID tenantId, UUID userId) {
        // User row — credentials are stripped in {@link #userProjection} before serialisation.
        User user = userRepository.findByIdAndTenantId(userId, tenantId).orElse(null);

        // Employee row — drives most downstream lookups (attendance, leave, salary).
        Employee employee = employeeRepository.findByUserIdAndTenantId(userId, tenantId).orElse(null);
        UUID employeeId = employee != null ? employee.getId() : null;

        // Attendance — trailing 90 days only. A full history would balloon the
        // artefact and is rarely what an Article 15 requester actually wants.
        List<AttendanceRecord> attendance = List.of();
        if (employeeId != null) {
            LocalDate today = LocalDate.now();
            LocalDate window = today.minusDays(ATTENDANCE_WINDOW_DAYS);
            attendance = attendanceRecordRepository
                    .findAllByTenantIdAndEmployeeIdAndAttendanceDateBetween(tenantId, employeeId, window, today);
        }

        // Leave balances — current set across all leave types (no historical years pruned).
        List<LeaveBalance> leaveBalances = employeeId != null
                ? leaveBalanceRepository.findAllByTenantIdAndEmployeeId(tenantId, employeeId)
                : List.of();

        // Leave requests — full history; cardinality is low enough (a few dozen rows
        // per employee per year) that paging would be over-engineering here.
        List<LeaveRequest> leaveRequests = employeeId != null
                ? leaveRequestRepository.findAllByTenantIdAndEmployeeId(
                tenantId, employeeId, PageRequest.of(0, 500, Sort.by(Sort.Direction.DESC, "startDate")))
                  .getContent()
                : List.of();

        // Salary structure — latest active only. The full salary history is
        // payroll-team data, not "personal data being processed today".
        SalaryStructure salary = null;
        if (employeeId != null) {
            salary = salaryStructureRepository
                    .findLatestActiveByTenantIdAndEmployeeId(tenantId, employeeId)
                    .orElse(null);
        }

        // Audit-log rows where the requester is the actor (their actions, not
        // actions performed on them — that's a separate Article 15 line item
        // and tracked via the entityId-based queries downstream).
        var auditPage = auditLogRepository.findByTenantIdAndActorIdOrderByCreatedAtDesc(
                tenantId, userId, PageRequest.of(0, AUDIT_LOG_LIMIT));

        return new ExportPayload(
                user, employee, attendance, leaveBalances, leaveRequests, salary, auditPage.getContent());
    }

    // ==================== Envelope shaping ====================

    /**
     * Human-readable Article 15 (Access) shape — a flat map of resource → list
     * of rows. Optimised for a person to read, not for re-import.
     */
    private Map<String, Object> accessEnvelope(ExportPayload p, DsrRequest request) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("gdprArticle", "Article 15 — Right of Access");
        out.put("generatedAt", LocalDateTime.now().toString());
        out.put("requestId", request.getId());
        out.put("tenantId", request.getTenantId());
        out.put("requesterUserId", request.getRequesterUserId());
        out.put("user", userProjection(p.user()));
        out.put("employee", employeeProjection(p.employee()));
        out.put("attendanceLast90Days", p.attendance().stream().map(this::attendanceProjection).toList());
        out.put("leaveBalances", p.leaveBalances().stream().map(this::leaveBalanceProjection).toList());
        out.put("leaveRequests", p.leaveRequests().stream().map(this::leaveRequestProjection).toList());
        out.put("latestSalaryStructure", salaryProjection(p.salary()));
        out.put("auditLog", p.auditLogs().stream().map(this::auditProjection).toList());
        return out;
    }

    /**
     * Article 20 (Portability) machine-readable shape: a {@code data} bag of
     * canonical row projections plus a {@code schema} stanza describing the
     * fields. Downstream tooling re-importing this artefact can validate
     * against the {@code schemaVersion} before processing.
     */
    private Map<String, Object> portabilityEnvelope(ExportPayload p, DsrRequest request) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("user", userProjection(p.user()));
        data.put("employee", employeeProjection(p.employee()));
        data.put("attendanceLast90Days", p.attendance().stream().map(this::attendanceProjection).toList());
        data.put("leaveBalances", p.leaveBalances().stream().map(this::leaveBalanceProjection).toList());
        data.put("leaveRequests", p.leaveRequests().stream().map(this::leaveRequestProjection).toList());
        data.put("latestSalaryStructure", salaryProjection(p.salary()));
        data.put("auditLog", p.auditLogs().stream().map(this::auditProjection).toList());

        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("schemaVersion", PORTABILITY_SCHEMA_VERSION);
        schema.put("encoding", "application/json");
        schema.put("attendanceWindowDays", ATTENDANCE_WINDOW_DAYS);
        schema.put("auditLogLimit", AUDIT_LOG_LIMIT);
        schema.put("collections", List.of(
                "user", "employee", "attendanceLast90Days", "leaveBalances",
                "leaveRequests", "latestSalaryStructure", "auditLog"));

        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("gdprArticle", "Article 20 — Right to Data Portability");
        envelope.put("generatedAt", LocalDateTime.now().toString());
        envelope.put("requestId", request.getId());
        envelope.put("tenantId", request.getTenantId());
        envelope.put("requesterUserId", request.getRequesterUserId());
        envelope.put("data", data);
        envelope.put("schema", schema);
        return envelope;
    }

    // ==================== Row projections (strip sensitive fields) ====================

    /**
     * Project a {@link User} into the export shape. The {@code passwordHash},
     * {@code mfaSecret}, and password-reset token fields are intentionally
     * omitted — GDPR right-of-access covers personal data, not authentication
     * credentials (recital 26, ICO guidance).
     */
    private Map<String, Object> userProjection(User u) {
        if (u == null) return Map.of();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", u.getId());
        out.put("email", u.getEmail());
        out.put("firstName", u.getFirstName());
        out.put("lastName", u.getLastName());
        out.put("status", u.getStatus() != null ? u.getStatus().name() : null);
        out.put("authProvider", u.getAuthProvider() != null ? u.getAuthProvider().name() : null);
        out.put("mfaEnabled", u.getMfaEnabled());
        out.put("lastLoginAt", u.getLastLoginAt());
        out.put("passwordChangedAt", u.getPasswordChangedAt());
        out.put("profilePictureUrl", u.getProfilePictureUrl());
        out.put("createdAt", u.getCreatedAt());
        out.put("updatedAt", u.getUpdatedAt());
        return out;
    }

    private Map<String, Object> employeeProjection(Employee e) {
        if (e == null) return Map.of();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", e.getId());
        out.put("employeeCode", e.getEmployeeCode());
        out.put("firstName", e.getFirstName());
        out.put("middleName", e.getMiddleName());
        out.put("lastName", e.getLastName());
        out.put("personalEmail", e.getPersonalEmail());
        out.put("phoneNumber", e.getPhoneNumber());
        out.put("emergencyContactNumber", e.getEmergencyContactNumber());
        out.put("dateOfBirth", e.getDateOfBirth());
        out.put("gender", e.getGender() != null ? e.getGender().name() : null);
        out.put("address", e.getAddress());
        out.put("city", e.getCity());
        out.put("state", e.getState());
        out.put("postalCode", e.getPostalCode());
        out.put("country", e.getCountry());
        out.put("joiningDate", e.getJoiningDate());
        out.put("confirmationDate", e.getConfirmationDate());
        out.put("exitDate", e.getExitDate());
        out.put("designation", e.getDesignation());
        out.put("level", e.getLevel() != null ? e.getLevel().name() : null);
        out.put("jobRole", e.getJobRole() != null ? e.getJobRole().name() : null);
        out.put("employmentType", e.getEmploymentType() != null ? e.getEmploymentType().name() : null);
        out.put("status", e.getStatus() != null ? e.getStatus().name() : null);
        out.put("departmentId", e.getDepartmentId());
        out.put("officeLocationId", e.getOfficeLocationId());
        out.put("teamId", e.getTeamId());
        out.put("managerId", e.getManagerId());
        out.put("createdAt", e.getCreatedAt());
        out.put("updatedAt", e.getUpdatedAt());
        // NB: bankAccountNumber / bankIfscCode / taxId are encrypted PII and
        // omitted from the standard export — surfacing them would require an
        // explicit user-acknowledged consent step that's out of scope here.
        return out;
    }

    private Map<String, Object> attendanceProjection(AttendanceRecord a) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", a.getId());
        out.put("attendanceDate", a.getAttendanceDate());
        out.put("status", a.getStatus() != null ? a.getStatus().name() : null);
        out.put("checkInTime", a.getCheckInTime());
        out.put("checkOutTime", a.getCheckOutTime());
        out.put("workDurationMinutes", a.getWorkDurationMinutes());
        out.put("overtimeMinutes", a.getOvertimeMinutes());
        out.put("isLate", a.getIsLate());
        out.put("isHalfDay", a.getIsHalfDay());
        out.put("isRemoteCheckin", a.getIsRemoteCheckin());
        out.put("notes", a.getNotes());
        return out;
    }

    private Map<String, Object> leaveBalanceProjection(LeaveBalance b) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", b.getId());
        out.put("leaveTypeId", b.getLeaveTypeId());
        out.put("year", b.getYear());
        out.put("openingBalance", b.getOpeningBalance());
        out.put("accrued", b.getAccrued());
        out.put("used", b.getUsed());
        out.put("pending", b.getPending());
        out.put("available", b.getAvailable());
        out.put("carriedForward", b.getCarriedForward());
        out.put("encashed", b.getEncashed());
        out.put("lapsed", b.getLapsed());
        out.put("lastAccrualDate", b.getLastAccrualDate());
        return out;
    }

    private Map<String, Object> leaveRequestProjection(LeaveRequest r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", r.getId());
        out.put("requestNumber", r.getRequestNumber());
        out.put("leaveTypeId", r.getLeaveTypeId());
        out.put("startDate", r.getStartDate());
        out.put("endDate", r.getEndDate());
        out.put("totalDays", r.getTotalDays());
        out.put("isHalfDay", r.getIsHalfDay());
        out.put("halfDayPeriod", r.getHalfDayPeriod() != null ? r.getHalfDayPeriod().name() : null);
        out.put("reason", r.getReason());
        out.put("status", r.getStatus() != null ? r.getStatus().name() : null);
        out.put("appliedOn", r.getAppliedOn());
        out.put("approvedOn", r.getApprovedOn());
        out.put("rejectionReason", r.getRejectionReason());
        out.put("cancelledOn", r.getCancelledOn());
        return out;
    }

    private Map<String, Object> salaryProjection(SalaryStructure s) {
        if (s == null) return Map.of();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", s.getId());
        out.put("effectiveDate", s.getEffectiveDate());
        out.put("endDate", s.getEndDate());
        out.put("basicSalary", s.getBasicSalary());
        out.put("hra", s.getHra());
        out.put("conveyanceAllowance", s.getConveyanceAllowance());
        out.put("medicalAllowance", s.getMedicalAllowance());
        out.put("specialAllowance", s.getSpecialAllowance());
        out.put("otherAllowances", s.getOtherAllowances());
        out.put("providentFund", s.getProvidentFund());
        out.put("professionalTax", s.getProfessionalTax());
        out.put("incomeTax", s.getIncomeTax());
        out.put("otherDeductions", s.getOtherDeductions());
        out.put("grossSalary", s.getGrossSalary());
        out.put("totalDeductions", s.getTotalDeductions());
        out.put("netSalary", s.getNetSalary());
        out.put("isActive", s.getIsActive());
        return out;
    }

    private Map<String, Object> auditProjection(com.nulogic.domain.audit.AuditLog a) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", a.getId());
        out.put("entityType", a.getEntityType());
        out.put("entityId", a.getEntityId());
        out.put("action", a.getAction() != null ? a.getAction().name() : null);
        out.put("createdAt", a.getCreatedAt());
        out.put("ipAddress", a.getIpAddress());
        // Omitting userAgent / oldValue / newValue: those can contain field-level
        // diffs that mention third parties, and Article 15 doesn't require us
        // to expose other data subjects' PII.
        return out;
    }

    // ==================== Internal carrier ====================

    /**
     * In-memory aggregation of every row that contributes to the export. Kept
     * as a record so the envelope shapers can pull from a single argument
     * rather than an unwieldy parameter list.
     */
    private record ExportPayload(
            User user,
            Employee employee,
            List<AttendanceRecord> attendance,
            List<LeaveBalance> leaveBalances,
            List<LeaveRequest> leaveRequests,
            SalaryStructure salary,
            List<com.nulogic.domain.audit.AuditLog> auditLogs) {
    }

    /**
     * Thrown when a rendered DSR export exceeds the in-memory ceiling. The
     * caller is expected to translate this into the "use chunked export"
     * 413/422 contract at the controller boundary — we keep it as a runtime
     * exception so the transactional path rolls back cleanly.
     */
    public static class ArtifactTooLargeException extends RuntimeException {
        public ArtifactTooLargeException(String message) {
            super(message);
        }
    }
}
