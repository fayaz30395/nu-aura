package com.nulogic.application.recruitment.service;

import com.nulogic.api.recruitment.dto.CreateAgencyRequest;
import com.nulogic.api.recruitment.dto.UpdateAgencyRequest;
import com.nulogic.common.security.Permission;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.recruitment.RecruitmentAgency;
import com.nulogic.domain.recruitment.RecruitmentAgency.AgencyStatus;
import com.nulogic.infrastructure.recruitment.repository.AgencyRepository;
import com.nulogic.infrastructure.recruitment.repository.AgencySubmissionRepository;
import com.nulogic.infrastructure.recruitment.repository.CandidateRepository;
import com.nulogic.infrastructure.recruitment.repository.JobOpeningRepository;
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

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AgencyService status is not client-trusted")
class AgencyServiceTest {

    @Mock private AgencyRepository agencyRepository;
    @Mock private AgencySubmissionRepository submissionRepository;
    @Mock private CandidateRepository candidateRepository;
    @Mock private JobOpeningRepository jobOpeningRepository;
    @Mock private TenantTimeService tenantTimeService;
    @InjectMocks private AgencyService service;

    private MockedStatic<TenantContext> tenantMock;
    private MockedStatic<SecurityContext> securityMock;
    private final UUID tenantId = UUID.randomUUID();
    private final UUID agencyId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tenantMock = mockStatic(TenantContext.class);
        securityMock = mockStatic(SecurityContext.class);
        tenantMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        when(agencyRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void tearDown() {
        tenantMock.close();
        securityMock.close();
    }

    @Test
    @DisplayName("creator without AGENCY:MANAGE cannot create an ACTIVE agency")
    void createForcesPending() {
        CreateAgencyRequest request = new CreateAgencyRequest();
        request.setName("Acme Recruiters");
        request.setStatus(AgencyStatus.ACTIVE);

        service.createAgency(request);

        ArgumentCaptor<RecruitmentAgency> cap = ArgumentCaptor.forClass(RecruitmentAgency.class);
        verify(agencyRepository).save(cap.capture());
        assertThat(cap.getValue().getStatus()).isEqualTo(AgencyStatus.PENDING_APPROVAL);
    }

    @Test
    @DisplayName("AGENCY:MANAGE holder may create with explicit status")
    void managerKeepsStatus() {
        securityMock.when(() -> SecurityContext.hasPermission(Permission.AGENCY_MANAGE)).thenReturn(true);
        CreateAgencyRequest request = new CreateAgencyRequest();
        request.setName("Acme Recruiters");
        request.setStatus(AgencyStatus.ACTIVE);

        service.createAgency(request);

        ArgumentCaptor<RecruitmentAgency> cap = ArgumentCaptor.forClass(RecruitmentAgency.class);
        verify(agencyRepository).save(cap.capture());
        assertThat(cap.getValue().getStatus()).isEqualTo(AgencyStatus.ACTIVE);
    }

    @Test
    @DisplayName("update by non-manager cannot approve agency and nothing is saved")
    void updateRejectsStatusChange() {
        RecruitmentAgency agency = RecruitmentAgency.builder().tenantId(tenantId).name("A")
                .status(AgencyStatus.PENDING_APPROVAL).build();
        when(agencyRepository.findByIdAndTenantId(agencyId, tenantId)).thenReturn(Optional.of(agency));
        UpdateAgencyRequest request = new UpdateAgencyRequest();
        request.setStatus(AgencyStatus.ACTIVE);

        assertThatThrownBy(() -> service.updateAgency(agencyId, request)).isInstanceOf(AccessDeniedException.class);
        verify(agencyRepository, never()).save(any());
        assertThat(agency.getStatus()).isEqualTo(AgencyStatus.PENDING_APPROVAL);
    }

    @Test
    @DisplayName("update without status change still works for non-manager")
    void updateOtherFieldsWorks() {
        RecruitmentAgency agency = RecruitmentAgency.builder().tenantId(tenantId).name("A")
                .status(AgencyStatus.ACTIVE).build();
        when(agencyRepository.findByIdAndTenantId(agencyId, tenantId)).thenReturn(Optional.of(agency));
        UpdateAgencyRequest request = new UpdateAgencyRequest();
        request.setName("B");
        request.setStatus(AgencyStatus.ACTIVE);

        service.updateAgency(agencyId, request);

        assertThat(agency.getName()).isEqualTo("B");
    }
}
