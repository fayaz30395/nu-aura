package com.hrms.application.payroll.service;

import com.hrms.api.payroll.dto.StatutoryFilingDto;
import com.hrms.api.payroll.dto.StatutoryFilingDto.*;
import com.hrms.application.document.service.FileStorageService;
import com.hrms.application.payroll.service.filing.FilingFormatGenerator;
import com.hrms.application.payroll.service.filing.FilingFormatGenerator.FilingGenerationResult;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.StatutoryFilingRun;
import com.hrms.domain.payroll.StatutoryFilingRun.FilingStatus;
import com.hrms.domain.payroll.StatutoryFilingTemplate;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.domain.payroll.StatutoryFilingTemplate.OutputFormat;
import com.hrms.infrastructure.payroll.repository.StatutoryFilingRunRepository;
import com.hrms.infrastructure.payroll.repository.StatutoryFilingTemplateRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.*;

/**
 * Service for managing statutory filing generation, validation, and submission tracking.
 * Delegates to specific {@link FilingFormatGenerator} implementations via the strategy pattern.
 */
@Slf4j
@Service
public class StatutoryFilingService {

    private final StatutoryFilingTemplateRepository templateRepository;
    private final StatutoryFilingRunRepository filingRunRepository;
    private final FileStorageService fileStorageService;
    private final Map<FilingType, FilingFormatGenerator> generators;

    private static final String CATEGORY_STATUTORY = "statutory-filings";

    public StatutoryFilingService(
            StatutoryFilingTemplateRepository templateRepository,
            StatutoryFilingRunRepository filingRunRepository,
            FileStorageService fileStorageService,
            List<FilingFormatGenerator> generatorList) {
        this.templateRepository = templateRepository;
        this.filingRunRepository = filingRunRepository;
        this.fileStorageService = fileStorageService;

        // Build lookup map from the injected generators
        this.generators = new EnumMap<>(FilingType.class);
        for (FilingFormatGenerator generator : generatorList) {
            this.generators.put(generator.getFilingType(), generator);
        }
        log.info("Loaded {} statutory filing generators: {}",
                generators.size(), generators.keySet());
    }

    // ─── Filing Type Information ──────────────────────────────────────────────

    /**
     * Returns all available filing types with metadata (name, description, format, frequency, portal).
     */
    public List<FilingTypeInfo> getAvailableFilingTypes() {
        return List.of(
            FilingTypeInfo.builder()
                .filingType(FilingType.PF_ECR)
                .name("PF ECR")
                .description("Electronic Challan-cum-Return for EPFO portal")
                .format(OutputFormat.TEXT)
                .frequency("Monthly")
                .portalName("EPFO Unified Portal")
                .portalUrl("https://unifiedportal-emp.epfindia.gov.in")
                .build(),
            FilingTypeInfo.builder()
                .filingType(FilingType.ESI_RETURN)
                .name("ESI Return")
                .description("Employee State Insurance contribution return")
                .format(OutputFormat.EXCEL)
                .frequency("Monthly")
                .portalName("ESIC Portal")
                .portalUrl("https://www.esic.in")
                .build(),
            FilingTypeInfo.builder()
                .filingType(FilingType.PT_CHALLAN)
                .name("Professional Tax Challan")
                .description("State-level Professional Tax payment challan")
                .format(OutputFormat.CSV)
                .frequency("Monthly")
                .portalName("State Tax Portal")
                .portalUrl("")
                .build(),
            FilingTypeInfo.builder()
                .filingType(FilingType.FORM_16)
                .name("Form 16")
                .description("Annual TDS certificate for employees")
                .format(OutputFormat.PDF)
                .frequency("Annual (Financial Year)")
                .portalName("TRACES Portal")
                .portalUrl("https://www.tdscpc.gov.in")
                .build(),
            FilingTypeInfo.builder()
                .filingType(FilingType.FORM_24Q)
                .name("Form 24Q")
                .description("Quarterly TDS return for salary payments")
                .format(OutputFormat.EXCEL)
                .frequency("Quarterly")
                .portalName("TRACES Portal")
                .portalUrl("https://www.tdscpc.gov.in")
                .build(),
            FilingTypeInfo.builder()
                .filingType(FilingType.LWF_RETURN)
                .name("LWF Return")
                .description("Labour Welfare Fund contribution return")
                .format(OutputFormat.CSV)
                .frequency("Semi-Annual (June & December)")
                .portalName("State LWF Portal")
                .portalUrl("")
                .build()
        );
    }

    // ─── Generate Filing ─────────────────────────────────────────────────────

    /**
     * Generate a statutory filing for the given type and period.
     * Creates the file, uploads to MinIO, and creates a filing run record.
     */
    @Transactional
    public FilingRunResponse generateFiling(GenerateRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID userId = SecurityContext.getCurrentUserId();

        FilingFormatGenerator generator = generators.get(request.getFilingType());
        if (generator == null) {
            throw new BusinessException("No generator available for filing type: " + request.getFilingType());
        }

        // Generate the file
        FilingGenerationResult result = generator.generate(tenantId, request.getMonth(), request.getYear());

        if (result.fileBytes().length == 0) {
            throw new BusinessException("No data available for the selected period. Ensure payroll has been processed.");
        }

        // Upload to MinIO
        FileStorageService.FileUploadResult uploadResult = fileStorageService.uploadFile(
                new ByteArrayInputStream(result.fileBytes()),
                result.fileName(),
                result.contentType(),
                result.fileBytes().length,
                CATEGORY_STATUTORY,
                tenantId
        );

        // Create filing run record
        StatutoryFilingRun run = StatutoryFilingRun.builder()
                .filingType(request.getFilingType())
                .periodMonth(request.getMonth())
                .periodYear(request.getYear())
                .generatedBy(userId)
                .remarks(request.getRemarks())
                .build();

        run.markGenerated(
                uploadResult.getObjectName(),
                result.fileName(),
                result.contentType(),
                result.fileBytes().length,
                result.totalRecords()
        );

        StatutoryFilingRun saved = filingRunRepository.save(run);

        log.info("Generated statutory filing: type={}, period={}/{}, records={}, runId={}",
                request.getFilingType(), request.getMonth(), request.getYear(),
                result.totalRecords(), saved.getId());

        return toResponse(saved);
    }

    // ─── Validate Filing ─────────────────────────────────────────────────────

    /**
     * Validate a generated filing against statutory rules.
     */
    @Transactional
    public ValidationResult validateFiling(UUID filingRunId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        StatutoryFilingRun run = filingRunRepository.findById(filingRunId)
                .orElseThrow(() -> new BusinessException("Filing run not found: " + filingRunId));

        if (!run.getTenantId().equals(tenantId)) {
            throw new BusinessException("Filing run not found: " + filingRunId);
        }

        FilingFormatGenerator generator = generators.get(run.getFilingType());
        if (generator == null) {
            throw new BusinessException("No generator available for filing type: " + run.getFilingType());
        }

        String validationJson = generator.validate(tenantId, run.getPeriodMonth(), run.getPeriodYear());
        run.markValidated(validationJson);
        filingRunRepository.save(run);

        // Count errors vs warnings
        int errorCount = 0;
        int warningCount = 0;
        if (validationJson != null && !validationJson.equals("[]")) {
            errorCount = countOccurrences(validationJson, "\"type\":\"ERROR\"");
            warningCount = countOccurrences(validationJson, "\"type\":\"WARNING\"");
        }

        return ValidationResult.builder()
                .filingRunId(filingRunId)
                .valid(errorCount == 0)
                .errorCount(errorCount)
                .warningCount(warningCount)
                .validationErrors(validationJson)
                .build();
    }

    // ─── Download Filing ─────────────────────────────────────────────────────

    /**
     * Get the generated file as an InputStream for download.
     */
    @Transactional(readOnly = true)
    public InputStream downloadFiling(UUID filingRunId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        StatutoryFilingRun run = filingRunRepository.findById(filingRunId)
                .orElseThrow(() -> new BusinessException("Filing run not found: " + filingRunId));

        if (!run.getTenantId().equals(tenantId)) {
            throw new BusinessException("Filing run not found: " + filingRunId);
        }

        if (run.getFileStoragePath() == null) {
            throw new BusinessException("Filing has not been generated yet");
        }

        return fileStorageService.getFile(run.getFileStoragePath());
    }

    /**
     * Get the filing run details (needed for Content-Disposition header in controller).
     */
    @Transactional(readOnly = true)
    public StatutoryFilingRun getFilingRun(UUID filingRunId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return filingRunRepository.findById(filingRunId)
                .filter(r -> r.getTenantId().equals(tenantId))
                .orElseThrow(() -> new BusinessException("Filing run not found: " + filingRunId));
    }

    // ─── Filing History ──────────────────────────────────────────────────────

    /**
     * Get paginated filing history for the current tenant.
     */
    @Transactional(readOnly = true)
    public Page<FilingRunResponse> getFilingHistory(FilingType filingType, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();

        Page<StatutoryFilingRun> runs;
        if (filingType != null) {
            runs = filingRunRepository.findByTenantIdAndFilingTypeOrderByCreatedAtDesc(
                    tenantId, filingType, pageable);
        } else {
            runs = filingRunRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        }

        return runs.map(this::toResponse);
    }

    /**
     * Get a single filing run detail.
     */
    @Transactional(readOnly = true)
    public FilingRunResponse getFilingRunDetail(UUID filingRunId) {
        return toResponse(getFilingRun(filingRunId));
    }

    // ─── Submit Filing ───────────────────────────────────────────────────────

    /**
     * Mark a filing as submitted to the government portal.
     */
    @Transactional
    public FilingRunResponse markAsSubmitted(UUID filingRunId, SubmitRequest request) {
        UUID userId = SecurityContext.getCurrentUserId();
        StatutoryFilingRun run = getFilingRun(filingRunId);
        run.markSubmitted(userId, request.getRemarks());
        StatutoryFilingRun saved = filingRunRepository.save(run);
        log.info("Filing run {} marked as submitted by user {}", filingRunId, userId);
        return toResponse(saved);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private FilingRunResponse toResponse(StatutoryFilingRun run) {
        String periodLabel = Month.of(run.getPeriodMonth())
                .getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + run.getPeriodYear();

        return FilingRunResponse.builder()
                .id(run.getId())
                .filingType(run.getFilingType())
                .filingTypeName(formatFilingTypeName(run.getFilingType()))
                .periodMonth(run.getPeriodMonth())
                .periodYear(run.getPeriodYear())
                .periodLabel(periodLabel)
                .status(run.getStatus())
                .generatedBy(run.getGeneratedBy())
                .generatedAt(run.getGeneratedAt())
                .fileName(run.getFileName())
                .fileSize(run.getFileSize())
                .validationErrors(run.getValidationErrors())
                .totalRecords(run.getTotalRecords())
                .submittedAt(run.getSubmittedAt())
                .submittedBy(run.getSubmittedBy())
                .remarks(run.getRemarks())
                .createdAt(run.getCreatedAt())
                .build();
    }

    private String formatFilingTypeName(FilingType type) {
        return switch (type) {
            case PF_ECR -> "PF ECR";
            case ESI_RETURN -> "ESI Return";
            case PT_CHALLAN -> "Professional Tax Challan";
            case FORM_16 -> "Form 16";
            case FORM_24Q -> "Form 24Q";
            case LWF_RETURN -> "LWF Return";
        };
    }

    private int countOccurrences(String str, String sub) {
        int count = 0;
        int idx = 0;
        while ((idx = str.indexOf(sub, idx)) != -1) {
            count++;
            idx += sub.length();
        }
        return count;
    }
}
