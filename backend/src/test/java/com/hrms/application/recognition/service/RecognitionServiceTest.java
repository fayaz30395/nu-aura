package com.hrms.application.recognition.service;

import com.hrms.api.recognition.dto.RecognitionRequest;
import com.hrms.api.recognition.dto.RecognitionResponse;
import com.hrms.api.wall.dto.WallPostResponse;
import com.hrms.application.wall.service.WallService;
import com.hrms.common.exception.BusinessException;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.recognition.*;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.recognition.repository.*;
import com.hrms.infrastructure.wall.repository.PostReactionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import com.hrms.domain.employee.Employee;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
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
}
