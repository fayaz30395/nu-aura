package com.hrms.application.announcement.service;

import com.hrms.api.announcement.dto.AnnouncementDto;
import com.hrms.api.announcement.dto.CreateAnnouncementRequest;
import com.hrms.application.common.service.ContentViewService;
import com.hrms.application.wall.service.WallService;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.domain.announcement.Announcement;
import com.hrms.domain.announcement.AnnouncementRead;
import com.hrms.domain.employee.Employee;
import com.hrms.infrastructure.announcement.repository.AnnouncementRepository;
import com.hrms.infrastructure.announcement.repository.AnnouncementReadRepository;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import com.hrms.infrastructure.wall.repository.PostReactionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("AnnouncementService Tests")
class AnnouncementServiceTest {

    private static MockedStatic<TenantContext> tenantContextMock;
    private static MockedStatic<SecurityContext> securityContextMock;
    @Mock
    private AnnouncementRepository announcementRepository;
    @Mock
    private AnnouncementReadRepository announcementReadRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private ContentViewService contentViewService;
    @Mock
    private WallService wallService;
    @Mock
    private PostReactionRepository postReactionRepository;
    @InjectMocks
    private AnnouncementService announcementService;
    private UUID tenantId;
    private UUID userId;
    private UUID employeeId;

    @BeforeAll
    static void setUpClass() {
        tenantContextMock = mockStatic(TenantContext.class);
        securityContextMock = mockStatic(SecurityContext.class);
    }

    @AfterAll
    static void tearDownClass() {
        tenantContextMock.close();
        securityContextMock.close();
    }

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
        securityContextMock.when(SecurityContext::getCurrentUserId).thenReturn(userId);
        securityContextMock.when(SecurityContext::getCurrentEmployeeId).thenReturn(employeeId);
    }

    private Announcement buildAnnouncement() {
        Announcement ann = new Announcement();
        ann.setId(UUID.randomUUID());
        ann.setTitle("Test Announcement");
        ann.setContent("Content");
        ann.setCategory(Announcement.AnnouncementCategory.GENERAL);
        ann.setPriority(Announcement.AnnouncementPriority.MEDIUM);
        ann.setTargetAudience(Announcement.TargetAudience.ALL_EMPLOYEES);
        ann.setPublishedAt(LocalDateTime.now());
        ann.setPublishedByName("Admin");
        ann.setPublishedBy(userId);
        ann.setReadCount(0);
        ann.setAcceptedCount(0);
        ann.setTenantId(tenantId);
        return ann;
    }

    // ==================== createAnnouncement ====================

    @Test
    @DisplayName("getPinnedAnnouncements should return pinned list")
    void shouldGetPinnedAnnouncements() {
        Announcement ann = buildAnnouncement();
        ann.setIsPinned(true);

        when(announcementRepository.findPinnedAnnouncements(eq(tenantId), any(LocalDateTime.class)))
                .thenReturn(List.of(ann));

        List<AnnouncementDto> result = announcementService.getPinnedAnnouncements();

        assertThat(result).hasSize(1);
    }

    // ==================== getPinnedAnnouncements ====================

    @Test
    @DisplayName("markAsRead should save read record when not already read")
    void shouldMarkAsRead() {
        UUID announcementId = UUID.randomUUID();

        when(announcementReadRepository.existsByAnnouncementIdAndEmployeeIdAndTenantId(
                announcementId, employeeId, tenantId)).thenReturn(false);

        Announcement ann = buildAnnouncement();
        ann.setId(announcementId);
        when(announcementRepository.findByIdAndTenantId(announcementId, tenantId))
                .thenReturn(Optional.of(ann));
        when(announcementReadRepository.save(any(AnnouncementRead.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(announcementRepository.save(any(Announcement.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        announcementService.markAsRead(announcementId, employeeId);

        verify(announcementReadRepository).save(any(AnnouncementRead.class));
    }

    // ==================== markAsRead ====================

    @Test
    @DisplayName("markAsRead should not duplicate when already read")
    void shouldNotDuplicateRead() {
        UUID announcementId = UUID.randomUUID();

        when(announcementReadRepository.existsByAnnouncementIdAndEmployeeIdAndTenantId(
                announcementId, employeeId, tenantId)).thenReturn(true);

        announcementService.markAsRead(announcementId, employeeId);

        verify(announcementReadRepository, never()).save(any(AnnouncementRead.class));
    }

    @Test
    @DisplayName("deleteAnnouncement should delete when found")
    void shouldDeleteAnnouncement() {
        UUID announcementId = UUID.randomUUID();
        Announcement ann = buildAnnouncement();
        ann.setId(announcementId);

        when(announcementRepository.findByIdAndTenantId(announcementId, tenantId))
                .thenReturn(Optional.of(ann));

        announcementService.deleteAnnouncement(announcementId);

        verify(announcementRepository).delete(ann);
    }

    // ==================== deleteAnnouncement ====================

    @Test
    @DisplayName("deleteAnnouncement should throw when not found")
    void shouldThrowWhenDeleteNotFound() {
        UUID announcementId = UUID.randomUUID();
        when(announcementRepository.findByIdAndTenantId(announcementId, tenantId))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> announcementService.deleteAnnouncement(announcementId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Nested
    @DisplayName("createAnnouncement")
    class CreateAnnouncementTests {

        @Test
        @DisplayName("Should create announcement with defaults")
        void shouldCreateAnnouncement() {
            CreateAnnouncementRequest request = CreateAnnouncementRequest.builder()
                    .title("Office Closure Notice")
                    .content("Office will be closed on Friday")
                    .build();

            Employee employee = new Employee();
            employee.setFirstName("John");
            employee.setLastName("Doe");
            when(employeeRepository.findByIdAndTenantId(employeeId, tenantId))
                    .thenReturn(Optional.of(employee));

            when(announcementRepository.save(any(Announcement.class))).thenAnswer(inv -> {
                Announcement saved = inv.getArgument(0);
                saved.setId(UUID.randomUUID());
                saved.setReadCount(0);
                saved.setAcceptedCount(0);
                return saved;
            });

            AnnouncementDto result = announcementService.createAnnouncement(request);

            assertThat(result).isNotNull();
            verify(announcementRepository).save(argThat(a ->
                    a.getTitle().equals("Office Closure Notice") &&
                            a.getCategory() == Announcement.AnnouncementCategory.GENERAL &&
                            a.getPriority() == Announcement.AnnouncementPriority.MEDIUM));
        }
    }
}
