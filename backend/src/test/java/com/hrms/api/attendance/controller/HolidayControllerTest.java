package com.hrms.api.attendance.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.attendance.service.HolidayService;
import com.hrms.common.security.*;
import com.hrms.domain.attendance.Holiday;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HolidayController.class)
@ContextConfiguration(classes = {HolidayController.class, HolidayControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("HolidayController Integration Tests")
class HolidayControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private HolidayService holidayService;
    @MockitoBean
    private ApiKeyService apiKeyService;
    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;
    @MockitoBean
    private UserDetailsService userDetailsService;
    @MockitoBean
    private ApiKeyAuthenticationFilter apiKeyAuthenticationFilter;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private RateLimitFilter rateLimitFilter;
    @MockitoBean
    private RateLimitingFilter rateLimitingFilter;
    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID holidayId;
    private Holiday holiday;

    @BeforeEach
    void setUp() {
        holidayId = UUID.randomUUID();
        holiday = Holiday.builder()
                .holidayName("Diwali")
                .holidayDate(LocalDate.of(2026, 11, 1))
                .holidayType(Holiday.HolidayType.NATIONAL)
                .description("Festival of lights")
                .isOptional(false)
                .isRestricted(false)
                .year(2026)
                .build();
        holiday.setId(holidayId);
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Get Holidays Tests")
    class GetHolidaysTests {

        @Test
        @DisplayName("Should return holidays for current year when no year specified")
        void shouldReturnHolidaysForCurrentYear() throws Exception {
            when(holidayService.getHolidaysByYear(anyInt())).thenReturn(List.of(holiday));

            mockMvc.perform(get("/api/v1/holidays"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].holidayName").value("Diwali"));

            verify(holidayService).getHolidaysByYear(anyInt());
        }

        @Test
        @DisplayName("Should return holidays for specific year via query param")
        void shouldReturnHolidaysForSpecificYear() throws Exception {
            when(holidayService.getHolidaysByYear(2026)).thenReturn(List.of(holiday));

            mockMvc.perform(get("/api/v1/holidays")
                            .param("year", "2026"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(holidayService).getHolidaysByYear(2026);
        }

        @Test
        @DisplayName("Should return holidays by year path variable")
        void shouldReturnHolidaysByYearPath() throws Exception {
            when(holidayService.getHolidaysByYear(2026)).thenReturn(List.of(holiday));

            mockMvc.perform(get("/api/v1/holidays/year/2026"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].holidayName").value("Diwali"));

            verify(holidayService).getHolidaysByYear(2026);
        }

        @Test
        @DisplayName("Should return empty list when no holidays for year")
        void shouldReturnEmptyListWhenNoHolidays() throws Exception {
            when(holidayService.getHolidaysByYear(2025)).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/holidays/year/2025"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    @Nested
    @DisplayName("Get Holiday By ID Tests")
    class GetHolidayByIdTests {

        @Test
        @DisplayName("Should return holiday by ID successfully")
        void shouldReturnHolidayByIdSuccessfully() throws Exception {
            when(holidayService.getHolidayById(holidayId)).thenReturn(holiday);

            mockMvc.perform(get("/api/v1/holidays/{id}", holidayId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.holidayName").value("Diwali"))
                    .andExpect(jsonPath("$.holidayType").value("NATIONAL"));

            verify(holidayService).getHolidayById(holidayId);
        }
    }

    @Nested
    @DisplayName("Create Holiday Tests")
    class CreateHolidayTests {

        @Test
        @DisplayName("Should create holiday successfully")
        void shouldCreateHolidaySuccessfully() throws Exception {
            HolidayController.HolidayRequest request = new HolidayController.HolidayRequest();
            request.setHolidayName("Republic Day");
            request.setHolidayDate(LocalDate.of(2026, 1, 26));
            request.setHolidayType(Holiday.HolidayType.NATIONAL);
            request.setDescription("Republic Day of India");

            Holiday created = Holiday.builder()
                    .holidayName("Republic Day")
                    .holidayDate(LocalDate.of(2026, 1, 26))
                    .holidayType(Holiday.HolidayType.NATIONAL)
                    .description("Republic Day of India")
                    .isOptional(false)
                    .isRestricted(false)
                    .year(2026)
                    .build();
            created.setId(UUID.randomUUID());

            when(holidayService.createHoliday(any(Holiday.class))).thenReturn(created);

            mockMvc.perform(post("/api/v1/holidays")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.holidayName").value("Republic Day"))
                    .andExpect(jsonPath("$.holidayType").value("NATIONAL"));

            verify(holidayService).createHoliday(any(Holiday.class));
        }

        @Test
        @DisplayName("Should return 400 when holiday name is blank")
        void shouldReturn400WhenHolidayNameBlank() throws Exception {
            HolidayController.HolidayRequest request = new HolidayController.HolidayRequest();
            request.setHolidayDate(LocalDate.of(2026, 1, 26));
            request.setHolidayType(Holiday.HolidayType.NATIONAL);

            mockMvc.perform(post("/api/v1/holidays")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when holiday date is null")
        void shouldReturn400WhenHolidayDateNull() throws Exception {
            HolidayController.HolidayRequest request = new HolidayController.HolidayRequest();
            request.setHolidayName("Test Holiday");
            request.setHolidayType(Holiday.HolidayType.NATIONAL);

            mockMvc.perform(post("/api/v1/holidays")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Update Holiday Tests")
    class UpdateHolidayTests {

        @Test
        @DisplayName("Should update holiday successfully")
        void shouldUpdateHolidaySuccessfully() throws Exception {
            HolidayController.HolidayRequest request = new HolidayController.HolidayRequest();
            request.setHolidayName("Updated Diwali");
            request.setHolidayDate(LocalDate.of(2026, 11, 2));
            request.setHolidayType(Holiday.HolidayType.NATIONAL);

            Holiday updated = Holiday.builder()
                    .holidayName("Updated Diwali")
                    .holidayDate(LocalDate.of(2026, 11, 2))
                    .holidayType(Holiday.HolidayType.NATIONAL)
                    .isOptional(false)
                    .isRestricted(false)
                    .year(2026)
                    .build();
            updated.setId(holidayId);

            when(holidayService.updateHoliday(eq(holidayId), any(Holiday.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/holidays/{id}", holidayId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.holidayName").value("Updated Diwali"));

            verify(holidayService).updateHoliday(eq(holidayId), any(Holiday.class));
        }
    }

    @Nested
    @DisplayName("Delete Holiday Tests")
    class DeleteHolidayTests {

        @Test
        @DisplayName("Should delete holiday successfully")
        void shouldDeleteHolidaySuccessfully() throws Exception {
            doNothing().when(holidayService).deleteHoliday(holidayId);

            mockMvc.perform(delete("/api/v1/holidays/{id}", holidayId))
                    .andExpect(status().isNoContent());

            verify(holidayService).deleteHoliday(holidayId);
        }
    }
}
