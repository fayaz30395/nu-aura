package com.hrms.application.payroll.service;

import com.hrms.api.payroll.dto.StatutoryFilingDto.GenerateRequest;
import com.hrms.api.payroll.dto.StatutoryFilingDto.FilingRunResponse;
import com.hrms.api.payroll.dto.StatutoryFilingDto.FilingTypeInfo;
import com.hrms.api.payroll.dto.StatutoryFilingDto.SubmitRequest;
import com.hrms.api.payroll.dto.StatutoryFilingDto.ValidationResult;
import com.hrms.application.document.service.FileStorageService;
import com.hrms.application.document.service.FileStorageService.FileUploadResult;
import com.hrms.application.payroll.service.filing.FilingFormatGenerator;
import com.hrms.application.payroll.service.filing.FilingFormatGenerator.FilingGenerationResult;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.payroll.StatutoryFilingRun;
import com.hrms.domain.payroll.StatutoryFilingRun.FilingStatus;
import com.hrms.domain.payroll.StatutoryFilingTemplate.FilingType;
import com.hrms.infrastructure.payroll.repository.StatutoryFilingRunRepository;
import com.hrms.infrastructure.payroll.repository.StatutoryFilingTemplateRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatutoryFilingServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    @Mock
    private StatutoryFilingTemplateRepository templateRepository;
    @Mock
    private StatutoryFilingRunRepository filingRunRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private FilingFormatGenerator pfEcrGenerator;
    private StatutoryFilingService service;

    @BeforeEach
    void setUp() {
        when(pfEcrGenerator.getFilingType()).thenReturn(FilingType.PF_ECR);
        service = new StatutoryFilingService(
                templateRepository, filingRunRepository, fileStorageService,
                List.of(pfEcrGenerator));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContext.clear();
    }

    @Test
    @DisplayName("getAvailableFilingTypes returns all 6 filing types")
    void getAvailableFilingTypes_returnsAll() {
        List<FilingTypeInfo> types = service.getAvailableFilingTypes();
        assertThat(types).hasSize(6);
        assertThat(types).extracting(FilingTypeInfo::getFilingType)
                .containsExactlyInAnyOrder(
                        FilingType.PF_ECR, FilingType.ESI_RETURN, FilingType.PT_CHALLAN,
                        FilingType.FORM_16, FilingType.FORM_24Q, FilingType.LWF_RETURN);
    }

    @Test
    @DisplayName("generateFiling creates run and uploads to storage")
    void generateFiling_success() {
        TenantContext.setCurrentTenant(TENANT_ID);
        SecurityContext.setCurrentUser(USER_ID, null, Set.of("HR_ADMIN"), Map.of());

        byte[] fileBytes = "UAN|Name|Gross".getBytes();
        FilingGenerationResult genResult = new FilingGenerationResult(
                fileBytes, "PF_ECR_2026_03.txt", "text/plain", 5);

        when(pfEcrGenerator.generate(eq(TENANT_ID), eq(3), eq(2026))).thenReturn(genResult);
        when(fileStorageService.uploadFile(
                any(InputStream.class), anyString(), anyString(), anyLong(), anyString(), any(UUID.class)))
                .thenReturn(FileUploadResult.builder()
                        .objectName("tenant/statutory-filings/obj123")
                        .originalFilename("PF_ECR_2026_03.txt")
                        .contentType("text/plain")
                        .size(fileBytes.length)
                        .build());

        when(filingRunRepository.save(any(StatutoryFilingRun.class)))
                .thenAnswer(invocation -> {
                    StatutoryFilingRun run = invocation.getArgument(0);
                    run.setId(UUID.randomUUID());
                    run.setCreatedAt(LocalDateTime.now());
                    return run;
                });

        GenerateRequest request = GenerateRequest.builder()
                .filingType(FilingType.PF_ECR)
                .month(3)
                .year(2026)
                .build();

        FilingRunResponse response = service.generateFiling(request);

        assertThat(response).isNotNull();
        assertThat(response.getFilingType()).isEqualTo(FilingType.PF_ECR);
        assertThat(response.getStatus()).isEqualTo(FilingStatus.GENERATED);
        assertThat(response.getTotalRecords()).isEqualTo(5);
        assertThat(response.getFileName()).isEqualTo("PF_ECR_2026_03.txt");

        verify(fileStorageService).uploadFile(
                any(InputStream.class), eq("PF_ECR_2026_03.txt"), eq("text/plain"),
                eq((long) fileBytes.length), eq("statutory-filings"), eq(TENANT_ID));
        verify(filingRunRepository).save(any(StatutoryFilingRun.class));
    }

    @Test
    @DisplayName("generateFiling throws when no data available")
    void generateFiling_noData_throws() {
        TenantContext.setCurrentTenant(TENANT_ID);
        SecurityContext.setCurrentUser(USER_ID, null, Set.of("HR_ADMIN"), Map.of());

        FilingGenerationResult emptyResult = new FilingGenerationResult(
                new byte[0], "PF_ECR_2026_03.txt", "text/plain", 0);

        when(pfEcrGenerator.generate(eq(TENANT_ID), eq(3), eq(2026))).thenReturn(emptyResult);

        GenerateRequest request = GenerateRequest.builder()
                .filingType(FilingType.PF_ECR)
                .month(3)
                .year(2026)
                .build();

        assertThatThrownBy(() -> service.generateFiling(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No data available");
    }

    @Test
    @DisplayName("generateFiling throws for unsupported filing type")
    void generateFiling_unsupportedType_throws() {
        TenantContext.setCurrentTenant(TENANT_ID);
        SecurityContext.setCurrentUser(USER_ID, null, Set.of("HR_ADMIN"), Map.of());

        GenerateRequest request = GenerateRequest.builder()
                .filingType(FilingType.ESI_RETURN) // No generator registered for ESI in this test
                .month(3)
                .year(2026)
                .build();

        assertThatThrownBy(() -> service.generateFiling(request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("No generator available");
    }

    @Test
    @DisplayName("validateFiling returns validation result")
    void validateFiling_success() {
        TenantContext.setCurrentTenant(TENANT_ID);

        UUID runId = UUID.randomUUID();
        StatutoryFilingRun run = StatutoryFilingRun.builder()
                .filingType(FilingType.PF_ECR)
                .periodMonth(3)
                .periodYear(2026)
                .generatedBy(USER_ID)
                .status(FilingStatus.GENERATED)
                .build();
        run.setTenantId(TENANT_ID);
        run.setId(runId);

        when(filingRunRepository.findById(runId)).thenReturn(Optional.of(run));
        when(pfEcrGenerator.validate(TENANT_ID, 3, 2026))
                .thenReturn("[{\"type\":\"WARNING\",\"message\":\"UAN placeholder\"}]");
        when(filingRunRepository.save(any(StatutoryFilingRun.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ValidationResult result = service.validateFiling(runId);

        assertThat(result.isValid()).isTrue(); // only warnings, no errors
        assertThat(result.getWarningCount()).isEqualTo(1);
        assertThat(result.getErrorCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("markAsSubmitted transitions status correctly")
    void markAsSubmitted_success() {
        TenantContext.setCurrentTenant(TENANT_ID);
        SecurityContext.setCurrentUser(USER_ID, null, Set.of("HR_ADMIN"), Map.of());

        UUID runId = UUID.randomUUID();
        StatutoryFilingRun run = StatutoryFilingRun.builder()
                .filingType(FilingType.PF_ECR)
                .periodMonth(3)
                .periodYear(2026)
                .generatedBy(USER_ID)
                .status(FilingStatus.VALIDATED)
                .build();
        run.setTenantId(TENANT_ID);
        run.setId(runId);
        run.setCreatedAt(LocalDateTime.now());

        when(filingRunRepository.findById(runId)).thenReturn(Optional.of(run));
        when(filingRunRepository.save(any(StatutoryFilingRun.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FilingRunResponse response = service.markAsSubmitted(runId,
                SubmitRequest.builder().remarks("Filed on portal").build());

        assertThat(response.getStatus()).isEqualTo(FilingStatus.SUBMITTED);
        assertThat(response.getRemarks()).isEqualTo("Filed on portal");
    }

    @Test
    @DisplayName("downloadFiling throws for non-existent run")
    void downloadFiling_notFound_throws() {
        TenantContext.setCurrentTenant(TENANT_ID);
        UUID randomId = UUID.randomUUID();
        when(filingRunRepository.findById(randomId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.downloadFiling(randomId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Filing run not found");
    }

    @Test
    @DisplayName("downloadFiling enforces tenant isolation")
    void downloadFiling_wrongTenant_throws() {
        TenantContext.setCurrentTenant(TENANT_ID);

        UUID runId = UUID.randomUUID();
        StatutoryFilingRun run = StatutoryFilingRun.builder()
                .filingType(FilingType.PF_ECR)
                .periodMonth(3)
                .periodYear(2026)
                .generatedBy(USER_ID)
                .build();
        run.setTenantId(UUID.randomUUID()); // different tenant
        run.setId(runId);

        when(filingRunRepository.findById(runId)).thenReturn(Optional.of(run));

        assertThatThrownBy(() -> service.downloadFiling(runId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Filing run not found");
    }
}
