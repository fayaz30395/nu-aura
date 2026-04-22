package com.hrms.application.performance.service;

import com.hrms.domain.performance.*;
import com.hrms.domain.performance.Objective.ObjectiveLevel;
import com.hrms.domain.performance.Objective.ObjectiveStatus;
import com.hrms.domain.performance.KeyResult.KeyResultStatus;
import com.hrms.domain.performance.OkrCheckIn.CheckInType;
import com.hrms.infrastructure.performance.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OkrServiceTest {

    @Mock
    private ObjectiveRepository objectiveRepository;

    @Mock
    private KeyResultRepository keyResultRepository;

    @Mock
    private OkrCheckInRepository checkInRepository;

    @InjectMocks
    private OkrService okrService;

    private UUID tenantId;
    private UUID ownerId;
    private UUID objectiveId;
    private UUID keyResultId;
    private Objective testObjective;
    private KeyResult testKeyResult;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        ownerId = UUID.randomUUID();
        objectiveId = UUID.randomUUID();
        keyResultId = UUID.randomUUID();

        testObjective = createTestObjective();
        testKeyResult = createTestKeyResult();
    }

    private Objective createTestObjective() {
        Objective objective = Objective.builder()
                .title("Increase Revenue by 25%")
                .description("Grow company revenue through new customer acquisition")
                .level(ObjectiveLevel.COMPANY)
                .status(ObjectiveStatus.DRAFT)
                .ownerId(ownerId)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .progressPercentage(BigDecimal.ZERO)
                .build();
        objective.setId(objectiveId);
        objective.setTenantId(tenantId);
        objective.setCreatedAt(LocalDateTime.now());
        return objective;
    }

    private KeyResult createTestKeyResult() {
        KeyResult keyResult = KeyResult.builder()
                .objectiveId(objectiveId)
                .title("Close 50 new enterprise deals")
                .description("Target enterprise customers with annual contracts")
                .measurementType(KeyResult.MeasurementType.NUMBER)
                .startValue(BigDecimal.ZERO)
                .targetValue(BigDecimal.valueOf(50))
                .currentValue(BigDecimal.ZERO)
                .weight(40)
                .status(KeyResultStatus.NOT_STARTED)
                .ownerId(ownerId)
                .progressPercentage(BigDecimal.ZERO)
                .build();
        keyResult.setId(keyResultId);
        keyResult.setTenantId(tenantId);
        keyResult.setCreatedAt(LocalDateTime.now());
        return keyResult;
    }

    // ================== Objective Tests ==================

    @Test
    void createObjective_Success() {
        Objective newObjective = Objective.builder()
                .title("Q1 Goals")
                .level(ObjectiveLevel.DEPARTMENT)
                .ownerId(ownerId)
                .build();
        newObjective.setTenantId(tenantId);

        when(objectiveRepository.save(any(Objective.class))).thenAnswer(invocation -> {
            Objective saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        Objective result = okrService.createObjective(newObjective);

        assertNotNull(result.getId());
        assertEquals(ObjectiveStatus.DRAFT, result.getStatus());
        assertNotNull(result.getCreatedAt());
        verify(objectiveRepository).save(any(Objective.class));
    }

    @Test
    void createObjective_WithExistingId_Success() {
        UUID existingId = UUID.randomUUID();
        testObjective.setId(existingId);

        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        Objective result = okrService.createObjective(testObjective);

        assertEquals(existingId, result.getId());
        verify(objectiveRepository).save(testObjective);
    }

    @Test
    void updateObjective_Success() {
        testObjective.setTitle("Updated Title");

        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        Objective result = okrService.updateObjective(testObjective);

        assertEquals("Updated Title", result.getTitle());
        assertNotNull(result.getUpdatedAt());
        verify(objectiveRepository).save(testObjective);
    }

    @Test
    void getAllObjectives_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Objective> expectedPage = new PageImpl<>(List.of(testObjective), pageable, 1);

        when(objectiveRepository.findAllByTenantId(tenantId, pageable)).thenReturn(expectedPage);

        Page<Objective> result = okrService.getAllObjectives(tenantId, pageable);

        assertEquals(1, result.getTotalElements());
        assertEquals(testObjective.getTitle(), result.getContent().get(0).getTitle());
    }

    @Test
    void getObjectivesByOwner_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Objective> expectedPage = new PageImpl<>(List.of(testObjective), pageable, 1);

        when(objectiveRepository.findAllByTenantIdAndOwnerId(tenantId, ownerId, pageable))
                .thenReturn(expectedPage);

        Page<Objective> result = okrService.getObjectivesByOwner(tenantId, ownerId, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getObjectivesByOwnerList_LoadsKeyResults() {
        when(objectiveRepository.findAllByTenantIdAndOwnerIdList(tenantId, ownerId))
                .thenReturn(List.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));

        List<Objective> result = okrService.getObjectivesByOwnerList(tenantId, ownerId);

        assertEquals(1, result.size());
        assertEquals(1, result.get(0).getKeyResults().size());
        verify(keyResultRepository).findAllByObjectiveId(objectiveId);
    }

    @Test
    void getObjectivesByLevel_Success() {
        Pageable pageable = PageRequest.of(0, 10);

        when(objectiveRepository.findByLevel(tenantId, ObjectiveLevel.COMPANY))
                .thenReturn(List.of(testObjective));

        Page<Objective> result = okrService.getObjectivesByLevel(tenantId, ObjectiveLevel.COMPANY, pageable);

        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getObjectiveById_Success() {
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));

        Optional<Objective> result = okrService.getObjectiveById(tenantId, objectiveId);

        assertTrue(result.isPresent());
        assertEquals(1, result.get().getKeyResults().size());
    }

    @Test
    void getObjectiveById_NotFound() {
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.empty());

        Optional<Objective> result = okrService.getObjectiveById(tenantId, objectiveId);

        assertTrue(result.isEmpty());
    }

    @Test
    void getCompanyObjectives_Success() {
        when(objectiveRepository.findByLevel(tenantId, ObjectiveLevel.COMPANY))
                .thenReturn(List.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));

        List<Objective> result = okrService.getCompanyObjectives(tenantId);

        assertEquals(1, result.size());
        assertNotNull(result.get(0).getKeyResults());
    }

    @Test
    void deleteObjective_Success() {
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));

        okrService.deleteObjective(tenantId, objectiveId);

        verify(keyResultRepository).deleteAllByObjectiveId(objectiveId);
        verify(checkInRepository).deleteAllByObjectiveId(objectiveId);
        verify(objectiveRepository).delete(testObjective);
    }

    @Test
    void deleteObjective_NotFound_NoAction() {
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.empty());

        okrService.deleteObjective(tenantId, objectiveId);

        verify(objectiveRepository, never()).delete(any());
    }

    @Test
    void activateObjective_Success() {
        UUID approverId = UUID.randomUUID();

        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        okrService.activateObjective(objectiveId, approverId, tenantId);

        assertEquals(ObjectiveStatus.ACTIVE, testObjective.getStatus());
        assertEquals(approverId, testObjective.getApprovedBy());
        verify(objectiveRepository).save(testObjective);
    }

    @Test
    void activateObjective_NotFound_ThrowsException() {
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                okrService.activateObjective(objectiveId, UUID.randomUUID(), tenantId));
    }

    // ================== Key Result Tests ==================

    @Test
    void createKeyResult_Success() {
        KeyResult newKeyResult = KeyResult.builder()
                .objectiveId(objectiveId)
                .title("New Key Result")
                .targetValue(BigDecimal.valueOf(100))
                .build();
        newKeyResult.setTenantId(tenantId);

        when(keyResultRepository.save(any(KeyResult.class))).thenAnswer(invocation -> {
            KeyResult saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));
        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        KeyResult result = okrService.createKeyResult(newKeyResult);

        assertNotNull(result.getId());
        assertEquals(KeyResultStatus.NOT_STARTED, result.getStatus());
        verify(keyResultRepository).save(any(KeyResult.class));
    }

    @Test
    void updateKeyResult_RecalculatesObjectiveProgress() {
        testKeyResult.setCurrentValue(BigDecimal.valueOf(25));

        when(keyResultRepository.save(any(KeyResult.class))).thenReturn(testKeyResult);
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));
        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        KeyResult result = okrService.updateKeyResult(testKeyResult);

        assertNotNull(result.getUpdatedAt());
        verify(objectiveRepository).save(any(Objective.class));
    }

    @Test
    void getKeyResultById_Success() {
        when(keyResultRepository.findByIdAndTenantId(keyResultId, tenantId))
                .thenReturn(Optional.of(testKeyResult));

        Optional<KeyResult> result = okrService.getKeyResultById(tenantId, keyResultId);

        assertTrue(result.isPresent());
        assertEquals(testKeyResult.getTitle(), result.get().getTitle());
    }

    @Test
    void getKeyResultsByObjective_Success() {
        when(keyResultRepository.findByObjectiveOrderByWeight(tenantId, objectiveId))
                .thenReturn(List.of(testKeyResult));

        List<KeyResult> result = okrService.getKeyResultsByObjective(tenantId, objectiveId);

        assertEquals(1, result.size());
    }

    @Test
    void deleteKeyResult_Success() {
        when(keyResultRepository.findByIdAndTenantId(keyResultId, tenantId))
                .thenReturn(Optional.of(testKeyResult));
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(Collections.emptyList());
        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        okrService.deleteKeyResult(tenantId, keyResultId);

        verify(checkInRepository).deleteAllByKeyResultId(keyResultId);
        verify(keyResultRepository).delete(testKeyResult);
    }

    @Test
    void updateKeyResultProgress_Success() {
        BigDecimal newValue = BigDecimal.valueOf(25);

        when(keyResultRepository.findByIdAndTenantId(keyResultId, tenantId))
                .thenReturn(Optional.of(testKeyResult));
        when(keyResultRepository.save(any(KeyResult.class))).thenReturn(testKeyResult);
        when(checkInRepository.save(any(OkrCheckIn.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));
        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        okrService.updateKeyResultProgress(tenantId, keyResultId, newValue, "Good progress");

        verify(checkInRepository).save(any(OkrCheckIn.class));
        verify(objectiveRepository).save(any(Objective.class));
    }

    @Test
    void updateKeyResultProgress_NotFound_ThrowsException() {
        when(keyResultRepository.findByIdAndTenantId(keyResultId, tenantId))
                .thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () ->
                okrService.updateKeyResultProgress(tenantId, keyResultId, BigDecimal.TEN, "notes"));
    }

    // ================== Check-in Tests ==================

    @Test
    void createCheckIn_Success() {
        OkrCheckIn checkIn = OkrCheckIn.builder()
                .objectiveId(objectiveId)
                .keyResultId(keyResultId)
                .employeeId(ownerId)
                .checkInDate(LocalDateTime.now())
                .notes("Weekly check-in")
                .checkInType(CheckInType.WEEKLY_REVIEW)
                .build();
        checkIn.setTenantId(tenantId);

        when(checkInRepository.save(any(OkrCheckIn.class))).thenAnswer(invocation -> {
            OkrCheckIn saved = invocation.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(UUID.randomUUID());
            }
            return saved;
        });

        OkrCheckIn result = okrService.createCheckIn(checkIn);

        assertNotNull(result.getId());
        assertNotNull(result.getCreatedAt());
    }

    @Test
    void getCheckInsByObjective_Success() {
        OkrCheckIn checkIn = OkrCheckIn.builder()
                .objectiveId(objectiveId)
                .checkInType(CheckInType.WEEKLY_REVIEW)
                .build();
        checkIn.setId(UUID.randomUUID());

        when(checkInRepository.findAllByTenantIdAndObjectiveIdOrderByCheckInDateDesc(tenantId, objectiveId))
                .thenReturn(List.of(checkIn));

        List<OkrCheckIn> result = okrService.getCheckInsByObjective(tenantId, objectiveId);

        assertEquals(1, result.size());
    }

    @Test
    void getCheckInsByKeyResult_Success() {
        OkrCheckIn checkIn = OkrCheckIn.builder()
                .keyResultId(keyResultId)
                .checkInType(CheckInType.PROGRESS_UPDATE)
                .build();
        checkIn.setId(UUID.randomUUID());

        when(checkInRepository.findAllByTenantIdAndKeyResultIdOrderByCheckInDateDesc(tenantId, keyResultId))
                .thenReturn(List.of(checkIn));

        List<OkrCheckIn> result = okrService.getCheckInsByKeyResult(tenantId, keyResultId);

        assertEquals(1, result.size());
    }

    // ================== Summary/Dashboard Tests ==================

    @Test
    void getOkrSummary_Success() {
        testObjective.setStatus(ObjectiveStatus.ACTIVE);
        testObjective.setProgressPercentage(BigDecimal.valueOf(50));

        when(objectiveRepository.findAllByTenantIdAndOwnerIdList(tenantId, ownerId))
                .thenReturn(List.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));
        when(objectiveRepository.findByLevel(tenantId, ObjectiveLevel.COMPANY))
                .thenReturn(List.of(testObjective));

        Map<String, Object> summary = okrService.getOkrSummary(tenantId, ownerId);

        assertEquals(1L, summary.get("totalObjectives"));
        assertEquals(1L, summary.get("activeObjectives"));
        assertNotNull(summary.get("averageProgress"));
        assertNotNull(summary.get("companyProgress"));
    }

    @Test
    void getOkrSummary_EmptyObjectives_ReturnsZeros() {
        when(objectiveRepository.findAllByTenantIdAndOwnerIdList(tenantId, ownerId))
                .thenReturn(Collections.emptyList());
        when(objectiveRepository.findByLevel(tenantId, ObjectiveLevel.COMPANY))
                .thenReturn(Collections.emptyList());

        Map<String, Object> summary = okrService.getOkrSummary(tenantId, ownerId);

        assertEquals(0L, summary.get("totalObjectives"));
        assertEquals(BigDecimal.ZERO, summary.get("averageProgress"));
    }

    @Test
    void recalculateObjectiveProgress_WithKeyResults_UpdatesProgress() {
        testKeyResult.setProgressPercentage(BigDecimal.valueOf(50));
        testKeyResult.setWeight(100);

        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.of(testObjective));
        when(keyResultRepository.findAllByObjectiveId(objectiveId))
                .thenReturn(List.of(testKeyResult));
        when(objectiveRepository.save(any(Objective.class))).thenReturn(testObjective);

        okrService.recalculateObjectiveProgress(tenantId, objectiveId);

        verify(objectiveRepository).save(any(Objective.class));
    }

    @Test
    void recalculateObjectiveProgress_ObjectiveNotFound_NoAction() {
        when(objectiveRepository.findByIdAndTenantId(objectiveId, tenantId))
                .thenReturn(Optional.empty());

        okrService.recalculateObjectiveProgress(tenantId, objectiveId);

        verify(objectiveRepository, never()).save(any());
    }
}
