package com.hrms.application.travel.service;

import com.hrms.api.travel.dto.CreateTravelRequest;
import com.hrms.api.travel.dto.TravelRequestDto;
import com.hrms.api.workflow.dto.WorkflowExecutionRequest;
import com.hrms.application.workflow.callback.ApprovalCallbackHandler;
import com.hrms.application.workflow.service.WorkflowService;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.travel.TravelRequest;
import com.hrms.domain.travel.TravelRequest.TravelStatus;
import com.hrms.domain.workflow.WorkflowDefinition;
import com.hrms.infrastructure.travel.repository.TravelRequestRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final WorkflowService workflowService;

    @Autowired
    public TravelService(TravelRequestRepository travelRequestRepository,
                         @org.springframework.context.annotation.Lazy WorkflowService workflowService) {
        this.travelRequestRepository = travelRequestRepository;
        this.workflowService = workflowService;
    }

    @Transactional
    public TravelRequestDto createRequest(CreateTravelRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();

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
        return TravelRequestDto.fromEntity(saved);
    }

    @Transactional
    public TravelRequestDto updateRequest(UUID requestId, CreateTravelRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();

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
        return TravelRequestDto.fromEntity(saved);
    }

    @Transactional
    public TravelRequestDto submitRequest(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.DRAFT && travelRequest.getStatus() != TravelStatus.REJECTED) {
            throw new IllegalStateException("Cannot submit request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.SUBMITTED);
        travelRequest.setSubmittedDate(LocalDate.now());

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request submitted: {}", saved.getRequestNumber());

        // Start approval workflow
        startTravelApprovalWorkflow(saved, tenantId);

        return TravelRequestDto.fromEntity(saved);
    }

    @Transactional
    public TravelRequestDto approveRequest(UUID requestId, String comments) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.SUBMITTED && travelRequest.getStatus() != TravelStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Cannot approve request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.APPROVED);
        travelRequest.setApprovedBy(approverId);
        travelRequest.setApprovedDate(LocalDate.now());
        travelRequest.setAdvanceApproved(travelRequest.getAdvanceRequired());

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request approved: {} by {}", saved.getRequestNumber(), approverId);
        return TravelRequestDto.fromEntity(saved);
    }

    @Transactional
    public TravelRequestDto rejectRequest(UUID requestId, String reason) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID approverId = SecurityContext.getCurrentUserId();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() != TravelStatus.SUBMITTED && travelRequest.getStatus() != TravelStatus.PENDING_APPROVAL) {
            throw new IllegalStateException("Cannot reject request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.REJECTED);
        travelRequest.setApprovedBy(approverId);
        travelRequest.setApprovedDate(LocalDate.now());
        travelRequest.setRejectionReason(reason);

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request rejected: {} by {}", saved.getRequestNumber(), approverId);
        return TravelRequestDto.fromEntity(saved);
    }

    @Transactional
    public TravelRequestDto cancelRequest(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();

        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));

        if (travelRequest.getStatus() == TravelStatus.COMPLETED || travelRequest.getStatus() == TravelStatus.CANCELLED) {
            throw new IllegalStateException("Cannot cancel request in status: " + travelRequest.getStatus());
        }

        travelRequest.setStatus(TravelStatus.CANCELLED);

        TravelRequest saved = travelRequestRepository.save(travelRequest);
        log.info("Travel request cancelled: {}", saved.getRequestNumber());
        return TravelRequestDto.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public TravelRequestDto getById(UUID requestId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        TravelRequest travelRequest = travelRequestRepository.findByIdAndTenantId(requestId, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Travel request not found"));
        return TravelRequestDto.fromEntity(travelRequest);
    }

    @Transactional(readOnly = true)
    public Page<TravelRequestDto> getMyRequests(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        UUID employeeId = SecurityContext.getCurrentUserId();
        return travelRequestRepository.findByEmployeeIdAndTenantId(employeeId, tenantId, pageable)
                .map(TravelRequestDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<TravelRequestDto> getPendingApprovals(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return travelRequestRepository.findByTenantIdAndStatusIn(
                tenantId,
                List.of(TravelStatus.SUBMITTED, TravelStatus.PENDING_APPROVAL),
                pageable
        ).map(TravelRequestDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public Page<TravelRequestDto> getAllRequests(TravelStatus status, Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        if (status != null) {
            return travelRequestRepository.findByTenantIdAndStatus(tenantId, status, pageable)
                    .map(TravelRequestDto::fromEntity);
        }
        return travelRequestRepository.findByTenantId(tenantId, pageable)
                .map(TravelRequestDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<TravelRequestDto> getUpcomingTravel() {
        UUID tenantId = TenantContext.getCurrentTenant();
        LocalDate today = LocalDate.now();
        LocalDate nextMonth = today.plusMonths(1);
        return travelRequestRepository.findByTenantIdAndDepartureDateBetweenAndStatus(
                tenantId, today, nextMonth, TravelStatus.APPROVED
        ).stream().map(TravelRequestDto::fromEntity).collect(Collectors.toList());
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
        travelRequest.setApprovedDate(LocalDate.now());
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
        travelRequest.setApprovedDate(LocalDate.now());
        travelRequest.setRejectionReason(reason);
        travelRequestRepository.save(travelRequest);
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
        } catch (Exception e) {
            log.warn("Could not start approval workflow for travel request {}: {}",
                    travelRequest.getRequestNumber(), e.getMessage());
        }
    }

    private String generateRequestNumber() {
        return "TR-" + System.currentTimeMillis();
    }
}
