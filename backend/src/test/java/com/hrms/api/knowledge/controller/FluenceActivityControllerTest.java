package com.hrms.api.knowledge.controller;

import com.hrms.api.knowledge.dto.FluenceActivityDto;
import com.hrms.application.knowledge.service.FluenceActivityService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.SecurityContext;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import com.hrms.domain.knowledge.FluenceActivity;
import com.hrms.infrastructure.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FluenceActivityController.class)
@ContextConfiguration(classes = {FluenceActivityController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("FluenceActivityController Unit Tests")
class FluenceActivityControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FluenceActivityService fluenceActivityService;

    @MockitoBean
    private EmployeeRepository employeeRepository;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID tenantId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
    }

    @Nested
    @DisplayName("Activity Feed Tests")
    class ActivityFeedTests {

        @Test
        @DisplayName("Should get activity feed paginated")
        void shouldGetActivityFeed() throws Exception {
            Page<FluenceActivity> emptyPage = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 20), 0);
            when(fluenceActivityService.getActivityFeed(eq(tenantId), any(Pageable.class)))
                    .thenReturn(emptyPage);
            when(employeeRepository.findAllById(anySet())).thenReturn(List.of());

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/activities")
                                .param("page", "0")
                                .param("size", "20"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.content.length()").value(0));
            }

            verify(fluenceActivityService).getActivityFeed(eq(tenantId), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get activity feed filtered by content type")
        void shouldGetActivityFeedByContentType() throws Exception {
            Page<FluenceActivity> emptyPage = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 20), 0);
            when(fluenceActivityService.getActivityFeedByType(eq(tenantId), eq("wiki"), any(Pageable.class)))
                    .thenReturn(emptyPage);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/fluence/activities")
                                .param("contentType", "wiki"))
                        .andExpect(status().isOk());
            }

            verify(fluenceActivityService).getActivityFeedByType(eq(tenantId), eq("wiki"), any(Pageable.class));
        }

        @Test
        @DisplayName("Should get current user's activity feed")
        void shouldGetMyActivity() throws Exception {
            Page<FluenceActivity> emptyPage = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 20), 0);
            when(fluenceActivityService.getUserActivity(eq(tenantId), eq(userId), any(Pageable.class)))
                    .thenReturn(emptyPage);
            when(employeeRepository.findAllById(anySet())).thenReturn(List.of());

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class);
                 MockedStatic<SecurityContext> sc = mockStatic(SecurityContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
                sc.when(SecurityContext::getCurrentUserId).thenReturn(userId);

                mockMvc.perform(get("/api/v1/fluence/activities/me"))
                        .andExpect(status().isOk());
            }

            verify(fluenceActivityService).getUserActivity(eq(tenantId), eq(userId), any(Pageable.class));
        }
    }
}
