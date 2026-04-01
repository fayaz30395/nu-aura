package com.hrms.application.expense.service;

import com.hrms.api.expense.dto.MileagePolicyRequest;
import com.hrms.api.expense.dto.MileagePolicyResponse;
import com.hrms.common.exception.ValidationException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.expense.MileagePolicy;
import com.hrms.infrastructure.expense.repository.MileagePolicyRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MileagePolicyService {

    private final MileagePolicyRepository mileagePolicyRepository;

    @Transactional
    public MileagePolicyResponse createPolicy(MileagePolicyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        if (mileagePolicyRepository.existsByTenantIdAndName(tenantId, request.name())) {
            throw new ValidationException("A mileage policy with this name already exists");
        }

        MileagePolicy policy = MileagePolicy.builder()
                .name(request.name())
                .ratePerKm(request.ratePerKm())
                .maxDailyKm(request.maxDailyKm())
                .maxMonthlyKm(request.maxMonthlyKm())
                .vehicleRates(request.vehicleRates())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .isActive(true)
                .build();
        policy.setTenantId(tenantId);

        MileagePolicy saved = mileagePolicyRepository.save(policy);
        log.info("Created mileage policy: {} for tenant: {}", saved.getName(), tenantId);
        return MileagePolicyResponse.fromEntity(saved);
    }

    @Transactional
    public MileagePolicyResponse updatePolicy(UUID policyId, MileagePolicyRequest request) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        MileagePolicy policy = mileagePolicyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage policy not found: " + policyId));

        if (mileagePolicyRepository.existsByTenantIdAndNameAndIdNot(tenantId, request.name(), policyId)) {
            throw new ValidationException("A mileage policy with this name already exists");
        }

        policy.setName(request.name());
        policy.setRatePerKm(request.ratePerKm());
        policy.setMaxDailyKm(request.maxDailyKm());
        policy.setMaxMonthlyKm(request.maxMonthlyKm());
        policy.setVehicleRates(request.vehicleRates());
        policy.setEffectiveFrom(request.effectiveFrom());
        policy.setEffectiveTo(request.effectiveTo());

        MileagePolicy saved = mileagePolicyRepository.save(policy);
        log.info("Updated mileage policy: {}", saved.getName());
        return MileagePolicyResponse.fromEntity(saved);
    }

    @Transactional
    public void togglePolicy(UUID policyId, boolean active) {
        UUID tenantId = TenantContext.requireCurrentTenant();

        MileagePolicy policy = mileagePolicyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage policy not found: " + policyId));

        policy.setActive(active);
        mileagePolicyRepository.save(policy);
        log.info("Toggled mileage policy {} to active={}", policy.getName(), active);
    }

    @Transactional(readOnly = true)
    public List<MileagePolicyResponse> getActivePolicies() {
        UUID tenantId = TenantContext.requireCurrentTenant();
        return mileagePolicyRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(MileagePolicyResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MileagePolicyResponse getPolicy(UUID policyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        MileagePolicy policy = mileagePolicyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage policy not found: " + policyId));
        return MileagePolicyResponse.fromEntity(policy);
    }

    @Transactional
    public void deletePolicy(UUID policyId) {
        UUID tenantId = TenantContext.requireCurrentTenant();
        MileagePolicy policy = mileagePolicyRepository.findByIdAndTenantId(policyId, tenantId)
                .orElseThrow(() -> new EntityNotFoundException("Mileage policy not found: " + policyId));
        mileagePolicyRepository.delete(policy);
        log.info("Deleted mileage policy: {}", policy.getName());
    }

    /**
     * Returns the currently active and effective mileage policy for a tenant.
     * Falls back to the first active policy if none match effective date range.
     */
    @Transactional(readOnly = true)
    public MileagePolicy getActivePolicy(UUID tenantId) {
        List<MileagePolicy> activePolicies = mileagePolicyRepository.findByTenantIdAndIsActiveTrue(tenantId);
        if (activePolicies.isEmpty()) {
            return null;
        }

        LocalDate today = LocalDate.now();
        return activePolicies.stream()
                .filter(p -> !today.isBefore(p.getEffectiveFrom()))
                .filter(p -> p.getEffectiveTo() == null || !today.isAfter(p.getEffectiveTo()))
                .findFirst()
                .orElse(activePolicies.get(0));
    }
}
