package com.hrms.api.employee.controller;

import com.hrms.api.employee.dto.TalentProfileResponse;
import com.hrms.application.employee.service.TalentProfileService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantContext;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TalentProfileController.class)
@ContextConfiguration(classes = {TalentProfileController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TalentProfileController Unit Tests")
class TalentProfileControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TalentProfileService talentProfileService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID employeeId;
    private UUID tenantId;
    private TalentProfileResponse talentProfile;

    @BeforeEach
    void setUp() {
        employeeId = UUID.randomUUID();
        tenantId = UUID.randomUUID();

        talentProfile = TalentProfileResponse.builder()
                .employeeId(employeeId)
                .designation("Senior Developer")
                .skills(List.of())
                .build();
    }

    @Nested
    @DisplayName("Get Talent Profile Tests")
    class GetTalentProfileTests {

        @Test
        @DisplayName("Should return talent profile for employee")
        void shouldGetTalentProfile() throws Exception {
            when(talentProfileService.getTalentProfile(employeeId, tenantId)).thenReturn(talentProfile);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(tenantId);

                mockMvc.perform(get("/api/v1/employees/{id}/talent-profile", employeeId))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                        .andExpect(jsonPath("$.currentRole").value("Senior Developer"))
                        .andExpect(jsonPath("$.skills.length()").value(3));
            }

            verify(talentProfileService).getTalentProfile(employeeId, tenantId);
        }

        @Test
        @DisplayName("Should use tenant context when fetching talent profile")
        void shouldUseTenantContext() throws Exception {
            UUID differentTenantId = UUID.randomUUID();
            when(talentProfileService.getTalentProfile(employeeId, differentTenantId)).thenReturn(talentProfile);

            try (MockedStatic<TenantContext> tc = mockStatic(TenantContext.class)) {
                tc.when(TenantContext::getCurrentTenant).thenReturn(differentTenantId);

                mockMvc.perform(get("/api/v1/employees/{id}/talent-profile", employeeId))
                        .andExpect(status().isOk());
            }

            verify(talentProfileService).getTalentProfile(employeeId, differentTenantId);
        }
    }
}
