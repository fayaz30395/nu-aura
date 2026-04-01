package com.hrms.application.travel.service;

import com.hrms.api.travel.dto.CreateTravelRequest;
import com.hrms.api.travel.dto.TravelRequestDto;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.travel.TravelRequest;
import com.hrms.domain.travel.TravelRequest.TravelStatus;
import com.hrms.domain.travel.TravelRequest.TravelType;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.travel.repository.TravelRequestRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("TravelService Tests")
class TravelServiceTest {

    @Mock
    private TravelRequestRepository travelRequestRepository;

    @Mock
    private WorkflowService workflowService;

    @InjectMocks
    private TravelService travelService;

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;

    private UUID tenantId;
    private UUID employeeId;
    private UUID userId;
    private UUID requestId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        userId = UUID.randomUUID();
        requestId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
    }

    private TravelRequest buildTravelRequest(TravelStatus status) {
        TravelRequest tr = TravelRequest.builder()
                .employeeId(employeeId)
                .requestNumber("TR-001")
                .travelType(TravelType.BUSINESS)
                .purpose("Client meeting")
                .originCity("New York")
                .destinationCity("Chicago")
                .departureDate(LocalDate.now().plusDays(7))
                .returnDate(LocalDate.now().plusDays(10))
                .estimatedCost(new BigDecimal("2500"))
                .status(status)
                .build();
        tr.setId(requestId);
        tr.setTenantId(tenantId);
        return tr;
    }

    private CreateTravelRequest buildCreateRequest() {
        CreateTravelRequest req = new CreateTravelRequest();
        req.setTravelType(TravelType.BUSINESS);
        req.setPurpose("Client meeting");
        req.setOriginCity("New York");
        req.setDestinationCity("Chicago");
        req.setDepartureDate(LocalDate.now().plusDays(7));
        req.setReturnDate(LocalDate.now().plusDays(10));
        req.setEstimatedCost(new BigDecimal("2500"));
        return req;
    }

    // ==================== createRequest ====================

    @Test
    @DisplayName("createRequest - creates travel request in DRAFT status")
    void createRequest_success() {
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> {
            TravelRequest saved = inv.getArgument(0);
            saved.setId(requestId);
            return saved;
        });

        TravelRequestDto result = travelService.createRequest(buildCreateRequest());

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(TravelStatus.DRAFT);
        assertThat(result.getPurpose()).isEqualTo("Client meeting");
        verify(travelRequestRepository).save(any(TravelRequest.class));
    }

    // ==================== updateRequest ====================

    @Test
    @DisplayName("updateRequest - updates DRAFT request")
    void updateRequest_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.DRAFT);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateTravelRequest update = buildCreateRequest();
        update.setPurpose("Updated purpose");

        TravelRequestDto result = travelService.updateRequest(requestId, update);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("updateRequest - fails for SUBMITTED request")
    void updateRequest_wrongStatus() {
        TravelRequest existing = buildTravelRequest(TravelStatus.SUBMITTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> travelService.updateRequest(requestId, buildCreateRequest()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot update request");
    }

    @Test
    @DisplayName("updateRequest - allows update of REJECTED request")
    void updateRequest_allowsRejected() {
        TravelRequest existing = buildTravelRequest(TravelStatus.REJECTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TravelRequestDto result = travelService.updateRequest(requestId, buildCreateRequest());

        assertThat(result).isNotNull();
    }

    // ==================== submitRequest ====================

    @Test
    @DisplayName("submitRequest - submits DRAFT request")
    void submitRequest_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.DRAFT);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TravelRequestDto result = travelService.submitRequest(requestId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(TravelStatus.SUBMITTED);
    }

    @Test
    @DisplayName("submitRequest - fails for APPROVED request")
    void submitRequest_wrongStatus() {
        TravelRequest existing = buildTravelRequest(TravelStatus.APPROVED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> travelService.submitRequest(requestId))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== approveRequest ====================

    @Test
    @DisplayName("approveRequest - approves submitted request")
    void approveRequest_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.SUBMITTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TravelRequestDto result = travelService.approveRequest(requestId, "Looks good");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(TravelStatus.APPROVED);
    }

    @Test
    @DisplayName("approveRequest - fails for DRAFT request")
    void approveRequest_wrongStatus() {
        TravelRequest existing = buildTravelRequest(TravelStatus.DRAFT);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> travelService.approveRequest(requestId, "OK"))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== rejectRequest ====================

    @Test
    @DisplayName("rejectRequest - rejects submitted request")
    void rejectRequest_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.SUBMITTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TravelRequestDto result = travelService.rejectRequest(requestId, "Budget exceeded");

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(TravelStatus.REJECTED);
    }

    // ==================== cancelRequest ====================

    @Test
    @DisplayName("cancelRequest - cancels request")
    void cancelRequest_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.DRAFT);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));
        when(travelRequestRepository.save(any(TravelRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        TravelRequestDto result = travelService.cancelRequest(requestId);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(TravelStatus.CANCELLED);
    }

    @Test
    @DisplayName("cancelRequest - fails for COMPLETED request")
    void cancelRequest_completedThrows() {
        TravelRequest existing = buildTravelRequest(TravelStatus.COMPLETED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> travelService.cancelRequest(requestId))
                .isInstanceOf(IllegalStateException.class);
    }

    // ==================== deleteRequest ====================

    @Test
    @DisplayName("deleteRequest - deletes DRAFT request")
    void deleteRequest_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.DRAFT);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        travelService.deleteRequest(requestId);

        verify(travelRequestRepository).delete(existing);
    }

    @Test
    @DisplayName("deleteRequest - fails for non-DRAFT request")
    void deleteRequest_nonDraftThrows() {
        TravelRequest existing = buildTravelRequest(TravelStatus.SUBMITTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        assertThatThrownBy(() -> travelService.deleteRequest(requestId))
                .isInstanceOf(ValidationException.class);
    }

    // ==================== Query methods ====================

    @Test
    @DisplayName("getById - returns DTO for existing request")
    void getById_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.APPROVED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        TravelRequestDto result = travelService.getById(requestId);

        assertThat(result).isNotNull();
        assertThat(result.getRequestNumber()).isEqualTo("TR-001");
    }

    @Test
    @DisplayName("getMyRequests - returns paginated results")
    void getMyRequests_success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<TravelRequest> page = new PageImpl<>(List.of(buildTravelRequest(TravelStatus.DRAFT)), pageable, 1);
        when(travelRequestRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)).thenReturn(page);

        Page<TravelRequestDto> result = travelService.getMyRequests(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @DisplayName("getAllRequests - filters by status when provided")
    void getAllRequests_withStatus() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<TravelRequest> page = new PageImpl<>(List.of(buildTravelRequest(TravelStatus.APPROVED)), pageable, 1);
        when(travelRequestRepository.findByTenantIdAndStatus(tenantId, TravelStatus.APPROVED, pageable)).thenReturn(page);

        Page<TravelRequestDto> result = travelService.getAllRequests(TravelStatus.APPROVED, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    // ==================== ApprovalCallbackHandler ====================

    @Test
    @DisplayName("getEntityType - returns TRAVEL_REQUEST")
    void getEntityType_returnsTravelRequest() {
        assertThat(travelService.getEntityType()).isEqualTo(WorkflowDefinition.EntityType.TRAVEL_REQUEST);
    }

    @Test
    @DisplayName("onApproved - approves via workflow callback")
    void onApproved_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.SUBMITTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        travelService.onApproved(tenantId, requestId, userId);

        verify(travelRequestRepository).save(argThat(saved ->
                saved.getStatus() == TravelStatus.APPROVED
        ));
    }

    @Test
    @DisplayName("onApproved - skips already approved request")
    void onApproved_skipsNonSubmitted() {
        TravelRequest existing = buildTravelRequest(TravelStatus.APPROVED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        travelService.onApproved(tenantId, requestId, userId);

        verify(travelRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("onRejected - rejects via workflow callback")
    void onRejected_success() {
        TravelRequest existing = buildTravelRequest(TravelStatus.SUBMITTED);
        when(travelRequestRepository.findByIdAndTenantId(requestId, tenantId)).thenReturn(Optional.of(existing));

        travelService.onRejected(tenantId, requestId, userId, "Not approved");

        verify(travelRequestRepository).save(argThat(saved ->
                saved.getStatus() == TravelStatus.REJECTED
        ));
    }
}
