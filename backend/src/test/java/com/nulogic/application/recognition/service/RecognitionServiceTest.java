package com.nulogic.application.recognition.service;

import com.nulogic.api.recognition.dto.RecognitionRequest;
import com.nulogic.api.recognition.dto.RecognitionResponse;
import com.nulogic.api.wall.dto.WallPostResponse;
import com.nulogic.application.wall.service.WallService;
import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.security.SecurityContext;
import com.nulogic.common.security.TenantContext;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.employee.Employee;
import com.nulogic.domain.recognition.EmployeePoints;
import com.nulogic.domain.recognition.Recognition;
import com.nulogic.infrastructure.employee.repository.EmployeeRepository;
import com.nulogic.infrastructure.recognition.repository.*;
import com.nulogic.infrastructure.wall.repository.PostReactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("RecognitionService Tests")
class RecognitionServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    @Mock
    private RecognitionRepository recognitionRepository;
    @Mock
    private RecognitionBadgeRepository badgeRepository;
    @Mock
    private EmployeePointsRepository pointsRepository;
    @Mock
    private MilestoneRepository milestoneRepository;
    @Mock
    private RecognitionReactionRepository reactionRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private WallService wallService;
    @Mock
    private PostReactionRepository postReactionRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private RecognitionService recognitionService;
    private UUID tenantId;
    private UUID giverId;
    private UUID receiverId;
    private UUID recognitionId;

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
        giverId = UUID.randomUUID();
        receiverId = UUID.randomUUID();
        recognitionId = UUID.randomUUID();

        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(tenantId);
        when(tenantTimeService.now(tenantId)).thenReturn(LocalDateTime.of(2026, 1, 15, 9, 30));

        // Default: mock giver points so all tests that call giveRecognition don't NPE
        EmployeePoints giverPoints = new EmployeePoints();
        giverPoints.setEmployeeId(giverId);
        giverPoints.setTotalPointsEarned(0);
        giverPoints.setTotalPointsRedeemed(0);
        giverPoints.setCurrentBalance(0);
        giverPoints.setRecognitionsGiven(0);
        giverPoints.setRecognitionsReceived(0);
        when(pointsRepository.findByEmployeeIdAndTenantId(giverId, tenantId))
                .thenReturn(Optional.of(giverPoints));
    }

    @AfterEach
    void tearDown() {
        SecurityContext.clear();
    }

    // ==================== giveRecognition ====================

    @Test
    @DisplayName("giveRecognition - creates recognition successfully")
    void giveRecognition_success() {
        RecognitionRequest request = new RecognitionRequest();
        request.setReceiverId(receiverId);
        request.setType(Recognition.RecognitionType.KUDOS);
        request.setTitle("Great work");
        request.setMessage("Thanks for the excellent effort");
        request.setPoints(50);
        request.setIsPublic(true);

        Recognition savedRecognition = Recognition.builder()
                .giverId(giverId)
                .receiverId(receiverId)
                .type(Recognition.RecognitionType.KUDOS)
                .title("Great work")
                .message("Thanks for the excellent effort")
                .pointsAwarded(50)
                .isPublic(true)
                .isApproved(true)
                .build();
        savedRecognition.setId(recognitionId);
        savedRecognition.setTenantId(tenantId);

        when(recognitionRepository.save(any(Recognition.class))).thenReturn(savedRecognition);

        // Mock employee lookups for enrichment
        Employee giverEmployee = new Employee();
        giverEmployee.setId(giverId);
        giverEmployee.setFirstName("John");
        giverEmployee.setLastName("Doe");
        when(employeeRepository.findByIdAndTenantId(giverId, tenantId)).thenReturn(Optional.of(giverEmployee));

        Employee receiverEmployee = new Employee();
        receiverEmployee.setId(receiverId);
        receiverEmployee.setFirstName("Jane");
        receiverEmployee.setLastName("Smith");
        when(employeeRepository.findByIdAndTenantId(receiverId, tenantId)).thenReturn(Optional.of(receiverEmployee));

        WallPostResponse wallPost = new WallPostResponse();
        wallPost.setId(UUID.randomUUID());
        when(wallService.createPost(any(), eq(giverId))).thenReturn(wallPost);

        EmployeePoints receiverPoints = new EmployeePoints();
        receiverPoints.setEmployeeId(receiverId);
        receiverPoints.setTotalPointsEarned(0);
        receiverPoints.setTotalPointsRedeemed(0);
        when(pointsRepository.findByEmployeeIdAndTenantId(receiverId, tenantId))
                .thenReturn(Optional.of(receiverPoints));

        RecognitionResponse result = recognitionService.giveRecognition(giverId, request);

        assertThat(result).isNotNull();
        verify(recognitionRepository, atLeastOnce()).save(any(Recognition.class));
    }

    @Test
    @DisplayName("giveRecognition - rejects self-recognition")
    void giveRecognition_selfRecognition() {
        RecognitionRequest request = new RecognitionRequest();
        request.setReceiverId(giverId); // Same as giver

        assertThatThrownBy(() -> recognitionService.giveRecognition(giverId, request))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("cannot recognize yourself");
    }

    @Test
    @DisplayName("giveRecognition - handles wall post failure gracefully")
    void giveRecognition_wallPostFailure() {
        RecognitionRequest request = new RecognitionRequest();
        request.setReceiverId(receiverId);
        request.setType(Recognition.RecognitionType.KUDOS);
        request.setTitle("Great work");
        request.setIsPublic(true);
        request.setPoints(0);

        Recognition savedRecognition = Recognition.builder()
                .giverId(giverId)
                .receiverId(receiverId)
                .type(Recognition.RecognitionType.KUDOS)
                .title("Great work")
                .pointsAwarded(0)
                .isPublic(true)
                .isApproved(true)
                .build();
        savedRecognition.setId(recognitionId);
        savedRecognition.setTenantId(tenantId);

        when(recognitionRepository.save(any(Recognition.class))).thenReturn(savedRecognition);
        when(wallService.createPost(any(), any())).thenThrow(new RuntimeException("Wall service unavailable"));

        // Should not throw - wall post failure is non-fatal
        RecognitionResponse result = recognitionService.giveRecognition(giverId, request);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("giveRecognition - private recognition skips wall post")
    void giveRecognition_privateSkipsWallPost() {
        RecognitionRequest request = new RecognitionRequest();
        request.setReceiverId(receiverId);
        request.setType(Recognition.RecognitionType.KUDOS);
        request.setTitle("Good job");
        request.setIsPublic(false);
        request.setPoints(0);

        Recognition savedRecognition = Recognition.builder()
                .giverId(giverId)
                .receiverId(receiverId)
                .type(Recognition.RecognitionType.KUDOS)
                .title("Good job")
                .pointsAwarded(0)
                .isPublic(false)
                .isApproved(true)
                .build();
        savedRecognition.setId(recognitionId);
        savedRecognition.setTenantId(tenantId);

        when(recognitionRepository.save(any(Recognition.class))).thenReturn(savedRecognition);

        recognitionService.giveRecognition(giverId, request);

        verify(wallService, never()).createPost(any(), any());
    }

    @Test
    @DisplayName("getPublicFeed - batch enriches names and reactions")
    void getPublicFeed_batchEnrichesNamesAndReactions() {
        UUID secondGiverId = UUID.randomUUID();
        UUID secondReceiverId = UUID.randomUUID();
        UUID firstWallPostId = UUID.randomUUID();
        UUID secondWallPostId = UUID.randomUUID();
        SecurityContext.setCurrentUser(UUID.randomUUID(), giverId, Set.of(), Map.of());

        Recognition first = Recognition.builder()
                .giverId(giverId)
                .receiverId(receiverId)
                .type(Recognition.RecognitionType.KUDOS)
                .title("Great work")
                .isPublic(true)
                .isAnonymous(false)
                .isApproved(true)
                .wallPostId(firstWallPostId)
                .build();
        first.setId(UUID.randomUUID());
        first.setTenantId(tenantId);

        Recognition second = Recognition.builder()
                .giverId(secondGiverId)
                .receiverId(secondReceiverId)
                .type(Recognition.RecognitionType.APPRECIATION)
                .title("Helpful")
                .isPublic(true)
                .isAnonymous(false)
                .isApproved(true)
                .wallPostId(secondWallPostId)
                .build();
        second.setId(UUID.randomUUID());
        second.setTenantId(tenantId);

        PageRequest pageable = PageRequest.of(0, 10);
        when(recognitionRepository.findByTenantIdAndIsPublicTrueAndIsApprovedTrue(tenantId, pageable))
                .thenReturn(new PageImpl<>(List.of(first, second), pageable, 2));
        when(employeeRepository.findFullNamesByIdsAndTenantId(any(), eq(tenantId)))
                .thenReturn(List.of(
                        new Object[]{giverId, "John Doe"},
                        new Object[]{receiverId, "Jane Smith"},
                        new Object[]{secondGiverId, "Asha Rao"},
                        new Object[]{secondReceiverId, "Dev Kumar"}));
        when(postReactionRepository.findPostIdsWithUserReactionForTenant(anyList(), eq(giverId), eq(tenantId)))
                .thenReturn(List.of(firstWallPostId));

        Page<RecognitionResponse> result = recognitionService.getPublicFeed(pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getGiverName()).isEqualTo("John Doe");
        assertThat(result.getContent().get(0).getReceiverName()).isEqualTo("Jane Smith");
        assertThat(result.getContent().get(0).getHasReacted()).isTrue();
        assertThat(result.getContent().get(1).getGiverName()).isEqualTo("Asha Rao");
        assertThat(result.getContent().get(1).getReceiverName()).isEqualTo("Dev Kumar");
        assertThat(result.getContent().get(1).getHasReacted()).isFalse();
        verify(employeeRepository, times(1)).findFullNamesByIdsAndTenantId(any(), eq(tenantId));
        verify(employeeRepository, never()).findByIdAndTenantId(any(), any());
        verify(postReactionRepository, times(1))
                .findPostIdsWithUserReactionForTenant(anyList(), eq(giverId), eq(tenantId));
        verify(postReactionRepository, never()).findByPostIdAndEmployeeId(any(), any());
    }
}
