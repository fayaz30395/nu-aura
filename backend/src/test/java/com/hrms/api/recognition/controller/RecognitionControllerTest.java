package com.hrms.api.recognition.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.recognition.dto.EngagementDashboardResponse;
import com.hrms.api.recognition.dto.RecognitionRequest;
import com.hrms.api.recognition.dto.RecognitionResponse;
import com.hrms.application.recognition.service.RecognitionService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
import com.hrms.common.security.*;
import com.hrms.domain.recognition.EmployeePoints;
import com.hrms.domain.recognition.Milestone;
import com.hrms.domain.recognition.Recognition;
import com.hrms.domain.recognition.RecognitionBadge;
import com.hrms.domain.recognition.RecognitionReaction;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RecognitionController.class)
@ContextConfiguration(classes = {RecognitionController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("RecognitionController Unit Tests")
class RecognitionControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private RecognitionService recognitionService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID recognitionId;
    private UUID giverId;
    private UUID receiverId;
    private UUID userId;
    private RecognitionRequest recognitionRequest;
    private RecognitionResponse recognitionResponse;

    @BeforeEach
    void setUp() {
        recognitionId = UUID.randomUUID();
        giverId = UUID.randomUUID();
        receiverId = UUID.randomUUID();
        userId = UUID.randomUUID();

        SecurityContext.setCurrentUser(userId, giverId, Set.of("EMPLOYEE"), Map.of());

        recognitionRequest = RecognitionRequest.builder()
                .receiverId(receiverId)
                .type(Recognition.RecognitionType.KUDOS)
                .category(Recognition.RecognitionCategory.TEAMWORK)
                .title("Outstanding teamwork this sprint!")
                .message("Your collaboration made the difference")
                .points(50)
                .isPublic(true)
                .isAnonymous(false)
                .build();

        recognitionResponse = RecognitionResponse.builder()
                .id(recognitionId)
                .giverId(giverId)
                .giverName("Alice Johnson")
                .receiverId(receiverId)
                .receiverName("Bob Smith")
                .type(Recognition.RecognitionType.KUDOS)
                .typeLabel("Kudos")
                .category(Recognition.RecognitionCategory.TEAMWORK)
                .categoryLabel("Teamwork")
                .title("Outstanding teamwork this sprint!")
                .message("Your collaboration made the difference")
                .pointsAwarded(50)
                .isPublic(true)
                .isAnonymous(false)
                .likesCount(0)
                .commentsCount(0)
                .isApproved(true)
                .recognizedAt(LocalDateTime.now())
                .createdAt(LocalDateTime.now())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    @Nested
    @DisplayName("Give Recognition Tests")
    class GiveRecognitionTests {

        @Test
        @DisplayName("Should give kudos recognition successfully")
        void shouldGiveKudosSuccessfully() throws Exception {
            when(recognitionService.giveRecognition(eq(giverId), any(RecognitionRequest.class)))
                    .thenReturn(recognitionResponse);

            mockMvc.perform(post("/api/v1/recognition")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(recognitionRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(recognitionId.toString()))
                    .andExpect(jsonPath("$.type").value("KUDOS"))
                    .andExpect(jsonPath("$.typeLabel").value("Kudos"))
                    .andExpect(jsonPath("$.category").value("TEAMWORK"))
                    .andExpect(jsonPath("$.pointsAwarded").value(50));

            verify(recognitionService).giveRecognition(eq(giverId), any(RecognitionRequest.class));
        }

        @Test
        @DisplayName("Should give achievement recognition")
        void shouldGiveAchievementRecognition() throws Exception {
            RecognitionRequest achievementRequest = RecognitionRequest.builder()
                    .receiverId(receiverId)
                    .type(Recognition.RecognitionType.ACHIEVEMENT)
                    .title("Completed AWS Certification!")
                    .message("Amazing achievement")
                    .points(200)
                    .isPublic(true)
                    .isAnonymous(false)
                    .build();

            RecognitionResponse achievementResponse = RecognitionResponse.builder()
                    .id(UUID.randomUUID())
                    .type(Recognition.RecognitionType.ACHIEVEMENT)
                    .typeLabel("Achievement")
                    .pointsAwarded(200)
                    .build();

            when(recognitionService.giveRecognition(eq(giverId), any(RecognitionRequest.class)))
                    .thenReturn(achievementResponse);

            mockMvc.perform(post("/api/v1/recognition")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(achievementRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.type").value("ACHIEVEMENT"))
                    .andExpect(jsonPath("$.pointsAwarded").value(200));
        }

        @Test
        @DisplayName("Should return 400 when receiverId is missing")
        void shouldReturn400WhenReceiverIdMissing() throws Exception {
            RecognitionRequest invalidRequest = RecognitionRequest.builder()
                    .type(Recognition.RecognitionType.KUDOS)
                    .title("Good work!")
                    .isPublic(true)
                    .isAnonymous(false)
                    .build();
            // Missing required receiverId

            mockMvc.perform(post("/api/v1/recognition")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when title is missing")
        void shouldReturn400WhenTitleMissing() throws Exception {
            RecognitionRequest invalidRequest = RecognitionRequest.builder()
                    .receiverId(receiverId)
                    .type(Recognition.RecognitionType.KUDOS)
                    .isPublic(true)
                    .isAnonymous(false)
                    .build();
            // Missing required title

            mockMvc.perform(post("/api/v1/recognition")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Get Recognition Tests")
    class GetRecognitionTests {

        @Test
        @DisplayName("Should get recognition by ID")
        void shouldGetRecognitionById() throws Exception {
            when(recognitionService.getRecognitionById(recognitionId)).thenReturn(recognitionResponse);

            mockMvc.perform(get("/api/v1/recognition/{id}", recognitionId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(recognitionId.toString()))
                    .andExpect(jsonPath("$.giverName").value("Alice Johnson"))
                    .andExpect(jsonPath("$.receiverName").value("Bob Smith"));

            verify(recognitionService).getRecognitionById(recognitionId);
        }

        @Test
        @DisplayName("Should get public recognition feed with pagination")
        void shouldGetPublicFeed() throws Exception {
            Page<RecognitionResponse> page = new PageImpl<>(
                    Collections.singletonList(recognitionResponse),
                    PageRequest.of(0, 20),
                    1);

            when(recognitionService.getPublicFeed(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/recognition/feed")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].isPublic").value(true));

            verify(recognitionService).getPublicFeed(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get my received recognitions")
        void shouldGetMyReceivedRecognitions() throws Exception {
            Page<RecognitionResponse> page = new PageImpl<>(
                    Collections.singletonList(recognitionResponse),
                    PageRequest.of(0, 10),
                    1);

            when(recognitionService.getMyReceivedRecognitions(eq(userId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recognition/received")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(recognitionService).getMyReceivedRecognitions(eq(userId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get my given recognitions")
        void shouldGetMyGivenRecognitions() throws Exception {
            Page<RecognitionResponse> page = new PageImpl<>(
                    Collections.singletonList(recognitionResponse),
                    PageRequest.of(0, 10),
                    1);

            when(recognitionService.getMyGivenRecognitions(eq(userId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/recognition/given")
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));

            verify(recognitionService).getMyGivenRecognitions(eq(userId), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Reaction Tests")
    class ReactionTests {

        @Test
        @DisplayName("Should add LIKE reaction to recognition")
        void shouldAddLikeReaction() throws Exception {
            doNothing().when(recognitionService).addReaction(
                    recognitionId, userId, RecognitionReaction.ReactionType.LIKE);

            mockMvc.perform(post("/api/v1/recognition/{id}/react", recognitionId)
                            .param("reactionType", "LIKE"))
                    .andExpect(status().isOk());

            verify(recognitionService).addReaction(recognitionId, userId, RecognitionReaction.ReactionType.LIKE);
        }

        @Test
        @DisplayName("Should add CELEBRATE reaction to recognition")
        void shouldAddCelebrateReaction() throws Exception {
            doNothing().when(recognitionService).addReaction(
                    recognitionId, userId, RecognitionReaction.ReactionType.CELEBRATE);

            mockMvc.perform(post("/api/v1/recognition/{id}/react", recognitionId)
                            .param("reactionType", "CELEBRATE"))
                    .andExpect(status().isOk());

            verify(recognitionService).addReaction(
                    recognitionId, userId, RecognitionReaction.ReactionType.CELEBRATE);
        }

        @Test
        @DisplayName("Should remove reaction from recognition")
        void shouldRemoveReaction() throws Exception {
            doNothing().when(recognitionService).removeReaction(
                    recognitionId, userId, RecognitionReaction.ReactionType.LIKE);

            mockMvc.perform(delete("/api/v1/recognition/{id}/react", recognitionId)
                            .param("reactionType", "LIKE"))
                    .andExpect(status().isOk());

            verify(recognitionService).removeReaction(
                    recognitionId, userId, RecognitionReaction.ReactionType.LIKE);
        }
    }

    @Nested
    @DisplayName("Leaderboard and Points Tests")
    class LeaderboardAndPointsTests {

        @Test
        @DisplayName("Should get leaderboard with default limit")
        void shouldGetLeaderboardWithDefaultLimit() throws Exception {
            EmployeePoints points = new EmployeePoints();
            points.setId(UUID.randomUUID());

            when(recognitionService.getLeaderboard(10))
                    .thenReturn(Collections.singletonList(points));

            mockMvc.perform(get("/api/v1/recognition/leaderboard"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(recognitionService).getLeaderboard(10);
        }

        @Test
        @DisplayName("Should get leaderboard with custom limit")
        void shouldGetLeaderboardWithCustomLimit() throws Exception {
            List<EmployeePoints> pointsList = new ArrayList<>();
            for (int i = 0; i < 5; i++) {
                EmployeePoints ep = new EmployeePoints();
                ep.setId(UUID.randomUUID());
                pointsList.add(ep);
            }

            when(recognitionService.getLeaderboard(5)).thenReturn(pointsList);

            mockMvc.perform(get("/api/v1/recognition/leaderboard")
                            .param("limit", "5"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(5));

            verify(recognitionService).getLeaderboard(5);
        }

        @Test
        @DisplayName("Should get my points")
        void shouldGetMyPoints() throws Exception {
            EmployeePoints myPoints = new EmployeePoints();
            myPoints.setId(UUID.randomUUID());

            when(recognitionService.getEmployeePoints(userId)).thenReturn(myPoints);

            mockMvc.perform(get("/api/v1/recognition/points"))
                    .andExpect(status().isOk());

            verify(recognitionService).getEmployeePoints(userId);
        }
    }

    @Nested
    @DisplayName("Badges and Milestones Tests")
    class BadgesAndMilestonesTests {

        @Test
        @DisplayName("Should get active badges")
        void shouldGetActiveBadges() throws Exception {
            RecognitionBadge badge = new RecognitionBadge();
            badge.setId(UUID.randomUUID());

            when(recognitionService.getActiveBadges())
                    .thenReturn(Collections.singletonList(badge));

            mockMvc.perform(get("/api/v1/recognition/badges"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(recognitionService).getActiveBadges();
        }

        @Test
        @DisplayName("Should get upcoming milestones with default days")
        void shouldGetUpcomingMilestones() throws Exception {
            Milestone milestone = new Milestone();
            milestone.setId(UUID.randomUUID());

            when(recognitionService.getUpcomingMilestones(7))
                    .thenReturn(Collections.singletonList(milestone));

            mockMvc.perform(get("/api/v1/recognition/milestones/upcoming"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(1));

            verify(recognitionService).getUpcomingMilestones(7);
        }

        @Test
        @DisplayName("Should get upcoming milestones with custom days")
        void shouldGetUpcomingMilestonesWithCustomDays() throws Exception {
            when(recognitionService.getUpcomingMilestones(30))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/recognition/milestones/upcoming")
                            .param("days", "30"))
                    .andExpect(status().isOk());

            verify(recognitionService).getUpcomingMilestones(30);
        }
    }

    @Nested
    @DisplayName("Dashboard and Enum Tests")
    class DashboardAndEnumTests {

        @Test
        @DisplayName("Should get recognition dashboard")
        void shouldGetDashboard() throws Exception {
            EngagementDashboardResponse dashboard = new EngagementDashboardResponse();

            when(recognitionService.getDashboard()).thenReturn(dashboard);

            mockMvc.perform(get("/api/v1/recognition/dashboard"))
                    .andExpect(status().isOk());

            verify(recognitionService).getDashboard();
        }

        @Test
        @DisplayName("Should get recognition types enum")
        void shouldGetRecognitionTypes() throws Exception {
            mockMvc.perform(get("/api/v1/recognition/types"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }

        @Test
        @DisplayName("Should get recognition categories enum")
        void shouldGetRecognitionCategories() throws Exception {
            mockMvc.perform(get("/api/v1/recognition/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }
    }

    @Nested
    @DisplayName("Permission Annotation Tests")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("giveRecognition should have RECOGNITION_CREATE permission")
        void giveRecognitionShouldRequireRecognitionCreate() throws Exception {
            var method = RecognitionController.class.getMethod(
                    "giveRecognition", RecognitionRequest.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "giveRecognition must have @RequiresPermission");
            Assertions.assertEquals(Permission.RECOGNITION_CREATE, annotation.value()[0]);
        }

        @Test
        @DisplayName("getRecognition should have RECOGNITION_VIEW permission")
        void getRecognitionShouldRequireRecognitionView() throws Exception {
            var method = RecognitionController.class.getMethod("getRecognition", UUID.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getRecognition must have @RequiresPermission");
            Assertions.assertEquals(Permission.RECOGNITION_VIEW, annotation.value()[0]);
        }

        @Test
        @DisplayName("getLeaderboard should have RECOGNITION_VIEW permission")
        void getLeaderboardShouldRequireRecognitionView() throws Exception {
            var method = RecognitionController.class.getMethod("getLeaderboard", int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getLeaderboard must have @RequiresPermission");
            Assertions.assertEquals(Permission.RECOGNITION_VIEW, annotation.value()[0]);
        }

        @Test
        @DisplayName("getUpcomingMilestones should have MILESTONE_VIEW permission")
        void getUpcomingMilestonesShouldRequireMilestoneView() throws Exception {
            var method = RecognitionController.class.getMethod("getUpcomingMilestones", int.class);
            RequiresPermission annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation, "getUpcomingMilestones must have @RequiresPermission");
            Assertions.assertEquals(Permission.MILESTONE_VIEW, annotation.value()[0]);
        }
    }
}
