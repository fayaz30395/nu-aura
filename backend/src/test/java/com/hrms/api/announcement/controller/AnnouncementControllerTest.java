package com.hrms.api.announcement.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.announcement.dto.AnnouncementDto;
import com.hrms.api.announcement.dto.CreateAnnouncementRequest;
import com.hrms.application.announcement.service.AnnouncementService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.announcement.Announcement.AnnouncementCategory;
import com.hrms.domain.announcement.Announcement.AnnouncementPriority;
import com.hrms.domain.announcement.Announcement.TargetAudience;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnnouncementController.class)
@ContextConfiguration(classes = {AnnouncementController.class, GlobalExceptionHandler.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("AnnouncementController Unit Tests")
class AnnouncementControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private AnnouncementService announcementService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    @MockitoBean
    private MeterRegistry meterRegistry;

    private static final String BASE_URL = "/api/v1/announcements";

    private UUID announcementId;
    private UUID employeeId;
    private AnnouncementDto announcementDto;
    private CreateAnnouncementRequest createRequest;

    @BeforeEach
    void setUp() {
        announcementId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        announcementDto = AnnouncementDto.builder()
                .id(announcementId)
                .title("Company Holiday Notice")
                .content("The office will be closed on Friday.")
                .category(AnnouncementCategory.GENERAL.name())
                .priority(AnnouncementPriority.HIGH.name())
                .status("PUBLISHED")
                .targetAudience(TargetAudience.ALL_EMPLOYEES.name())
                .isPinned(false)
                .readCount(0)
                .createdAt(LocalDateTime.now())
                .build();

        createRequest = CreateAnnouncementRequest.builder()
                .title("Company Holiday Notice")
                .content("The office will be closed on Friday.")
                .category(AnnouncementCategory.GENERAL)
                .priority(AnnouncementPriority.HIGH)
                .targetAudience(TargetAudience.ALL_EMPLOYEES)
                .build();
    }

    // ===================== Create Announcement Tests =====================

    @Nested
    @DisplayName("POST /announcements — Create announcement")
    class CreateAnnouncementTests {

        @Test
        @DisplayName("Should create announcement successfully")
        void shouldCreateAnnouncementSuccessfully() throws Exception {
            when(announcementService.createAnnouncement(any(CreateAnnouncementRequest.class)))
                    .thenReturn(announcementDto);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(createRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(announcementId.toString()))
                    .andExpect(jsonPath("$.title").value("Company Holiday Notice"))
                    .andExpect(jsonPath("$.status").value("PUBLISHED"));

            verify(announcementService).createAnnouncement(any(CreateAnnouncementRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when title is missing")
        void shouldReturn400WhenTitleMissing() throws Exception {
            CreateAnnouncementRequest invalid = CreateAnnouncementRequest.builder()
                    .content("Content without title")
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when content is missing")
        void shouldReturn400WhenContentMissing() throws Exception {
            CreateAnnouncementRequest invalid = CreateAnnouncementRequest.builder()
                    .title("Title without content")
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when title exceeds max length")
        void shouldReturn400WhenTitleTooLong() throws Exception {
            CreateAnnouncementRequest invalid = CreateAnnouncementRequest.builder()
                    .title("T".repeat(256))  // exceeds 255 chars
                    .content("Valid content")
                    .build();

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should create pinned announcement")
        void shouldCreatePinnedAnnouncement() throws Exception {
            CreateAnnouncementRequest pinnedRequest = CreateAnnouncementRequest.builder()
                    .title("Critical Security Update")
                    .content("Please update your passwords immediately.")
                    .priority(AnnouncementPriority.CRITICAL)
                    .isPinned(true)
                    .targetAudience(TargetAudience.ALL_EMPLOYEES)
                    .build();

            AnnouncementDto pinned = announcementDto.toBuilder()
                    .isPinned(true)
                    .priority(AnnouncementPriority.CRITICAL.name())
                    .build();

            when(announcementService.createAnnouncement(any())).thenReturn(pinned);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(pinnedRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.isPinned").value(true));
        }

        @Test
        @DisplayName("Should create announcement with scheduled publish date")
        void shouldCreateAnnouncementWithScheduledPublishDate() throws Exception {
            CreateAnnouncementRequest scheduled = CreateAnnouncementRequest.builder()
                    .title("Upcoming Town Hall")
                    .content("Join us for the quarterly town hall.")
                    .publishedAt(LocalDateTime.now().plusDays(2))
                    .build();

            when(announcementService.createAnnouncement(any())).thenReturn(announcementDto);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(scheduled)))
                    .andExpect(status().isCreated());
        }
    }

    // ===================== Update Announcement Tests =====================

    @Nested
    @DisplayName("PUT /announcements/{announcementId} — Update announcement")
    class UpdateAnnouncementTests {

        @Test
        @DisplayName("Should update announcement successfully")
        void shouldUpdateAnnouncementSuccessfully() throws Exception {
            CreateAnnouncementRequest updateRequest = CreateAnnouncementRequest.builder()
                    .title("Updated Holiday Notice")
                    .content("Updated content.")
                    .build();

            AnnouncementDto updated = announcementDto.toBuilder()
                    .title("Updated Holiday Notice")
                    .content("Updated content.")
                    .build();

            when(announcementService.updateAnnouncement(eq(announcementId), any()))
                    .thenReturn(updated);

            mockMvc.perform(put(BASE_URL + "/{announcementId}", announcementId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated Holiday Notice"));

            verify(announcementService).updateAnnouncement(eq(announcementId), any());
        }
    }

    // ===================== Get Announcements Tests =====================

    @Nested
    @DisplayName("GET /announcements — Get all announcements")
    class GetAllAnnouncementsTests {

        @Test
        @DisplayName("Should return paginated list of announcements")
        void shouldReturnPaginatedAnnouncements() throws Exception {
            Page<AnnouncementDto> page = new PageImpl<>(
                    List.of(announcementDto), Pageable.ofSize(20), 1
            );

            when(announcementService.getAllAnnouncements(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.content[0].title").value("Company Holiday Notice"));

            verify(announcementService).getAllAnnouncements(any(Pageable.class));
        }

        @Test
        @DisplayName("Should return empty page when no announcements")
        void shouldReturnEmptyPageWhenNoAnnouncements() throws Exception {
            Page<AnnouncementDto> emptyPage = new PageImpl<>(List.of(), Pageable.ofSize(20), 0);

            when(announcementService.getAllAnnouncements(any(Pageable.class))).thenReturn(emptyPage);

            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));
        }
    }

    @Nested
    @DisplayName("GET /announcements/active — Get active announcements")
    class GetActiveAnnouncementsTests {

        @Test
        @DisplayName("Should return active announcements for employee")
        void shouldReturnActiveAnnouncementsForEmployee() throws Exception {
            Page<AnnouncementDto> page = new PageImpl<>(
                    List.of(announcementDto), Pageable.ofSize(20), 1
            );

            when(announcementService.getActiveAnnouncements(eq(employeeId), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/active")
                            .param("employeeId", employeeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(announcementService).getActiveAnnouncements(eq(employeeId), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("GET /announcements/pinned — Get pinned announcements")
    class GetPinnedAnnouncementsTests {

        @Test
        @DisplayName("Should return pinned announcements")
        void shouldReturnPinnedAnnouncements() throws Exception {
            AnnouncementDto pinned = announcementDto.toBuilder().isPinned(true).build();

            when(announcementService.getPinnedAnnouncements()).thenReturn(List.of(pinned));

            mockMvc.perform(get(BASE_URL + "/pinned"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].isPinned").value(true));

            verify(announcementService).getPinnedAnnouncements();
        }

        @Test
        @DisplayName("Should return empty list when no pinned announcements")
        void shouldReturnEmptyListWhenNoPinnedAnnouncements() throws Exception {
            when(announcementService.getPinnedAnnouncements()).thenReturn(Collections.emptyList());

            mockMvc.perform(get(BASE_URL + "/pinned"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("GET /announcements/{announcementId} — Get announcement by ID")
    class GetAnnouncementByIdTests {

        @Test
        @DisplayName("Should return announcement by ID without employee context")
        void shouldReturnAnnouncementByIdWithoutEmployeeContext() throws Exception {
            when(announcementService.getAnnouncementById(announcementId, null))
                    .thenReturn(announcementDto);

            mockMvc.perform(get(BASE_URL + "/{announcementId}", announcementId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(announcementId.toString()))
                    .andExpect(jsonPath("$.title").value("Company Holiday Notice"));

            verify(announcementService).getAnnouncementById(announcementId, null);
        }

        @Test
        @DisplayName("Should return announcement with read status for employee")
        void shouldReturnAnnouncementWithReadStatusForEmployee() throws Exception {
            AnnouncementDto withReadStatus = announcementDto.toBuilder()
                    .isRead(true)
                    .build();

            when(announcementService.getAnnouncementById(announcementId, employeeId))
                    .thenReturn(withReadStatus);

            mockMvc.perform(get(BASE_URL + "/{announcementId}", announcementId)
                            .param("employeeId", employeeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.isRead").value(true));

            verify(announcementService).getAnnouncementById(announcementId, employeeId);
        }
    }

    // ===================== Target Audience Tests =====================

    @Nested
    @DisplayName("Target audience filtering")
    class TargetAudienceTests {

        @Test
        @DisplayName("Should create announcement targeting all employees")
        void shouldCreateAnnouncementTargetingAll() throws Exception {
            CreateAnnouncementRequest request = CreateAnnouncementRequest.builder()
                    .title("Company-wide Announcement")
                    .content("This applies to everyone.")
                    .targetAudience(TargetAudience.ALL_EMPLOYEES)
                    .build();

            when(announcementService.createAnnouncement(any())).thenReturn(announcementDto);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());

            verify(announcementService).createAnnouncement(
                    argThat(req -> req.getTargetAudience() == TargetAudience.ALL_EMPLOYEES));
        }

        @Test
        @DisplayName("Should create department-targeted announcement")
        void shouldCreateDepartmentTargetedAnnouncement() throws Exception {
            Set<UUID> deptIds = Set.of(UUID.randomUUID(), UUID.randomUUID());
            CreateAnnouncementRequest request = CreateAnnouncementRequest.builder()
                    .title("Engineering Update")
                    .content("Only for Engineering dept.")
                    .targetAudience(TargetAudience.SPECIFIC_DEPARTMENTS)
                    .targetDepartmentIds(deptIds)
                    .build();

            when(announcementService.createAnnouncement(any())).thenReturn(announcementDto);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }
    }

    // ===================== Mark Read / Accept Tests =====================

    @Nested
    @DisplayName("Mark read and accept actions")
    class MarkReadAndAcceptTests {

        @Test
        @DisplayName("Should mark announcement as read")
        void shouldMarkAnnouncementAsRead() throws Exception {
            doNothing().when(announcementService).markAsRead(announcementId, employeeId);

            mockMvc.perform(post(BASE_URL + "/{announcementId}/read", announcementId)
                            .param("employeeId", employeeId.toString()))
                    .andExpect(status().isOk());

            verify(announcementService).markAsRead(announcementId, employeeId);
        }

        @Test
        @DisplayName("Should accept announcement when requires acceptance")
        void shouldAcceptAnnouncement() throws Exception {
            doNothing().when(announcementService).acceptAnnouncement(announcementId, employeeId);

            mockMvc.perform(post(BASE_URL + "/{announcementId}/accept", announcementId)
                            .param("employeeId", employeeId.toString()))
                    .andExpect(status().isOk());

            verify(announcementService).acceptAnnouncement(announcementId, employeeId);
        }
    }

    // ===================== Delete Announcement Tests =====================

    @Nested
    @DisplayName("DELETE /announcements/{announcementId} — Delete announcement")
    class DeleteAnnouncementTests {

        @Test
        @DisplayName("Should delete announcement successfully")
        void shouldDeleteAnnouncementSuccessfully() throws Exception {
            doNothing().when(announcementService).deleteAnnouncement(announcementId);

            mockMvc.perform(delete(BASE_URL + "/{announcementId}", announcementId))
                    .andExpect(status().isNoContent());

            verify(announcementService).deleteAnnouncement(announcementId);
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createAnnouncement should require SYSTEM_ADMIN permission")
        void createAnnouncementShouldRequireSystemAdmin() throws Exception {
            var method = AnnouncementController.class.getMethod(
                    "createAnnouncement", CreateAnnouncementRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.SYSTEM_ADMIN));
        }

        @Test
        @DisplayName("updateAnnouncement should require SYSTEM_ADMIN permission")
        void updateAnnouncementShouldRequireSystemAdmin() throws Exception {
            var method = AnnouncementController.class.getMethod(
                    "updateAnnouncement", UUID.class, CreateAnnouncementRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.SYSTEM_ADMIN));
        }

        @Test
        @DisplayName("getAllAnnouncements should require EMPLOYEE_VIEW_SELF")
        void getAllAnnouncementsShouldRequireEmployeeViewSelf() throws Exception {
            var method = AnnouncementController.class.getMethod(
                    "getAllAnnouncements", Pageable.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.EMPLOYEE_VIEW_SELF));
        }

        @Test
        @DisplayName("deleteAnnouncement should require SYSTEM_ADMIN permission")
        void deleteAnnouncementShouldRequireSystemAdmin() throws Exception {
            var method = AnnouncementController.class.getMethod(
                    "deleteAnnouncement", UUID.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()).contains(Permission.SYSTEM_ADMIN));
        }
    }
}
