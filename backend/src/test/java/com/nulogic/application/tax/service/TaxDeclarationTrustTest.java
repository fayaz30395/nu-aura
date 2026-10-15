package com.nulogic.application.tax.service;

import com.nulogic.api.tax.dto.TaxDeclarationRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.tax.TaxDeclaration;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.tax.repository.TaxDeclarationRepository;
import com.nulogic.infrastructure.tax.repository.TaxProofRepository;
import com.nulogic.infrastructure.tax.repository.TaxRegimeComparisonRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Tax declaration ownership is server-derived")
class TaxDeclarationTrustTest {

    @Mock private TaxDeclarationRepository taxDeclarationRepository;
    @Mock private TaxProofRepository taxProofRepository;
    @Mock private TaxRegimeComparisonRepository taxRegimeComparisonRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private TenantTimeService tenantTimeService;
    @InjectMocks private TaxDeclarationService service;

    private MockedStatic<TenantContext> tenantContextMock;
    private MockedStatic<SecurityContext> securityContextMock;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private final UUID otherId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(callerId);
        when(employeeRepository.findByIdAndTenantId(any(), eq(tenantId))).thenReturn(Optional.of(new Employee()));
        when(taxDeclarationRepository.findByTenantIdAndEmployeeIdAndFinancialYear(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(taxDeclarationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(taxProofRepository.findByTenantIdAndTaxDeclarationId(any(), any())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    private TaxDeclarationRequest request(UUID employeeId) {
        return TaxDeclarationRequest.builder().employeeId(employeeId).financialYear("2025-2026")
                .taxRegime(TaxDeclaration.TaxRegimeType.OLD_REGIME).build();
    }

    @Test
    @DisplayName("cannot create a declaration for another employee")
    void rejectsOtherEmployee() {
        assertThatThrownBy(() -> service.createTaxDeclaration(request(otherId)))
                .isInstanceOf(AccessDeniedException.class);
        verify(taxDeclarationRepository, never()).save(any());
    }

    @Test
    @DisplayName("own declaration is owned by caller even when body omits employeeId")
    void ownDeclaration() {
        service.createTaxDeclaration(request(null));
        ArgumentCaptor<TaxDeclaration> cap = ArgumentCaptor.forClass(TaxDeclaration.class);
        verify(taxDeclarationRepository).save(cap.capture());
        assertThat(cap.getValue().getEmployeeId()).isEqualTo(callerId);
    }

    @Test
    @DisplayName("statutory viewer may create for another employee")
    void statutoryViewerAllowed() {
        securityContextMock.when(() -> SecurityContext.hasPermission(Permission.STATUTORY_VIEW)).thenReturn(true);
        service.createTaxDeclaration(request(otherId));
        ArgumentCaptor<TaxDeclaration> cap = ArgumentCaptor.forClass(TaxDeclaration.class);
        verify(taxDeclarationRepository).save(cap.capture());
        assertThat(cap.getValue().getEmployeeId()).isEqualTo(otherId);
    }

    @Test
    @DisplayName("update never re-assigns the declaration owner")
    void updateKeepsOwner() {
        TaxDeclaration existing = new TaxDeclaration();
        existing.setId(UUID.randomUUID());
        existing.setEmployeeId(callerId);
        existing.setStatus(TaxDeclaration.DeclarationStatus.DRAFT);
        when(taxDeclarationRepository.findByIdAndTenantId(existing.getId(), tenantId)).thenReturn(Optional.of(existing));
        service.updateTaxDeclaration(existing.getId(), request(otherId));
        assertThat(existing.getEmployeeId()).isEqualTo(callerId);
    }
}
