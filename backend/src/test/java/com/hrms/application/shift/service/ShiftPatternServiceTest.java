package com.hrms.application.shift.service;

import com.hrms.api.shift.dto.ShiftPatternRequest;
import com.hrms.api.shift.dto.ShiftPatternResponse;
import com.hrms.common.exception.DuplicateResourceException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.shift.ShiftPattern;
import com.hrms.infrastructure.shift.repository.ShiftPatternRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ShiftPatternService Tests")
class ShiftPatternServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private ShiftPatternRepository shiftPatternRepository;
    @InjectMocks
    private ShiftPatternService shiftPatternService;
    private UUID tenantId;

    @BeforeAll
    static void setUpTenantContext() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownTenantContext() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    @Test
    @DisplayName("createPattern - should create successfully")
    void createPattern_shouldCreateSuccessfully() {
        ShiftPatternRequest request = ShiftPatternRequest.builder()
                .name("4-on-2-off")
                .description("4 working days, 2 days off")
                .rotationType("WEEKLY_ROTATING")
                .pattern("[\"shift1\",\"shift1\",\"shift1\",\"shift1\",\"OFF\",\"OFF\"]")
                .cycleDays(6)
                .isActive(true)
                .build();

        when(shiftPatternRepository.existsByTenantIdAndName(tenantId, "4-on-2-off")).thenReturn(false);
        when(shiftPatternRepository.save(any(ShiftPattern.class))).thenAnswer(inv -> {
            ShiftPattern p = inv.getArgument(0);
            // Simulate ID assignment
            return p;
        });

        ShiftPatternResponse result = shiftPatternService.createPattern(request);

        assertThat(result.getName()).isEqualTo("4-on-2-off");
        assertThat(result.getRotationType()).isEqualTo("WEEKLY_ROTATING");
        assertThat(result.getCycleDays()).isEqualTo(6);
        verify(shiftPatternRepository).save(any(ShiftPattern.class));
    }

    @Test
    @DisplayName("createPattern - should throw on duplicate name")
    void createPattern_shouldThrowOnDuplicate() {
        ShiftPatternRequest request = ShiftPatternRequest.builder()
                .name("Existing Pattern")
                .rotationType("FIXED")
                .pattern("[\"OFF\"]")
                .cycleDays(1)
                .build();

        when(shiftPatternRepository.existsByTenantIdAndName(tenantId, "Existing Pattern")).thenReturn(true);

        assertThatThrownBy(() -> shiftPatternService.createPattern(request))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    @DisplayName("getPatternById - should return pattern")
    void getPatternById_shouldReturnPattern() {
        UUID patternId = UUID.randomUUID();
        ShiftPattern pattern = ShiftPattern.builder()
                .tenantId(tenantId)
                .name("Test Pattern")
                .rotationType(ShiftPattern.RotationType.CUSTOM)
                .pattern("[\"shift1\",\"OFF\"]")
                .cycleDays(2)
                .isActive(true)
                .build();

        when(shiftPatternRepository.findByIdAndTenantId(patternId, tenantId))
                .thenReturn(Optional.of(pattern));

        ShiftPatternResponse result = shiftPatternService.getPatternById(patternId);

        assertThat(result.getName()).isEqualTo("Test Pattern");
        assertThat(result.getRotationType()).isEqualTo("CUSTOM");
    }

    @Test
    @DisplayName("getPatternById - should throw when not found")
    void getPatternById_shouldThrowWhenNotFound() {
        UUID patternId = UUID.randomUUID();
        when(shiftPatternRepository.findByIdAndTenantId(patternId, tenantId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> shiftPatternService.getPatternById(patternId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("deletePattern - should delete successfully")
    void deletePattern_shouldDeleteSuccessfully() {
        UUID patternId = UUID.randomUUID();
        ShiftPattern pattern = ShiftPattern.builder()
                .tenantId(tenantId)
                .name("To Delete")
                .rotationType(ShiftPattern.RotationType.FIXED)
                .pattern("[\"OFF\"]")
                .cycleDays(1)
                .isActive(true)
                .build();

        when(shiftPatternRepository.findByIdAndTenantId(patternId, tenantId))
                .thenReturn(Optional.of(pattern));

        shiftPatternService.deletePattern(patternId);

        verify(shiftPatternRepository).delete(pattern);
    }
}
