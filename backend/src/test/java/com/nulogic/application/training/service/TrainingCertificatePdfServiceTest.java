package com.nulogic.application.training.service;

import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.training.TrainingEnrollment;
import com.nulogic.domain.training.TrainingProgram;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.training.repository.TrainingEnrollmentRepository;
import com.nulogic.infrastructure.training.repository.TrainingProgramRepository;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TrainingCertificatePdfService")
class TrainingCertificatePdfServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private TrainingEnrollmentRepository enrollmentRepository;
    @Mock
    private TrainingProgramRepository programRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private FileStorageService fileStorageService;

    private TrainingCertificatePdfService service;
    private final UUID tenantId = UUID.randomUUID();

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        service = new TrainingCertificatePdfService(enrollmentRepository, programRepository, employeeRepository, fileStorageService);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    @Test
    @DisplayName("renders a real (non-empty) PDF and uploads it")
    void generatesRealPdfAndUploads() {
        UUID enrollmentId = UUID.randomUUID();
        TrainingEnrollment enrollment = new TrainingEnrollment();
        enrollment.setId(enrollmentId);
        enrollment.setTenantId(tenantId);
        enrollment.setProgramId(UUID.randomUUID());
        enrollment.setEmployeeId(UUID.randomUUID());
        enrollment.setCompletionDate(LocalDate.of(2026, 1, 15));
        enrollment.setAssessmentScore(92);

        TrainingProgram program = new TrainingProgram();
        program.setProgramName("Leadership 101");
        when(programRepository.findByIdAndTenantId(enrollment.getProgramId(), tenantId)).thenReturn(Optional.of(program));

        Employee employee = new Employee();
        employee.setFirstName("Jane");
        employee.setLastName("Doe");
        when(employeeRepository.findByIdAndTenantId(enrollment.getEmployeeId(), tenantId)).thenReturn(Optional.of(employee));

        FileStorageService.FileUploadResult uploadResult = FileStorageService.FileUploadResult.builder()
                .objectName("tenant/certificates/x.pdf")
                .build();
        when(fileStorageService.uploadFile(any(), any(), any(), anyLong(), any(), any())).thenReturn(uploadResult);
        when(fileStorageService.getDownloadUrl(uploadResult.getObjectName()))
                .thenReturn("/api/v1/files/download/direct?objectName=tenant/certificates/x.pdf");

        String url = service.generateCertificatePdf(enrollment);

        assertThat(url).isEqualTo("/api/v1/files/download/direct?objectName=tenant/certificates/x.pdf");

        var captor = org.mockito.ArgumentCaptor.forClass(java.io.InputStream.class);
        verify(fileStorageService).uploadFile(captor.capture(), any(), any(), anyLong(), any(), any());
        assertThat(captor.getValue()).isNotNull();
    }
}
