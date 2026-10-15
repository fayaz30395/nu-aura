package com.nulogic.application.esignature.service;

import com.nulogic.api.esignature.dto.SignDocumentRequest;
import com.nulogic.api.esignature.dto.SignatureApprovalResponse;
import com.nulogic.api.esignature.dto.SignatureRequestResponse;
import com.nulogic.application.integration.service.DocuSignManagementService;
import com.nulogic.application.integration.service.IntegrationConnectorConfigService;
import com.nulogic.common.security.DataScopeService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.esignature.SignatureApproval;
import com.nulogic.domain.esignature.SignatureRequest;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.esignature.repository.SignatureApprovalRepository;
import com.nulogic.infrastructure.esignature.repository.SignatureRequestRepository;
import com.nulogic.infrastructure.integration.docusign.DocuSignApiClient;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("ESignatureService Tests")
class ESignatureServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;

    @Mock
    private SignatureRequestRepository signatureRequestRepository;
    @Mock
    private SignatureApprovalRepository signatureApprovalRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private DataScopeService dataScopeService;
    @Mock
    private ApplicationEventPublisher eventPublisher;
    @Mock
    private TenantTimeService tenantTimeService;
    @Mock
    private IntegrationConnectorConfigService integrationConnectorConfigService;
    @Mock
    private DocuSignManagementService docuSignManagementService;
    @Mock
    private DocuSignApiClient docuSignApiClient;
    @InjectMocks
    private ESignatureService eSignatureService;

    private UUID tenantId;
    private UUID requestId;
    private UUID approvalId;
    private SignatureRequest signatureRequest;
    private SignatureApproval approval;
    private LocalDateTime now;
    private UUID me;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @org.junit.jupiter.api.AfterEach
    void clearSecurity() {
        SecurityContext.clear();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        requestId = UUID.randomUUID();
        approvalId = UUID.randomUUID();
        me = UUID.randomUUID();
        SecurityContext.setCurrentUser(UUID.randomUUID(), me, Set.of(), Map.of());
        now = LocalDateTime.of(2025, 6, 1, 9, 0);

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);

        lenient().when(tenantTimeService.now(any(UUID.class))).thenReturn(now);
        lenient().when(employeeRepository.findById(any(UUID.class))).thenReturn(Optional.empty());
        lenient().when(signatureApprovalRepository.findByTenantIdAndSignatureRequestIdOrderBySigningOrderAsc(any(), any()))
                .thenReturn(List.of());
        lenient().when(signatureApprovalRepository.findByTenantIdAndSignatureRequestId(any(), any()))
                .thenReturn(List.of());

        signatureRequest = new SignatureRequest();
        signatureRequest.setId(requestId);
        signatureRequest.setTenantId(tenantId);
        signatureRequest.setTitle("Offer Letter");
        signatureRequest.setDocumentType(SignatureRequest.DocumentType.OFFER_LETTER);
        signatureRequest.setCreatedBy(me);
        signatureRequest.setStatus(SignatureRequest.SignatureStatus.DRAFT);
        signatureRequest.setSignatureOrder(false);
        signatureRequest.setRequiredSignatures(1);
        signatureRequest.setReceivedSignatures(0);

        approval = new SignatureApproval();
        approval.setId(approvalId);
        approval.setTenantId(tenantId);
        approval.setSignatureRequestId(requestId);
        approval.setSignerRole(SignatureApproval.SignerRole.EXTERNAL);
        approval.setSignerId(me);
        approval.setSignerEmail("candidate@example.com");
        approval.setStatus(SignatureApproval.ApprovalStatus.PENDING);
        approval.setIsRequired(true);
    }

    @Nested
    @DisplayName("Cancel Signature Request")
    class CancelTests {

        @Test
        @DisplayName("Should transition a DRAFT request to CANCELLED with reason")
        void shouldCancelDraftRequest() {
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.of(signatureRequest));
            when(signatureRequestRepository.save(any(SignatureRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            UUID cancelledBy = UUID.randomUUID();
            SignatureRequestResponse result = eSignatureService.cancelSignatureRequest(requestId, cancelledBy, "role closed");

            assertThat(result.getStatus()).isEqualTo(SignatureRequest.SignatureStatus.CANCELLED);
            assertThat(result.getCancelledBy()).isEqualTo(cancelledBy);
            assertThat(result.getCancelledAt()).isEqualTo(now);
            assertThat(result.getCancellationReason()).isEqualTo("role closed");
        }

        @Test
        @DisplayName("Should reject cancelling a COMPLETED request")
        void shouldRejectCancellingCompletedRequest() {
            signatureRequest.setStatus(SignatureRequest.SignatureStatus.COMPLETED);
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.of(signatureRequest));

            assertThatThrownBy(() -> eSignatureService.cancelSignatureRequest(requestId, UUID.randomUUID(), "too late"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Cannot cancel");
        }
    }

    @Nested
    @DisplayName("Send for Signature")
    class SendTests {

        @Test
        @DisplayName("Should reject sending when no signers are attached")
        void shouldRejectSendWithNoSigners() {
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.of(signatureRequest));
            when(signatureApprovalRepository.findByTenantIdAndSignatureRequestId(tenantId, requestId))
                    .thenReturn(List.of());

            assertThatThrownBy(() -> eSignatureService.sendForSignature(requestId))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("At least one signer is required");
        }
    }

    @Nested
    @DisplayName("Sign Document")
    class SignDocumentTests {

        @Test
        @DisplayName("Should mark approval SIGNED and complete the request when all signers have signed")
        void shouldSignAndComplete() {
            when(signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId))
                    .thenReturn(Optional.of(approval));
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.of(signatureRequest));
            when(signatureApprovalRepository.save(any(SignatureApproval.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(signatureRequestRepository.save(any(SignatureRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(signatureApprovalRepository.countByTenantIdAndSignatureRequestIdAndStatus(
                    tenantId, requestId, SignatureApproval.ApprovalStatus.SIGNED))
                    .thenReturn(1L);

            SignDocumentRequest signRequest = SignDocumentRequest.builder()
                    .signatureMethod(SignatureApproval.SignatureMethod.TYPED)
                    .signatureData("base64-signature")
                    .signatureIp("127.0.0.1")
                    .build();

            SignatureApprovalResponse result = eSignatureService.signDocument(approvalId, signRequest);

            assertThat(result.getStatus()).isEqualTo(SignatureApproval.ApprovalStatus.SIGNED);
            assertThat(result.getSignedAt()).isEqualTo(now);
            assertThat(signatureRequest.getStatus()).isEqualTo(SignatureRequest.SignatureStatus.COMPLETED);
            assertThat(signatureRequest.getReceivedSignatures()).isEqualTo(1);
            verify(eventPublisher).publishEvent(any());
        }

        @Test
        @DisplayName("Should reject re-signing an already signed document")
        void shouldRejectAlreadySigned() {
            approval.setStatus(SignatureApproval.ApprovalStatus.SIGNED);
            when(signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId))
                    .thenReturn(Optional.of(approval));

            SignDocumentRequest signRequest = SignDocumentRequest.builder()
                    .signatureMethod(SignatureApproval.SignatureMethod.TYPED)
                    .signatureData("base64")
                    .build();

            assertThatThrownBy(() -> eSignatureService.signDocument(approvalId, signRequest))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("already signed");
        }
    }

    @Nested
    @DisplayName("Decline Document")
    class DeclineTests {

        @Test
        @DisplayName("Should mark approval DECLINED, decline the request, and publish an event")
        void shouldDecline() {
            when(signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId))
                    .thenReturn(Optional.of(approval));
            when(signatureApprovalRepository.save(any(SignatureApproval.class)))
                    .thenAnswer(inv -> inv.getArgument(0));
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId))
                    .thenReturn(Optional.of(signatureRequest));
            when(signatureRequestRepository.save(any(SignatureRequest.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            SignatureApprovalResponse result = eSignatureService.declineDocument(approvalId, "salary too low");

            assertThat(result.getStatus()).isEqualTo(SignatureApproval.ApprovalStatus.DECLINED);
            assertThat(result.getDeclineReason()).isEqualTo("salary too low");
            assertThat(signatureRequest.getStatus()).isEqualTo(SignatureRequest.SignatureStatus.DECLINED);
            verify(eventPublisher).publishEvent(any());
        }
    }

    @Nested
    @DisplayName("Record-level access")
    class AccessControlTests {

        private void actAs(UUID employeeId, String... roles) {
            SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of(roles), Map.of());
        }

        @Test
        @DisplayName("a non-signer with ESIGNATURE:SIGN cannot sign or decline someone else's approval; nothing saved")
        void strangerCannotSignOrDecline() {
            actAs(UUID.randomUUID());
            when(signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId)).thenReturn(Optional.of(approval));

            assertThatThrownBy(() -> eSignatureService.signDocument(approvalId, SignDocumentRequest.builder()
                    .signatureMethod(SignatureApproval.SignatureMethod.TYPED).signatureData("x").build()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> eSignatureService.declineDocument(approvalId, "no"))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            verify(signatureApprovalRepository, never()).save(any());
            assertThat(approval.getStatus()).isEqualTo(SignatureApproval.ApprovalStatus.PENDING);
        }

        @Test
        @DisplayName("an external (no employee) approval cannot be signed through the internal endpoint")
        void externalApprovalNotSignableInternally() {
            approval.setSignerId(null);
            when(signatureApprovalRepository.findByIdAndTenantId(approvalId, tenantId)).thenReturn(Optional.of(approval));

            assertThatThrownBy(() -> eSignatureService.signDocument(approvalId, SignDocumentRequest.builder()
                    .signatureMethod(SignatureApproval.SignatureMethod.TYPED).signatureData("x").build()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        }

        @Test
        @DisplayName("request read/send/addSigner are limited to creator, signer or manager")
        void requestScoped() {
            actAs(UUID.randomUUID());
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(signatureRequest));

            assertThatThrownBy(() -> eSignatureService.getSignatureRequestById(requestId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> eSignatureService.getApprovalsByRequest(requestId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> eSignatureService.sendForSignature(requestId))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> eSignatureService.addSigner(requestId, new com.nulogic.api.esignature.dto.SignatureApprovalRequest()))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> eSignatureService.getSignatureRequestsByCreator(me))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
            assertThatThrownBy(() -> eSignatureService.getPendingApprovalsBySigner(me))
                    .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);

            actAs(me); // creator and named signer
            assertThat(eSignatureService.getSignatureRequestById(requestId)).isNotNull();
            assertThat(eSignatureService.getPendingApprovalsBySigner(me)).isEmpty();
        }

        @Test
        @DisplayName("a named signer who did not create the request may read it")
        void signerMayRead() {
            UUID signer = UUID.randomUUID();
            approval.setSignerId(signer);
            when(signatureRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(signatureRequest));
            when(signatureApprovalRepository.findByTenantIdAndSignatureRequestId(tenantId, requestId)).thenReturn(List.of(approval));
            actAs(signer);

            assertThat(eSignatureService.getSignatureRequestById(requestId)).isNotNull();
        }
    }
}
