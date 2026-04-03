package com.hrms.application.contract.service;

import com.hrms.api.contract.dto.*;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.domain.contract.*;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.contract.repository.*;
import com.hrms.application.employee.service.EmployeeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ContractService.
 * Tests contract lifecycle management including CRUD, status transitions, and versioning.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("ContractService Tests")
class ContractServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID CONTRACT_ID = UUID.randomUUID();
    private static final UUID EMPLOYEE_ID = UUID.randomUUID();

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private ContractVersionRepository versionRepository;

    @Mock
    private ContractSignatureRepository signatureRepository;

    @Mock
    private ContractReminderRepository reminderRepository;

    @Mock
    private EmployeeService employeeService;

    @Mock
    private com.hrms.common.metrics.MetricsService metricsService;

    @InjectMocks
    private ContractService contractService;

    @Captor
    private ArgumentCaptor<Contract> contractCaptor;

    @Captor
    private ArgumentCaptor<ContractVersion> versionCaptor;

    private MockedStatic<SecurityContext> securityContextMock;

    @BeforeEach
    void setUp() {
        securityContextMock = mockStatic(SecurityContext.class);
        securityContextMock.when(SecurityContext::getCurrentTenantId).thenReturn(TENANT_ID);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(USER_ID);

        // Default stub: employeeService.getByIdAndTenant returns a test employee
        Employee testEmployee = Employee.builder()
                .firstName("Test")
                .lastName("Employee")
                .employeeCode("EMP001")
                .build();
        testEmployee.setId(EMPLOYEE_ID);
        testEmployee.setTenantId(TENANT_ID);
        lenient().when(employeeService.getByIdAndTenant(any(), any())).thenReturn(testEmployee);
    }

    @AfterEach
    void tearDown() {
        if (securityContextMock != null) {
            securityContextMock.close();
        }
    }

    private Contract buildContract(CreateContractRequest request) {
        return Contract.builder()
                .id(CONTRACT_ID)
                .tenantId(TENANT_ID)
                .title(request.getTitle())
                .type(request.getType())
                .status(ContractStatus.DRAFT)
                .employeeId(request.getEmployeeId())
                .vendorName(request.getVendorName())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .autoRenew(request.getAutoRenew())
                .renewalPeriodDays(request.getRenewalPeriodDays())
                .value(request.getValue())
                .currency(request.getCurrency())
                .description(request.getDescription())
                .terms(request.getTerms())
                .documentUrl(request.getDocumentUrl())
                .createdBy(USER_ID)
                .build();
    }

    @Nested
    @DisplayName("createContract")
    class CreateContract {

        @Test
        @DisplayName("Should create contract with all fields")
        void shouldCreateContractWithAllFields() {
            // Given
            CreateContractRequest request = new CreateContractRequest();
            request.setTitle("Employment Contract");
            request.setType(ContractType.EMPLOYMENT);
            request.setEmployeeId(EMPLOYEE_ID);
            request.setStartDate(LocalDate.now());
            request.setEndDate(LocalDate.now().plusYears(1));
            request.setValue(new BigDecimal("50000"));
            request.setCurrency("USD");
            request.setDescription("Standard employment contract");
            request.setTerms(Map.of("probation", "90 days"));
            request.setAutoRenew(true);
            request.setRenewalPeriodDays(365);

            Contract savedContract = buildContract(request);
            when(contractRepository.save(any(Contract.class))).thenReturn(savedContract);

            // When
            ContractDto result = contractService.createContract(request);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            Contract captured = contractCaptor.getValue();

            assertThat(captured.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(captured.getTitle()).isEqualTo("Employment Contract");
            assertThat(captured.getType()).isEqualTo(ContractType.EMPLOYMENT);
            assertThat(captured.getStatus()).isEqualTo(ContractStatus.DRAFT);
            assertThat(captured.getEmployeeId()).isEqualTo(EMPLOYEE_ID);
            assertThat(captured.getAutoRenew()).isTrue();

            // Verify version created
            verify(versionRepository).save(any(ContractVersion.class));

            assertThat(result).isNotNull();
            assertThat(result.getTitle()).isEqualTo("Employment Contract");
        }

        @Test
        @DisplayName("Should create contract with default currency when not specified")
        void shouldCreateContractWithDefaultCurrency() {
            // Given
            CreateContractRequest request = new CreateContractRequest();
            request.setTitle("Vendor Contract");
            request.setType(ContractType.VENDOR);
            request.setStartDate(LocalDate.now());

            Contract savedContract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("Vendor Contract")
                    .type(ContractType.VENDOR)
                    .status(ContractStatus.DRAFT)
                    .currency("USD")
                    .build();
            when(contractRepository.save(any(Contract.class))).thenReturn(savedContract);

            // When
            ContractDto result = contractService.createContract(request);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            assertThat(contractCaptor.getValue().getCurrency()).isEqualTo("USD");
        }

        @Test
        @DisplayName("Should create initial version with terms")
        void shouldCreateInitialVersionWithTerms() {
            // Given
            Map<String, Object> terms = Map.of(
                    "clause1", "Non-compete agreement",
                    "clause2", "Confidentiality"
            );
            CreateContractRequest request = new CreateContractRequest();
            request.setTitle("NDA");
            request.setType(ContractType.NDA);
            request.setTerms(terms);
            request.setStartDate(LocalDate.now());

            Contract savedContract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("NDA")
                    .type(ContractType.NDA)
                    .status(ContractStatus.DRAFT)
                    .build();
            when(contractRepository.save(any(Contract.class))).thenReturn(savedContract);

            // When
            contractService.createContract(request);

            // Then
            verify(versionRepository).save(versionCaptor.capture());
            ContractVersion version = versionCaptor.getValue();

            assertThat(version.getContractId()).isEqualTo(CONTRACT_ID);
            assertThat(version.getVersionNumber()).isEqualTo(1);
            assertThat(version.getContent()).isEqualTo(terms);
            assertThat(version.getChangeNotes()).isEqualTo("Initial version");
        }
    }

    @Nested
    @DisplayName("updateContract")
    class UpdateContract {

        @Test
        @DisplayName("Should update contract fields")
        void shouldUpdateContractFields() {
            // Given
            Contract existingContract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("Old Title")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.DRAFT)
                    .value(new BigDecimal("40000"))
                    .build();

            UpdateContractRequest request = new UpdateContractRequest();
            request.setTitle("New Title");
            request.setValue(new BigDecimal("50000"));

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(existingContract));
            when(contractRepository.save(any(Contract.class))).thenReturn(existingContract);

            // When
            ContractDto result = contractService.updateContract(CONTRACT_ID, request);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            Contract updated = contractCaptor.getValue();

            assertThat(updated.getTitle()).isEqualTo("New Title");
            assertThat(updated.getValue()).isEqualTo(new BigDecimal("50000"));
            assertThat(updated.getLastModifiedBy()).isEqualTo(USER_ID);
        }

        @Test
        @DisplayName("Should create new version when terms are updated")
        void shouldCreateNewVersionWhenTermsUpdated() {
            // Given
            Contract existingContract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("Contract")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.DRAFT)
                    .build();

            Map<String, Object> newTerms = Map.of("updated", "clause");
            UpdateContractRequest request = new UpdateContractRequest();
            request.setTerms(newTerms);

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(existingContract));
            when(contractRepository.save(any(Contract.class))).thenReturn(existingContract);
            when(versionRepository.findMaxVersionNumber(CONTRACT_ID)).thenReturn(1);

            // When
            contractService.updateContract(CONTRACT_ID, request);

            // Then
            verify(versionRepository).save(versionCaptor.capture());
            ContractVersion version = versionCaptor.getValue();

            assertThat(version.getVersionNumber()).isEqualTo(2);
            assertThat(version.getContent()).isEqualTo(newTerms);
            assertThat(version.getChangeNotes()).isEqualTo("Updated by user");
        }

        @Test
        @DisplayName("Should not create version when terms not changed")
        void shouldNotCreateVersionWhenTermsNotChanged() {
            // Given
            Contract existingContract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("Contract")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.DRAFT)
                    .build();

            UpdateContractRequest request = new UpdateContractRequest();
            request.setTitle("New Title"); // No terms update

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(existingContract));
            when(contractRepository.save(any(Contract.class))).thenReturn(existingContract);

            // When
            contractService.updateContract(CONTRACT_ID, request);

            // Then
            verify(versionRepository, never()).save(any(ContractVersion.class));
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when contract not found")
        void shouldThrowWhenContractNotFound() {
            // Given
            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            UpdateContractRequest request = new UpdateContractRequest();
            request.setTitle("New Title");

            // When/Then
            assertThatThrownBy(() -> contractService.updateContract(CONTRACT_ID, request))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessage("Contract not found");
        }
    }

    @Nested
    @DisplayName("getContractById")
    class GetContractById {

        @Test
        @DisplayName("Should return contract with signatures")
        void shouldReturnContractWithSignatures() {
            // Given
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("Test Contract")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.PENDING_SIGNATURES)
                    .build();

            List<ContractSignature> signatures = List.of(
                    ContractSignature.builder()
                            .id(UUID.randomUUID())
                            .contractId(CONTRACT_ID)
                            .signerName("John Doe")
                            .status(SignatureStatus.PENDING)
                            .build(),
                    ContractSignature.builder()
                            .id(UUID.randomUUID())
                            .contractId(CONTRACT_ID)
                            .signerName("Jane Smith")
                            .status(SignatureStatus.SIGNED)
                            .build()
            );

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));
            when(signatureRepository.findByContractId(CONTRACT_ID)).thenReturn(signatures);

            // When
            ContractDto result = contractService.getContractById(CONTRACT_ID);

            // Then
            assertThat(result.getSignatureCount()).isEqualTo(2);
            assertThat(result.getPendingSignatureCount()).isEqualTo(1);
            assertThat(result.getSignatures()).hasSize(2);
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when contract not found")
        void shouldThrowWhenContractNotFound() {
            // Given
            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> contractService.getContractById(CONTRACT_ID))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Status Transitions")
    class StatusTransitions {

        @Test
        @DisplayName("Should mark contract as pending review")
        void shouldMarkAsPendingReview() {
            // Given
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.DRAFT)
                    .build();

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));
            when(contractRepository.save(any(Contract.class))).thenReturn(contract);

            // When
            ContractDto result = contractService.markAsPendingReview(CONTRACT_ID);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            assertThat(contractCaptor.getValue().getStatus()).isEqualTo(ContractStatus.PENDING_REVIEW);
        }

        @Test
        @DisplayName("Should mark contract as active")
        void shouldMarkAsActive() {
            // Given
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.PENDING_SIGNATURES)
                    .build();

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));
            when(contractRepository.save(any(Contract.class))).thenReturn(contract);

            // When
            ContractDto result = contractService.markAsActive(CONTRACT_ID);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            assertThat(contractCaptor.getValue().getStatus()).isEqualTo(ContractStatus.ACTIVE);
        }

        @Test
        @DisplayName("Should terminate contract")
        void shouldTerminateContract() {
            // Given
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.ACTIVE)
                    .build();

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));
            when(contractRepository.save(any(Contract.class))).thenReturn(contract);

            // When
            ContractDto result = contractService.terminateContract(CONTRACT_ID);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            assertThat(contractCaptor.getValue().getStatus()).isEqualTo(ContractStatus.TERMINATED);
        }
    }

    @Nested
    @DisplayName("renewContract")
    class RenewContract {

        @Test
        @DisplayName("Should extend end date by renewal period")
        void shouldExtendEndDateByRenewalPeriod() {
            // Given
            LocalDate originalEndDate = LocalDate.now().plusMonths(1);
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.ACTIVE)
                    .endDate(originalEndDate)
                    .renewalPeriodDays(365)
                    .build();

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));
            when(contractRepository.save(any(Contract.class))).thenReturn(contract);

            // When
            ContractDto result = contractService.renewContract(CONTRACT_ID);

            // Then
            verify(contractRepository).save(contractCaptor.capture());
            Contract renewed = contractCaptor.getValue();

            assertThat(renewed.getEndDate()).isEqualTo(originalEndDate.plusDays(365));
            assertThat(renewed.getStatus()).isEqualTo(ContractStatus.RENEWED);
        }

        @Test
        @DisplayName("Should not renew if no end date set")
        void shouldNotRenewIfNoEndDate() {
            // Given
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .status(ContractStatus.ACTIVE)
                    .endDate(null)
                    .renewalPeriodDays(365)
                    .build();

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));

            // When
            ContractDto result = contractService.renewContract(CONTRACT_ID);

            // Then
            verify(contractRepository, never()).save(any(Contract.class));
        }
    }

    @Nested
    @DisplayName("getExpiringContracts")
    class GetExpiringContracts {

        @Test
        @DisplayName("Should return contracts expiring within specified days")
        void shouldReturnExpiringContracts() {
            // Given
            Contract expiringContract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("Expiring Soon")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.ACTIVE)
                    .endDate(LocalDate.now().plusDays(15))
                    .build();

            when(contractRepository.findExpiringContracts(
                    eq(TENANT_ID),
                    eq(ContractStatus.ACTIVE),
                    any(LocalDate.class),
                    any(LocalDate.class)
            )).thenReturn(List.of(expiringContract));
            when(signatureRepository.findPendingSignatures(CONTRACT_ID)).thenReturn(List.of());

            // When
            List<ContractListDto> result = contractService.getExpiringContracts(30);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getTitle()).isEqualTo("Expiring Soon");
        }
    }

    @Nested
    @DisplayName("getVersionHistory")
    class GetVersionHistory {

        @Test
        @DisplayName("Should return version history in descending order")
        void shouldReturnVersionHistoryDescending() {
            // Given
            List<ContractVersion> versions = List.of(
                    ContractVersion.builder()
                            .contractId(CONTRACT_ID)
                            .versionNumber(3)
                            .content(Map.of("clause", "v3"))
                            .changeNotes("Third update")
                            .createdAt(LocalDateTime.now())
                            .build(),
                    ContractVersion.builder()
                            .contractId(CONTRACT_ID)
                            .versionNumber(2)
                            .content(Map.of("clause", "v2"))
                            .changeNotes("Second update")
                            .createdAt(LocalDateTime.now().minusDays(1))
                            .build(),
                    ContractVersion.builder()
                            .contractId(CONTRACT_ID)
                            .versionNumber(1)
                            .content(Map.of("clause", "v1"))
                            .changeNotes("Initial version")
                            .createdAt(LocalDateTime.now().minusDays(2))
                            .build()
            );

            when(versionRepository.findByContractIdOrderByVersionNumberDesc(CONTRACT_ID))
                    .thenReturn(versions);

            // When
            List<Map<String, Object>> result = contractService.getVersionHistory(CONTRACT_ID);

            // Then
            assertThat(result).hasSize(3);
            assertThat(result.get(0).get("versionNumber")).isEqualTo(3);
            assertThat(result.get(1).get("versionNumber")).isEqualTo(2);
            assertThat(result.get(2).get("versionNumber")).isEqualTo(1);
        }
    }

    // Helper Methods

    @Nested
    @DisplayName("deleteContract")
    class DeleteContract {

        @Test
        @DisplayName("Should delete existing contract")
        void shouldDeleteExistingContract() {
            // Given
            Contract contract = Contract.builder()
                    .id(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .title("To Delete")
                    .type(ContractType.EMPLOYMENT)
                    .build();

            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.of(contract));
            when(contractRepository.save(any(Contract.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            // When
            contractService.deleteContract(CONTRACT_ID);

            // Then
            verify(contractRepository).save(any(Contract.class));
        }

        @Test
        @DisplayName("Should throw when contract not found")
        void shouldThrowWhenContractNotFound() {
            // Given
            when(contractRepository.findByIdAndTenantId(CONTRACT_ID, TENANT_ID))
                    .thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> contractService.deleteContract(CONTRACT_ID))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
