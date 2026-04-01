package com.hrms.application.shift.service;

import com.hrms.api.shift.dto.ShiftPatternRequest;
import com.hrms.api.shift.dto.ShiftPatternResponse;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.shift.ShiftPattern;
import com.hrms.infrastructure.shift.repository.ShiftPatternRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShiftPatternService {

    private final ShiftPatternRepository shiftPatternRepository;

    @Transactional
    public ShiftPatternResponse createPattern(ShiftPatternRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        log.info("Creating shift pattern: {} for tenant: {}", request.getName(), tenantId);

        if (shiftPatternRepository.existsByTenantIdAndName(tenantId, request.getName())) {
            throw new DuplicateResourceException("Shift pattern name already exists: " + request.getName());
        }

        ShiftPattern pattern = ShiftPattern.builder()
                .tenantId(tenantId)
                .name(request.getName())
                .description(request.getDescription())
                .rotationType(ShiftPattern.RotationType.valueOf(request.getRotationType()))
                .pattern(request.getPattern())
                .cycleDays(request.getCycleDays())
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .colorCode(request.getColorCode())
                .build();

        pattern = shiftPatternRepository.save(pattern);
        return mapToResponse(pattern);
    }

    @Transactional
    public ShiftPatternResponse updatePattern(UUID patternId, ShiftPatternRequest request) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ShiftPattern pattern = shiftPatternRepository.findByIdAndTenantId(patternId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift pattern not found"));

        pattern.setName(request.getName());
        pattern.setDescription(request.getDescription());
        pattern.setRotationType(ShiftPattern.RotationType.valueOf(request.getRotationType()));
        pattern.setPattern(request.getPattern());
        pattern.setCycleDays(request.getCycleDays());
        if (request.getIsActive() != null) {
            pattern.setIsActive(request.getIsActive());
        }
        pattern.setColorCode(request.getColorCode());

        pattern = shiftPatternRepository.save(pattern);
        return mapToResponse(pattern);
    }

    @Transactional(readOnly = true)
    public ShiftPatternResponse getPatternById(UUID patternId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ShiftPattern pattern = shiftPatternRepository.findByIdAndTenantId(patternId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift pattern not found"));
        return mapToResponse(pattern);
    }

    @Transactional(readOnly = true)
    public Page<ShiftPatternResponse> getAllPatterns(Pageable pageable) {
        UUID tenantId = TenantContext.getCurrentTenant();
        return shiftPatternRepository.findAllByTenantId(tenantId, pageable).map(this::mapToResponse);
    }

    @Transactional(readOnly = true)
    public List<ShiftPatternResponse> getActivePatterns() {
        UUID tenantId = TenantContext.getCurrentTenant();
        return shiftPatternRepository.findAllByTenantIdAndIsActive(tenantId, true)
                .stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public void deletePattern(UUID patternId) {
        UUID tenantId = TenantContext.getCurrentTenant();
        ShiftPattern pattern = shiftPatternRepository.findByIdAndTenantId(patternId, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Shift pattern not found"));
        shiftPatternRepository.delete(pattern);
        log.info("Deleted shift pattern: {}", pattern.getName());
    }

    private ShiftPatternResponse mapToResponse(ShiftPattern pattern) {
        return ShiftPatternResponse.builder()
                .id(pattern.getId())
                .name(pattern.getName())
                .description(pattern.getDescription())
                .rotationType(pattern.getRotationType().name())
                .pattern(pattern.getPattern())
                .cycleDays(pattern.getCycleDays())
                .isActive(pattern.getIsActive())
                .colorCode(pattern.getColorCode())
                .createdAt(pattern.getCreatedAt())
                .updatedAt(pattern.getUpdatedAt())
                .build();
    }
}
