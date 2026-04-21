package com.hrms.application.performance.service;

import com.hrms.domain.performance.*;
import com.hrms.domain.performance.Objective.ObjectiveLevel;
import com.hrms.domain.performance.Objective.ObjectiveStatus;
import com.hrms.infrastructure.performance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OkrService {

    private final ObjectiveRepository objectiveRepository;
    private final KeyResultRepository keyResultRepository;
    private final OkrCheckInRepository checkInRepository;

    // ================== Objectives ==================

    @Transactional
    public Objective createObjective(Objective objective) {
        if (objective.getId() == null) {
            objective.setId(UUID.randomUUID());
        }
        if (objective.getStatus() == null) {
            objective.setStatus(ObjectiveStatus.DRAFT);
        }
        if (objective.getCreatedAt() == null) {
            objective.setCreatedAt(LocalDateTime.now());
        }

        log.info("Creating objective: {} for owner: {}", objective.getTitle(), objective.getOwnerId());
        return objectiveRepository.save(objective);
    }

    @Transactional
    public Objective updateObjective(Objective objective) {
        objective.setUpdatedAt(LocalDateTime.now());
        return objectiveRepository.save(objective);
    }

    @Transactional(readOnly = true)
    public Page<Objective> getAllObjectives(UUID tenantId, Pageable pageable) {
        return objectiveRepository.findAllByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Objective> getObjectivesByOwner(UUID tenantId, UUID ownerId, Pageable pageable) {
        return objectiveRepository.findAllByTenantIdAndOwnerId(tenantId, ownerId, pageable);
    }

    @Transactional(readOnly = true)
    public List<Objective> getObjectivesByOwnerList(UUID tenantId, UUID ownerId) {
        List<Objective> objectives = objectiveRepository.findAllByTenantIdAndOwnerIdList(tenantId, ownerId);
        attachKeyResults(objectives);
        return objectives;
    }

    /**
     * Batch-load key results for a list of objectives in a single query
     * (instead of N individual findAllByObjectiveId calls). Fixes F-05 OKR hang.
     */
    private void attachKeyResults(List<Objective> objectives) {
        if (objectives == null || objectives.isEmpty()) {
            return;
        }
        List<UUID> ids = objectives.stream().map(Objective::getId).toList();
        List<KeyResult> all = keyResultRepository.findAllByObjectiveIdIn(ids);
        Map<UUID, List<KeyResult>> byObjective = new HashMap<>();
        for (KeyResult kr : all) {
            byObjective.computeIfAbsent(kr.getObjectiveId(), k -> new ArrayList<>()).add(kr);
        }
        for (Objective obj : objectives) {
            obj.setKeyResults(byObjective.getOrDefault(obj.getId(), new ArrayList<>()));
        }
    }

    @Transactional(readOnly = true)
    public Page<Objective> getObjectivesByLevel(UUID tenantId, ObjectiveLevel level, Pageable pageable) {
        List<Objective> objectives = objectiveRepository.findByLevel(tenantId, level);
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), objectives.size());
        List<Objective> pageContent = start < objectives.size() ? objectives.subList(start, end) : new ArrayList<>();
        return new PageImpl<>(pageContent, pageable, objectives.size());
    }

    @Transactional(readOnly = true)
    public Page<Objective> getObjectivesByStatus(UUID tenantId, ObjectiveStatus status, Pageable pageable) {
        List<Objective> objectives = objectiveRepository.findByStatus(tenantId, status);
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), objectives.size());
        List<Objective> pageContent = start < objectives.size() ? objectives.subList(start, end) : new ArrayList<>();
        return new PageImpl<>(pageContent, pageable, objectives.size());
    }

    @Transactional(readOnly = true)
    public Page<Objective> getObjectivesByDepartment(UUID tenantId, UUID departmentId, Pageable pageable) {
        List<Objective> objectives = objectiveRepository.findByDepartment(tenantId, departmentId);
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), objectives.size());
        List<Objective> pageContent = start < objectives.size() ? objectives.subList(start, end) : new ArrayList<>();
        return new PageImpl<>(pageContent, pageable, objectives.size());
    }

    @Transactional(readOnly = true)
    public Page<Objective> getObjectivesByCycle(UUID tenantId, UUID cycleId, Pageable pageable) {
        return objectiveRepository.findAllByTenantIdAndCycleId(tenantId, cycleId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Objective> getObjectiveById(UUID tenantId, UUID id) {
        Optional<Objective> objective = objectiveRepository.findByIdAndTenantId(id, tenantId);
        // Load key results
        objective.ifPresent(obj -> {
            List<KeyResult> keyResults = keyResultRepository.findAllByObjectiveId(obj.getId());
            obj.setKeyResults(keyResults);
        });
        return objective;
    }

    @Transactional(readOnly = true)
    public List<Objective> getCompanyObjectives(UUID tenantId) {
        List<Objective> objectives = objectiveRepository.findByLevel(tenantId, ObjectiveLevel.COMPANY);
        attachKeyResults(objectives);
        return objectives;
    }

    @Transactional
    public void deleteObjective(UUID tenantId, UUID id) {
        objectiveRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(obj -> {
                    // Delete all key results first
                    keyResultRepository.deleteAllByObjectiveId(id);
                    // Delete all check-ins
                    checkInRepository.deleteAllByObjectiveId(id);
                    // Delete the objective
                    objectiveRepository.delete(obj);
                    log.info("Deleted objective: {}", id);
                });
    }

    @Transactional
    public void activateObjective(UUID id, UUID approverId, UUID tenantId) {
        Objective objective = objectiveRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Objective not found: " + id));

        objective.setStatus(ObjectiveStatus.ACTIVE);
        objective.setApprovedBy(approverId);
        objective.setUpdatedAt(LocalDateTime.now());
        objectiveRepository.save(objective);
        log.info("Activated objective: {}", id);
    }

    // ================== Key Results ==================

    @Transactional
    public KeyResult createKeyResult(KeyResult keyResult) {
        if (keyResult.getId() == null) {
            keyResult.setId(UUID.randomUUID());
        }
        if (keyResult.getStatus() == null) {
            keyResult.setStatus(KeyResult.KeyResultStatus.NOT_STARTED);
        }
        if (keyResult.getCreatedAt() == null) {
            keyResult.setCreatedAt(LocalDateTime.now());
        }

        KeyResult saved = keyResultRepository.save(keyResult);

        // Update objective progress
        recalculateObjectiveProgress(keyResult.getTenantId(), keyResult.getObjectiveId());

        log.info("Created key result: {} for objective: {}", keyResult.getTitle(), keyResult.getObjectiveId());
        return saved;
    }

    @Transactional
    public KeyResult updateKeyResult(KeyResult keyResult) {
        keyResult.setUpdatedAt(LocalDateTime.now());
        KeyResult saved = keyResultRepository.save(keyResult);

        // Update objective progress
        recalculateObjectiveProgress(keyResult.getTenantId(), keyResult.getObjectiveId());

        return saved;
    }

    @Transactional(readOnly = true)
    public Optional<KeyResult> getKeyResultById(UUID tenantId, UUID id) {
        return keyResultRepository.findByIdAndTenantId(id, tenantId);
    }

    @Transactional(readOnly = true)
    public List<KeyResult> getKeyResultsByObjective(UUID tenantId, UUID objectiveId) {
        return keyResultRepository.findByObjectiveOrderByWeight(tenantId, objectiveId);
    }

    @Transactional
    public void deleteKeyResult(UUID tenantId, UUID id) {
        keyResultRepository.findByIdAndTenantId(id, tenantId)
                .ifPresent(kr -> {
                    UUID objectiveId = kr.getObjectiveId();
                    // Delete all check-ins for this key result
                    checkInRepository.deleteAllByKeyResultId(id);
                    // Delete the key result
                    keyResultRepository.delete(kr);
                    // Recalculate objective progress
                    recalculateObjectiveProgress(tenantId, objectiveId);
                    log.info("Deleted key result: {}", id);
                });
    }

    @Transactional
    public KeyResult updateKeyResultProgress(UUID tenantId, UUID id, BigDecimal newValue, String notes) {
        KeyResult keyResult = keyResultRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Key Result not found: " + id));

        BigDecimal previousValue = keyResult.getCurrentValue();
        BigDecimal previousProgress = keyResult.getProgressPercentage();

        keyResult.setCurrentValue(newValue);
        keyResult.updateProgress();
        keyResult.setLastUpdatedNotes(notes);
        keyResult.setUpdatedAt(LocalDateTime.now());

        KeyResult saved = keyResultRepository.save(keyResult);

        // Create check-in record
        OkrCheckIn checkIn = OkrCheckIn.builder()
                .objectiveId(keyResult.getObjectiveId())
                .keyResultId(id)
                .employeeId(keyResult.getOwnerId())
                .checkInDate(LocalDateTime.now())
                .previousValue(previousValue)
                .newValue(newValue)
                .previousProgress(previousProgress)
                .newProgress(keyResult.getProgressPercentage())
                .notes(notes)
                .checkInType(OkrCheckIn.CheckInType.PROGRESS_UPDATE)
                .build();
        checkIn.setId(UUID.randomUUID());
        checkIn.setTenantId(tenantId);
        checkInRepository.save(checkIn);

        // Update objective progress
        recalculateObjectiveProgress(tenantId, keyResult.getObjectiveId());

        return saved;
    }

    @Transactional
    public void recalculateObjectiveProgress(UUID tenantId, UUID objectiveId) {
        objectiveRepository.findByIdAndTenantId(objectiveId, tenantId).ifPresent(objective -> {
            List<KeyResult> keyResults = keyResultRepository.findAllByObjectiveId(objectiveId);
            objective.setKeyResults(keyResults);
            objective.calculateProgress();
            objective.setUpdatedAt(LocalDateTime.now());
            objectiveRepository.save(objective);
        });
    }

    // ================== Check-ins ==================

    @Transactional
    public OkrCheckIn createCheckIn(OkrCheckIn checkIn) {
        if (checkIn.getId() == null) {
            checkIn.setId(UUID.randomUUID());
        }
        if (checkIn.getCreatedAt() == null) {
            checkIn.setCreatedAt(LocalDateTime.now());
        }
        return checkInRepository.save(checkIn);
    }

    @Transactional(readOnly = true)
    public List<OkrCheckIn> getCheckInsByObjective(UUID tenantId, UUID objectiveId) {
        return checkInRepository.findAllByTenantIdAndObjectiveIdOrderByCheckInDateDesc(tenantId, objectiveId);
    }

    @Transactional(readOnly = true)
    public List<OkrCheckIn> getCheckInsByKeyResult(UUID tenantId, UUID keyResultId) {
        return checkInRepository.findAllByTenantIdAndKeyResultIdOrderByCheckInDateDesc(tenantId, keyResultId);
    }

    @Transactional(readOnly = true)
    public Page<OkrCheckIn> getCheckInsByObjectivePaged(UUID objectiveId, Pageable pageable) {
        return checkInRepository.findAllByObjectiveId(objectiveId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<OkrCheckIn> getCheckInsByKeyResultPaged(UUID keyResultId, Pageable pageable) {
        return checkInRepository.findAllByKeyResultId(keyResultId, pageable);
    }

    // ================== Dashboard / Analytics ==================

    @Transactional(readOnly = true)
    public Map<String, Object> getOkrSummary(UUID tenantId, UUID employeeId) {
        Map<String, Object> summary = new HashMap<>();

        // Get employee's objectives
        List<Objective> myObjectives = objectiveRepository.findAllByTenantIdAndOwnerIdList(tenantId, employeeId);

        // Count by status
        long totalObjectives = myObjectives.size();
        long activeObjectives = myObjectives.stream().filter(o -> o.getStatus() == ObjectiveStatus.ACTIVE).count();
        long completedObjectives = myObjectives.stream().filter(o -> o.getStatus() == ObjectiveStatus.COMPLETED).count();
        long draftObjectives = myObjectives.stream().filter(o -> o.getStatus() == ObjectiveStatus.DRAFT).count();

        // Average progress
        BigDecimal avgProgress = myObjectives.isEmpty() ? BigDecimal.ZERO :
                myObjectives.stream()
                .map(o -> o.getProgressPercentage() != null ? o.getProgressPercentage() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(myObjectives.size()), 2, RoundingMode.HALF_UP);

        // Get all key results for my objectives
        List<KeyResult> allKeyResults = new ArrayList<>();
        for (Objective obj : myObjectives) {
            List<KeyResult> krs = keyResultRepository.findAllByObjectiveId(obj.getId());
            allKeyResults.addAll(krs);
        }

        long totalKeyResults = allKeyResults.size();
        long completedKeyResults = allKeyResults.stream()
                .filter(kr -> kr.getStatus() == KeyResult.KeyResultStatus.COMPLETED)
                .count();

        // Company objectives progress
        List<Objective> companyObjectives = objectiveRepository.findByLevel(tenantId, ObjectiveLevel.COMPANY);
        BigDecimal companyProgress = companyObjectives.isEmpty() ? BigDecimal.ZERO :
                companyObjectives.stream()
                .map(o -> o.getProgressPercentage() != null ? o.getProgressPercentage() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(companyObjectives.size()), 2, RoundingMode.HALF_UP);

        summary.put("totalObjectives", totalObjectives);
        summary.put("activeObjectives", activeObjectives);
        summary.put("completedObjectives", completedObjectives);
        summary.put("draftObjectives", draftObjectives);
        summary.put("averageProgress", avgProgress);
        summary.put("totalKeyResults", totalKeyResults);
        summary.put("completedKeyResults", completedKeyResults);
        summary.put("companyProgress", companyProgress);
        summary.put("companyObjectivesCount", companyObjectives.size());

        return summary;
    }
}
