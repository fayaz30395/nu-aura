package com.hrms.api.wellness.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.wellness.dto.*;
import com.hrms.application.wellness.service.WellnessService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import com.hrms.common.security.*;
import com.hrms.domain.wellness.HealthLog.MetricType;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(WellnessController.class)
@ContextConfiguration(classes = {WellnessController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("WellnessController Unit Tests")
class WellnessControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private WellnessService wellnessService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID programId;
    private UUID challengeId;
    private UUID employeeId;
    private UUID teamId;
    private WellnessProgramDto programDto;
    private WellnessChallengeDto challengeDto;

    @BeforeEach
    void setUp() {
        programId = UUID.randomUUID();
        challengeId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        teamId = UUID.randomUUID();

        SecurityContext.setCurrentUser(UUID.randomUUID(), employeeId, Set.of("EMPLOYEE"), Map.of());

        programDto = WellnessProgramDto.builder()
                .id(programId)
                .name("10,000 Steps Challenge")
                .description("Walk 10,000 steps daily for 30 days")
                .isActive(true)
                .maxParticipants(100)
                .currentParticipants(0)
                .pointsReward(500)
                .build();

        challengeDto = WellnessChallengeDto.builder()
                .id(challengeId)
                .programId(programId)
                .name("Daily Step Challenge")
                .description("Hit 10k steps every day")
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .targetValue(10000.0)
                .targetUnit("steps")
                .pointsPerCompletion(50)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Nested
    @DisplayName("Dashboard Tests")
    class DashboardTests {

        @Test
        @DisplayName("Should get wellness dashboard for current user")
        void shouldGetDashboard() throws Exception {
            WellnessDashboard dashboard = WellnessDashboard.builder()
                    .activeChallengesCount(3)
                    .completedChallengesCount(5)
                    .totalActiveParticipants(120L)
                    .build();

            when(wellnessService.getDashboard(employeeId)).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/wellness/dashboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.activeChallengesCount").value(3))
                    .andExpect(jsonPath("$.completedChallengesCount").value(5))
                    .andExpect(jsonPath("$.totalActiveParticipants").value(120));

            verify(wellnessService).getDashboard(employeeId);
        }
    }

    @Nested
    @DisplayName("Wellness Program Tests")
    class WellnessProgramTests {

        @Test
        @DisplayName("Should create wellness program")
        void shouldCreateWellnessProgram() throws Exception {
            when(wellnessService.createProgram(any(WellnessProgramDto.class)))
                    .thenReturn(programDto);

            mockMvc.perform(post("/api/v1/wellness/programs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(programDto)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(programId.toString()))
                    .andExpect(jsonPath("$.name").value("10,000 Steps Challenge"))
                    .andExpect(jsonPath("$.isActive").value(true));

            verify(wellnessService).createProgram(any(WellnessProgramDto.class));
        }

        @Test
        @DisplayName("Should get active wellness programs")
        void shouldGetActivePrograms() throws Exception {
            when(wellnessService.getActivePrograms())
                    .thenReturn(Collections.singletonList(programDto));

            mockMvc.perform(get("/api/v1/wellness/programs/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].name").value("10,000 Steps Challenge"));

            verify(wellnessService).getActivePrograms();
        }

        @Test
        @DisplayName("Should get featured wellness programs")
        void shouldGetFeaturedPrograms() throws Exception {
            WellnessProgramDto featuredProgram = WellnessProgramDto.builder()
                    .id(UUID.randomUUID())
                    .name("Featured Mindfulness Program")
                    .isActive(true)
                    .build();

            when(wellnessService.getFeaturedPrograms())
                    .thenReturn(Collections.singletonList(featuredProgram));

            mockMvc.perform(get("/api/v1/wellness/programs/featured"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].name").value("Featured Mindfulness Program"));

            verify(wellnessService).getFeaturedPrograms();
        }

        @Test
        @DisplayName("Should return empty list when no active programs")
        void shouldReturnEmptyListWhenNoActivePrograms() throws Exception {
            when(wellnessService.getActivePrograms()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/wellness/programs/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(0));
        }
    }

    @Nested
    @DisplayName("Wellness Challenge Tests")
    class WellnessChallengeTests {

        @Test
        @DisplayName("Should create challenge within a program")
        void shouldCreateChallengeWithinProgram() throws Exception {
            when(wellnessService.createChallenge(eq(programId), any(WellnessChallengeDto.class)))
                    .thenReturn(challengeDto);

            mockMvc.perform(post("/api/v1/wellness/programs/{programId}/challenges", programId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(challengeDto)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(challengeId.toString()))
                    .andExpect(jsonPath("$.name").value("Daily Step Challenge"))
                    .andExpect(jsonPath("$.targetValue").value(10000.0));

            verify(wellnessService).createChallenge(eq(programId), any(WellnessChallengeDto.class));
        }

        @Test
        @DisplayName("Should create standalone challenge without a program")
        void shouldCreateStandaloneChallenge() throws Exception {
            WellnessChallengeDto standaloneChallenge = WellnessChallengeDto.builder()
                    .id(UUID.randomUUID())
                    .name("Standalone Water Challenge")
                    .targetValue(2000.0)
                    .targetUnit("ml")
                    .build();

            when(wellnessService.createChallenge(isNull(), any(WellnessChallengeDto.class)))
                    .thenReturn(standaloneChallenge);

            mockMvc.perform(post("/api/v1/wellness/challenges")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(standaloneChallenge)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Standalone Water Challenge"));

            verify(wellnessService).createChallenge(isNull(), any(WellnessChallengeDto.class));
        }

        @Test
        @DisplayName("Should get active challenges")
        void shouldGetActiveChallenges() throws Exception {
            when(wellnessService.getActiveChallenges())
                    .thenReturn(Collections.singletonList(challengeDto));

            mockMvc.perform(get("/api/v1/wellness/challenges/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].name").value("Daily Step Challenge"));

            verify(wellnessService).getActiveChallenges();
        }

        @Test
        @DisplayName("Should get upcoming challenges")
        void shouldGetUpcomingChallenges() throws Exception {
            WellnessChallengeDto upcomingChallenge = WellnessChallengeDto.builder()
                    .id(UUID.randomUUID())
                    .name("December Fitness Challenge")
                    .startDate(LocalDate.of(2026, 12, 1))
                    .endDate(LocalDate.of(2026, 12, 31))
                    .build();

            when(wellnessService.getUpcomingChallenges())
                    .thenReturn(Collections.singletonList(upcomingChallenge));

            mockMvc.perform(get("/api/v1/wellness/challenges/upcoming"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].name").value("December Fitness Challenge"));

            verify(wellnessService).getUpcomingChallenges();
        }
    }

    @Nested
    @DisplayName("Challenge Participation Tests")
    class ChallengeParticipationTests {

        @Test
        @DisplayName("Should join a challenge")
        void shouldJoinChallenge() throws Exception {
            doNothing().when(wellnessService).joinChallenge(challengeId, employeeId, null, null);

            mockMvc.perform(post("/api/v1/wellness/challenges/{challengeId}/join", challengeId))
                    .andExpect(status().isOk());

            verify(wellnessService).joinChallenge(challengeId, employeeId, null, null);
        }

        @Test
        @DisplayName("Should join a challenge as part of a team")
        void shouldJoinChallengeWithTeam() throws Exception {
            doNothing().when(wellnessService)
                    .joinChallenge(challengeId, employeeId, teamId, "Team Alpha");

            mockMvc.perform(post("/api/v1/wellness/challenges/{challengeId}/join", challengeId)
                            .param("teamId", teamId.toString())
                            .param("teamName", "Team Alpha"))
                    .andExpect(status().isOk());

            verify(wellnessService).joinChallenge(challengeId, employeeId, teamId, "Team Alpha");
        }

        @Test
        @DisplayName("Should leave a challenge")
        void shouldLeaveChallenge() throws Exception {
            doNothing().when(wellnessService).leaveChallenge(challengeId, employeeId);

            mockMvc.perform(post("/api/v1/wellness/challenges/{challengeId}/leave", challengeId))
                    .andExpect(status().isOk());

            verify(wellnessService).leaveChallenge(challengeId, employeeId);
        }
    }

    @Nested
    @DisplayName("Health Logging Tests")
    class HealthLoggingTests {

        @Test
        @DisplayName("Should log steps health metric")
        void shouldLogSteps() throws Exception {
            HealthLogDto healthLogRequest = HealthLogDto.builder()
                    .metricType(MetricType.STEPS)
                    .value(8500.0)
                    .unit("steps")
                    .logDate(LocalDate.now())
                    .build();

            HealthLogDto savedLog = HealthLogDto.builder()
                    .id(UUID.randomUUID())
                    .employeeId(employeeId)
                    .metricType(MetricType.STEPS)
                    .value(8500.0)
                    .unit("steps")
                    .logDate(LocalDate.now())
                    .pointsAwarded(10)
                    .loggedAt(LocalDateTime.now())
                    .build();

            when(wellnessService.logHealth(eq(employeeId), any(HealthLogDto.class)))
                    .thenReturn(savedLog);

            mockMvc.perform(post("/api/v1/wellness/health-logs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(healthLogRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.metricType").value("STEPS"))
                    .andExpect(jsonPath("$.value").value(8500.0))
                    .andExpect(jsonPath("$.pointsAwarded").value(10));

            verify(wellnessService).logHealth(eq(employeeId), any(HealthLogDto.class));
        }

        @Test
        @DisplayName("Should log sleep hours")
        void shouldLogSleepHours() throws Exception {
            HealthLogDto healthLogRequest = HealthLogDto.builder()
                    .metricType(MetricType.SLEEP_HOURS)
                    .value(7.5)
                    .unit("hours")
                    .logDate(LocalDate.now())
                    .build();

            HealthLogDto savedLog = HealthLogDto.builder()
                    .id(UUID.randomUUID())
                    .metricType(MetricType.SLEEP_HOURS)
                    .value(7.5)
                    .build();

            when(wellnessService.logHealth(eq(employeeId), any(HealthLogDto.class)))
                    .thenReturn(savedLog);

            mockMvc.perform(post("/api/v1/wellness/health-logs")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(healthLogRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.metricType").value("SLEEP_HOURS"));
        }

        @Test
        @DisplayName("Should get health logs for date range")
        void shouldGetHealthLogsForDateRange() throws Exception {
            LocalDate startDate = LocalDate.of(2026, 11, 1);
            LocalDate endDate = LocalDate.of(2026, 11, 30);

            HealthLogDto log = HealthLogDto.builder()
                    .id(UUID.randomUUID())
                    .employeeId(employeeId)
                    .metricType(MetricType.STEPS)
                    .value(9000.0)
                    .logDate(LocalDate.of(2026, 11, 15))
                    .build();

            when(wellnessService.getHealthLogs(employeeId, startDate, endDate))
                    .thenReturn(Collections.singletonList(log));

            mockMvc.perform(get("/api/v1/wellness/health-logs")
                            .param("startDate", "2026-11-01")
                            .param("endDate", "2026-11-30"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1))
                    .andExpect(jsonPath("$[0].metricType").value("STEPS"));

            verify(wellnessService).getHealthLogs(employeeId, startDate, endDate);
        }
    }

    @Nested
    @DisplayName("Points and Leaderboard Tests")
    class PointsAndLeaderboardTests {

        @Test
        @DisplayName("Should get current user wellness points")
        void shouldGetMyPoints() throws Exception {
            WellnessPointsDto points = WellnessPointsDto.builder()
                    .employeeId(employeeId)
                    .totalPoints(1500)
                    .redeemablePoints(300)
                    .currentLevel(3)
                    .build();

            when(wellnessService.getMyPoints(employeeId)).thenReturn(points);

            mockMvc.perform(get("/api/v1/wellness/points"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalPoints").value(1500))
                    .andExpect(jsonPath("$.redeemablePoints").value(300));

            verify(wellnessService).getMyPoints(employeeId);
        }

        @Test
        @DisplayName("Should get overall wellness leaderboard")
        void shouldGetLeaderboard() throws Exception {
            WellnessDashboard.LeaderboardEntry entry = new WellnessDashboard.LeaderboardEntry();

            when(wellnessService.getLeaderboard(10))
                    .thenReturn(Collections.singletonList(entry));

            mockMvc.perform(get("/api/v1/wellness/leaderboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(wellnessService).getLeaderboard(10);
        }

        @Test
        @DisplayName("Should get challenge-specific leaderboard")
        void shouldGetChallengeLeaderboard() throws Exception {
            WellnessDashboard.LeaderboardEntry entry = new WellnessDashboard.LeaderboardEntry();

            when(wellnessService.getChallengeLeaderboard(challengeId, 10))
                    .thenReturn(Collections.singletonList(entry));

            mockMvc.perform(get("/api/v1/wellness/challenges/{challengeId}/leaderboard", challengeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(wellnessService).getChallengeLeaderboard(challengeId, 10);
        }

        @Test
        @DisplayName("Should get challenge leaderboard with custom limit")
        void shouldGetChallengeLeaderboardWithCustomLimit() throws Exception {
            when(wellnessService.getChallengeLeaderboard(challengeId, 5))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/wellness/challenges/{challengeId}/leaderboard", challengeId)
                            .param("limit", "5"))
                    .andExpect(status().isOk());

            verify(wellnessService).getChallengeLeaderboard(challengeId, 5);
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("getDashboard should have WELLNESS_VIEW permission")
        void getDashboardShouldRequireWellnessView() throws Exception {
            var method = WellnessController.class.getMethod("getDashboard");
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getDashboard must have @RequiresPermission");
            Assertions.assertEquals(Permission.WELLNESS_VIEW, annotation.value()[0]);
        }

        @Test
        @DisplayName("createProgram should have WELLNESS_MANAGE permission")
        void createProgramShouldRequireWellnessManage() throws Exception {
            var method = WellnessController.class.getMethod("createProgram", WellnessProgramDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "createProgram must have @RequiresPermission");
            Assertions.assertEquals(Permission.WELLNESS_MANAGE, annotation.value()[0]);
        }

        @Test
        @DisplayName("joinChallenge should have WELLNESS_CREATE permission")
        void joinChallengeShouldRequireWellnessCreate() throws Exception {
            var method = WellnessController.class.getMethod(
                    "joinChallenge", UUID.class, UUID.class, String.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "joinChallenge must have @RequiresPermission");
            Assertions.assertEquals(Permission.WELLNESS_CREATE, annotation.value()[0]);
        }

        @Test
        @DisplayName("logHealth should have WELLNESS_CREATE permission")
        void logHealthShouldRequireWellnessCreate() throws Exception {
            var method = WellnessController.class.getMethod("logHealth", HealthLogDto.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "logHealth must have @RequiresPermission");
            Assertions.assertEquals(Permission.WELLNESS_CREATE, annotation.value()[0]);
        }
    }
}
