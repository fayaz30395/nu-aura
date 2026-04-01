package com.hrms.application.wellness.service;

import com.hrms.api.wellness.dto.WellnessChallengeDto;
import com.hrms.api.wellness.dto.WellnessProgramDto;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.wellness.*;
import com.hrms.infrastructure.user.repository.UserRepository;
import com.hrms.infrastructure.wellness.repository.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("WellnessService Tests")
class WellnessServiceTest {

    @Mock private WellnessProgramRepository programRepository;
    @Mock private WellnessChallengeRepository challengeRepository;
    @Mock private ChallengeParticipantRepository participantRepository;
    @Mock private HealthLogRepository healthLogRepository;
    @Mock private WellnessPointsRepository pointsRepository;
    @Mock private PointsTransactionRepository transactionRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private WellnessService wellnessService;

    private static MockedStatic<TenantContext> tenantContextMock;
    private UUID tenantId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
    }

    // ==================== Program Management Tests ====================

    @Test
    @DisplayName("createProgram should save and return program DTO")
    void shouldCreateProgram() {
        WellnessProgramDto request = WellnessProgramDto.builder()
                .name("Fitness Challenge 2026")
                .description("Annual wellness challenge")
                .programType(WellnessProgram.ProgramType.CHALLENGE)
                .category(WellnessProgram.ProgramCategory.PHYSICAL_FITNESS)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusMonths(3))
                .maxParticipants(100)
                .pointsReward(500)
                .build();

        when(programRepository.save(any(WellnessProgram.class))).thenAnswer(inv -> {
            WellnessProgram saved = inv.getArgument(0);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        WellnessProgramDto result = wellnessService.createProgram(request);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Fitness Challenge 2026");
        assertThat(result.getIsActive()).isTrue();
        verify(programRepository).save(argThat(p -> p.getTenantId().equals(tenantId)));
    }

    @Test
    @DisplayName("getActivePrograms should return active programs for tenant")
    void shouldGetActivePrograms() {
        WellnessProgram program = new WellnessProgram();
        program.setId(UUID.randomUUID());
        program.setName("Active Program");
        program.setIsActive(true);

        when(programRepository.findActivePrograms(eq(tenantId), any(LocalDate.class)))
                .thenReturn(List.of(program));

        List<WellnessProgramDto> result = wellnessService.getActivePrograms();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Active Program");
    }

    @Test
    @DisplayName("getFeaturedPrograms should return featured programs")
    void shouldGetFeaturedPrograms() {
        WellnessProgram program = new WellnessProgram();
        program.setId(UUID.randomUUID());
        program.setName("Featured");
        program.setIsFeatured(true);

        when(programRepository.findFeaturedPrograms(tenantId)).thenReturn(List.of(program));

        List<WellnessProgramDto> result = wellnessService.getFeaturedPrograms();

        assertThat(result).hasSize(1);
    }

    // ==================== Challenge Management Tests ====================

    @Nested
    @DisplayName("createChallenge")
    class CreateChallengeTests {

        @Test
        @DisplayName("Should create challenge linked to program")
        void shouldCreateChallenge() {
            UUID programId = UUID.randomUUID();
            WellnessProgram program = new WellnessProgram();
            program.setId(programId);

            WellnessChallengeDto request = WellnessChallengeDto.builder()
                    .name("10K Steps Challenge")
                    .challengeType(WellnessChallenge.ChallengeType.STEPS)
                    .trackingType(WellnessChallenge.TrackingType.MANUAL)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(30))
                    .targetValue(300000.0)
                    .build();

            when(programRepository.findByIdAndTenantId(programId, tenantId)).thenReturn(Optional.of(program));
            when(challengeRepository.save(any(WellnessChallenge.class))).thenAnswer(inv -> {
                WellnessChallenge saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                return saved;
            });

            WellnessChallengeDto result = wellnessService.createChallenge(programId, request);

            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("10K Steps Challenge");
        }

        @Test
        @DisplayName("Should throw when program not found")
        void shouldThrowWhenProgramNotFound() {
            UUID programId = UUID.randomUUID();
            WellnessChallengeDto request = WellnessChallengeDto.builder()
                    .name("Challenge")
                    .build();

            when(programRepository.findByIdAndTenantId(programId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> wellnessService.createChallenge(programId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Program not found");
        }
    }

    @Test
    @DisplayName("getActiveChallenges should return active challenges")
    void shouldGetActiveChallenges() {
        WellnessChallenge challenge = new WellnessChallenge();
        challenge.setId(UUID.randomUUID());
        challenge.setName("Active Challenge");

        when(challengeRepository.findActiveChallenges(eq(tenantId), any(LocalDate.class)))
                .thenReturn(List.of(challenge));

        List<WellnessChallengeDto> result = wellnessService.getActiveChallenges();

        assertThat(result).hasSize(1);
    }

    // ==================== Participation Tests ====================

    @Nested
    @DisplayName("joinChallenge")
    class JoinChallengeTests {

        @Test
        @DisplayName("Should throw when already participating")
        void shouldThrowWhenAlreadyParticipating() {
            UUID challengeId = UUID.randomUUID();
            UUID employeeId = UUID.randomUUID();

            WellnessChallenge challenge = new WellnessChallenge();
            challenge.setId(challengeId);

            when(challengeRepository.findByIdAndTenantId(challengeId, tenantId)).thenReturn(Optional.of(challenge));
            when(participantRepository.findByChallengeIdAndEmployeeId(challengeId, employeeId))
                    .thenReturn(Optional.of(new ChallengeParticipant()));

            assertThatThrownBy(() -> wellnessService.joinChallenge(challengeId, employeeId, null, null))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Already participating");
        }

        @Test
        @DisplayName("Should throw when challenge not found")
        void shouldThrowWhenChallengeNotFound() {
            UUID challengeId = UUID.randomUUID();
            when(challengeRepository.findByIdAndTenantId(challengeId, tenantId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> wellnessService.joinChallenge(challengeId, UUID.randomUUID(), null, null))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }
}
