package com.nulogic.application.travel.service;

import com.nulogic.api.travel.dto.CreateTravelRequest;
import com.nulogic.api.travel.dto.TravelRequestDto;
import com.nulogic.api.workflow.dto.WorkflowExecutionRequest;
import com.nulogic.application.workflow.callback.ApprovalCallbackHandler;
import com.nulogic.application.workflow.service.WorkflowService;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.travel.TravelRequest;
import com.nulogic.domain.travel.TravelRequest.TravelStatus;
import com.nulogic.domain.workflow.WorkflowDefinition;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.travel.repository.TravelRequestRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@Transactional
public class TravelService implements ApprovalCallbackHandler {

    private final TravelRequestRepository travelRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final WorkflowService workflowService;
    private final TenantTimeService tenantTimeService;

    public TravelService(TravelRequestRepository travelRequestRepository,
                         EmployeeRepository employeeRepository,
                         @org.springframework.context.annotation.Lazy WorkflowService workflowService,
                         TenantTimeService tenantTimeService) {
        this.travelRequestRepository = travelRequestRepository;
        this.employeeRepository = employeeRepository;
        this.workflowService = workflowService;
        this.tenantTimeService = tenantTimeService;
    }

    @Transactional
    public TravelRequestDto createRequest(CreateTravelRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        if (employeeId == null) {
            throw new IllegalStateException("Employee profile not found for current user — cannot submit travel request");
        }

        TravelRequest travelRequest = TravelRequest.builder()
                .employeeId(employeeId)
                .requestNumber(generateRequestNumber())
                .travelType(request.getTravelType())
                .purpose(request.getPurpose())
                .projectId(request.getProjectId())
                .clientName(request.getClientName())
                .originCity(request.getOriginCity())
                .destinationCity(request.getDestinationCity())
                .departureDate(request.getDepartureDate())
                .returnDate(request.getReturnDate())
                .departureTime(request.getDepartureTime())
                .returnTime(request.getReturnTime())
                .accommodationRequired(request.getAccommodationRequired() != null ? request.getAccommodationRequired() : false)
                .hotelPreference(request.getHotelPreference())
                .checkInDate(request.getCheckInDate())
                .checkOutDate(request.getCheckOutDate())
                .transportMode(request.getTransportMode())
                .transportClass(request.getTransportClass())
                .cabRequired(request.getCabRequired() != null ? request.getCabRequired() : false)
                .estimatedCost(request.getEstimatedCost())
                .advanceRequired(request.getAdvanceRequired())
                .specialInstructions(request.getSpecialInstructions())
                .isInternational(request.getIsInternational() != null ? request.getIsInternational() : false)
                .visaRequired(request.getVisaRequired() != null ? request.getVisaRequired() : false)
                .status(TravelStatus.DRAFT)
                .build();

        travelRequest.setTenantId(tenantId);
        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request created: {}", saved.getRequestNumber());
        return TravelRequestDto.fromEntity(saved, getEmployeeFullName(saved.getEmployeeId(), tenantId));
    }

    @Transactional
    public TravelRequestDto updateRequest(UUID requestId, CreateTravelRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.DRAFT && travelRequest.getStatus() != TravelStatus.REJECTED) {
            throw new IllegalStateException("Cannot update request in status: " + travelRequest.getStatus());
        }

        travelRequest.setTravelType(request.getTravelType());
        travelRequest.setPurpose(request.getPurpose());
        travelRequest.setProjectId(request.getProjectId());
        travelRequest.setClientName(request.getClientName());
        travelRequest.setOriginCity(request.getOriginCity());
        travelRequest.setDestinationCity(request.getDestinationCity());
        travelRequest.setDepartureDate(request.getDepartureDate());
        travelRequest.setReturnDate(request.getReturnDate());
        travelRequest.setDepartureTime(request.getDepartureTime());
        travelRequest.setReturnTime(request.getReturnTime());
        travelRequest.setAccommodationRequired(request.getAccommodationRequired());
        travelRequest.setHotelPreference(request.getHotelPreference());
        travelRequest.setCheckInDate(request.getCheckInDate());
        travelRequest.setCheckOutDate(request.getCheckOutDate());
        travelRequest.setTransportMode(request.getTransportMode());
        travelRequest.setTransportClass(request.getTransportClass());
        travelRequest.setCabRequired(request.getCabRequired());
        travelRequest.setEstimatedCost(request.getEstimatedCost());
        travelRequest.setAdvanceRequired(request.getAdvanceRequired());
        travelRequest.setSpecialInstructions(request.getSpecialInstructions());
        travelRequest.setIsInternational(request.getIsInternational());
        travelRequest.setVisaRequired(request.getVisaRequired());

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request updated: {}", saved.getRequestNumber());
        return TravelRequestDto.fromEntity(saved, getEmployeeFullName(saved.getEmployeeId(), tenantId));
    }

    @Transactional
    public TravelRequestDto submitRequest(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.DRAFT && travelRequest.getStatus() != TravelStatus.REJECTED) {
            throw new IllegalStateException("Cannot submit request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.SUBMITTED);
        travelRequest.setSubmittedDate(tenantTimeService.today(tenantId));

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request submitted: {}", saved.getRequestNumber());

        // Start approval workflow
        startTravelApprovalWorkflow(saved, tenantId);

        return TravelRequestDto.fromEntity(saved, getEmployeeFullName(saved.getEmployeeId(), tenantId));
    }

    @Transactional
    public TravelRequestDto approveRequest(UUID requestId, String comments) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.SUBMITTED && travelRequest.getStatus() != TravelStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Cannot approve request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.APPROVED);
        travelRequest.setApprovedBy(approverId);
        travelRequest.setApprovedDate(tenantTimeService.today(tenantId));
        travelRequest.setAdvanceApproved(travelRequest.getAdvanceRequired());

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request approved: {} by {}", saved.getRequestNumber(), approverId);
        return TravelRequestDto.fromEntity(saved, getEmployeeFullName(saved.getEmployeeId(), tenantId));
    }

    @Transactional
    public TravelRequestDto rejectRequest(UUID requestId, String reason) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.SUBMITTED && travelRequest.getStatus() != TravelStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Cannot reject request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.REJECTED);
        travelRequest.setApprovedBy(approverId);
        travelRequest.setApprovedDate(tenantTimeService.today(tenantId));
        travelRequest.setRejectionReason(reason);

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request rejected: {} by {}", saved.getRequestNumber(), approverId);
        return TravelRequestDto.fromEntity(saved, getEmployeeFullName(saved.getEmployeeId(), tenantId));
    }

    @Transactional
    public TravelRequestDto cancelRequest(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() == TravelStatus.COMPLETED || travelRequest.getStatus() == TravelStatus.CANCELLED) {
            throw new IllegalStateException("Cannot cancel request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.CANCELLED);

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request cancelled: {}", saved.getRequestNumber());
        return TravelRequestDto.fromEntity(saved, getEmployeeFullName(saved.getEmployeeId(), tenantId));
    }

    @Transactional
    public void deleteRequest(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Travel request not found: " + requestId));

        if (travelRequest.getStatus() != TravelStatus.DRAFT) {
            throw new ValidationException("Only DRAFT travel requests can be deleted");
        }

        travelRequestRepository.delete(travelRequest);
        log.info("Deleted travel request: {}", requestId);
    }

    @Transactional(readOnly = true)
    public TravelRequestDto getById(UUID requestId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));
        return TravelRequestDto.fromEntity(travelRequest, getEmployeeFullName(travelRequest.getEmployeeId(), tenantId));
    }

    @Transactional(readOnly = true)
    public Page<TravelRequestDto> getMyRequests(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentEmployeeId();
        return travelRequestRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(req -> TravelRequestDto.fromEntity(req, getEmployeeFullName(req.getEmployeeId(), tenantId)));
    }

    @Transactional(readOnly = true)
    public Page<TravelRequestDto> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return travelRequestRepository.findByTenantIdAndStatusIn(
                tenantId,
                List.of(TravelStatus.SUBMITTED, TravelStatus.PENDING_APPROVAL),
                pageable
        ).map(req -> TravelRequestDto.fromEntity(req, getEmployeeFullName(req.getEmployeeId(), tenantId)));
    }

    @Transactional(readOnly = true)
    public Page<TravelRequestDto> getAllRequests(TravelStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        if (status != null) {
            return travelRequestRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                    .map(req -> TravelRequestDto.fromEntity(req, getEmployeeFullName(req.getEmployeeId(), tenantId)));
        }
        return travelRequestRepository.findByTenantId(tenantId, pageable)
                .map(req -> TravelRequestDto.fromEntity(req, getEmployeeFullName(req.getEmployeeId(), tenantId)));
    }

    @Transactional(readOnly = true)
    public List<TravelRequestDto> getUpcomingTravel() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        LocalDate today = tenantTimeService.today(tenantId);
        LocalDate nextMonth = today.plusMonths(1);
        return travelRequestRepository.findByTenantIdAndDepartureDateBetweenAndStatus(
                        tenantId, today, nextMonth, TravelStatus.APPROVED
                ).stream().map(req -> TravelRequestDto.fromEntity(req, getEmployeeFullName(req.getEmployeeId(), tenantId)))
                .collect(Collectors.toList());
    }

    // ======================== ApprovalCallbackHandler ========================

    @Override
    public WorkflowDefinition.EntityType getEntityType() {
        return WorkflowDefinition.EntityType.TRAVEL_REQUEST;
    }

    @Override
    @Transactional
    public void onApproved(UUID tenantId, UUID entityId, UUID approvedBy) {
        log.info("Travel request {} approved via workflow by {}", entityId, approvedBy);

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (travelRequest == null) {
            log.warn("Travel request {} not found for approval callback", entityId);
            return;
        }

        if (travelRequest.getStatus() != TravelStatus.SUBMITTED && travelRequest.getStatus() != TravelStatus.PENDING_APPROVAL) {
            log.warn("Travel request {} already in status {}, skipping approval", entityId, travelRequest.getStatus());
            return;
        }

        travelRequest.setStatus(TravelStatus.APPROVED);
        travelRequest.setApprovedBy(approvedBy);
        travelRequest.setApprovedDate(tenantTimeService.today(tenantId));
        travelRequest.setAdvanceApproved(travelRequest.getAdvanceRequired());
        travelRequestRepository.save(travelRequest);
    }

    @Override
    @Transactional
    public void onRejected(UUID tenantId, UUID entityId, UUID rejectedBy, String reason) {
        log.info("Travel request {} rejected via workflow by {}", entityId, rejectedBy);

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(entityId, tenantId).orElse(null);
        if (travelRequest == null) {
            log.warn("Travel request {} not found for rejection callback", entityId);
            return;
        }

        if (travelRequest.getStatus() != TravelStatus.SUBMITTED && travelRequest.getStatus() != TravelStatus.PENDING_APPROVAL) {
            log.warn("Travel request {} already in status {}, skipping rejection", entityId, travelRequest.getStatus());
            return;
        }

        travelRequest.setStatus(TravelStatus.REJECTED);
        travelRequest.setApprovedBy(rejectedBy);
        travelRequest.setApprovedDate(tenantTimeService.today(tenantId));
        travelRequest.setRejectionReason(reason);
        travelRequestRepository.save(travelRequest);
    }

    private String getEmployeeFullName(UUID employeeId, UUID tenantId) {
        if (employeeId == null) return null;
        try {
            return employeeRepository.findByIdAndTenantId(employeeId, tenantId)
                    .map(emp -> emp.getFirstName() + " " + emp.getLastName())
                    .orElse(null);
        } catch (Exception e) {
            log.debug("Could not fetch employee name for ID {}: {}", employeeId, e.getMessage());
            return null;
        }
    }

    private void startTravelApprovalWorkflow(TravelRequest travelRequest, UUID tenantId) {
        try {
            WorkflowExecutionRequest workflowRequest = new WorkflowExecutionRequest();
            workflowRequest.setEntityType(WorkflowDefinition.EntityType.TRAVEL_REQUEST);
            workflowRequest.setEntityId(travelRequest.getId());
            workflowRequest.setTitle("Travel Approval: " + travelRequest.getRequestNumber()
                    + " (" + travelRequest.getOriginCity() + " -> " + travelRequest.getDestinationCity() + ")");
            workflowRequest.setAmount(travelRequest.getEstimatedCost());

            workflowService.startWorkflow(workflowRequest);
            log.info("Workflow started for travel request: {}", travelRequest.getRequestNumber());
        } catch (Exception e) { // Intentional broad catch — service error boundary
            log.warn("Could not start approval workflow for travel request {}: {}",
                    travelRequest.getRequestNumber(), e.getMessage());
        }
    }

    private String generateRequestNumber() {
        return "TR-" + System.currentTimeMillis();
    }
}
