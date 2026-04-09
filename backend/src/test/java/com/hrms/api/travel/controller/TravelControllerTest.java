package com.hrms.api.travel.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.travel.dto.CreateTravelRequest;
import com.hrms.api.travel.dto.TravelRequestDto;
import com.hrms.application.travel.service.TravelService;
import com.hrms.common.security.*;
import com.hrms.domain.travel.TravelRequest.TravelStatus;
import com.hrms.domain.travel.TravelRequest.TravelType;
import com.hrms.domain.travel.TravelRequest.TransportMode;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TravelController.class)
@ContextConfiguration(classes = {TravelController.class, TravelControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("TravelController Integration Tests")
class TravelControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private TravelService travelService;
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

    private UUID requestId;
    private CreateTravelRequest validRequest;
    private TravelRequestDto travelDto;

    @BeforeEach
    void setUp() {
        requestId = UUID.randomUUID();

        validRequest = CreateTravelRequest.builder()
                .travelType(TravelType.BUSINESS)
                .purpose("Client meeting in Mumbai")
                .originCity("Bangalore")
                .destinationCity("Mumbai")
                .departureDate(LocalDate.now().plusDays(7))
                .returnDate(LocalDate.now().plusDays(9))
                .transportMode(TransportMode.FLIGHT)
                .estimatedCost(new BigDecimal("25000.00"))
                .build();

        travelDto = TravelRequestDto.builder()
                .id(requestId)
                .employeeId(UUID.randomUUID())
                .employeeName("John Doe")
                .requestNumber("TRV-2026-001")
                .travelType(TravelType.BUSINESS)
                .purpose("Client meeting in Mumbai")
                .originCity("Bangalore")
                .destinationCity("Mumbai")
                .departureDate(LocalDate.now().plusDays(7))
                .returnDate(LocalDate.now().plusDays(9))
                .totalDays(3)
                .transportMode(TransportMode.FLIGHT)
                .estimatedCost(new BigDecimal("25000.00"))
                .status(TravelStatus.DRAFT)
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("Travel Request CRUD Tests")
    class CrudTests {

        @Test
        @DisplayName("Should create travel request successfully")
        void shouldCreateTravelRequest() throws Exception {
            when(travelService.createRequest(any(CreateTravelRequest.class)))
                    .thenReturn(travelDto);

            mockMvc.perform(post("/api/v1/travel/requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(requestId.toString()))
                    .andExpect(jsonPath("$.purpose").value("Client meeting in Mumbai"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));

            verify(travelService).createRequest(any(CreateTravelRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid create request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            CreateTravelRequest invalid = new CreateTravelRequest();

            mockMvc.perform(post("/api/v1/travel/requests")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalid)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should update travel request successfully")
        void shouldUpdateTravelRequest() throws Exception {
            TravelRequestDto updated = TravelRequestDto.builder()
                    .id(requestId)
                    .purpose("Updated meeting")
                    .status(TravelStatus.DRAFT)
                    .build();

            when(travelService.updateRequest(eq(requestId), any(CreateTravelRequest.class)))
                    .thenReturn(updated);

            mockMvc.perform(put("/api/v1/travel/requests/{id}", requestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.purpose").value("Updated meeting"));

            verify(travelService).updateRequest(eq(requestId), any(CreateTravelRequest.class));
        }

        @Test
        @DisplayName("Should get travel request by ID")
        void shouldGetTravelRequestById() throws Exception {
            when(travelService.getById(requestId)).thenReturn(travelDto);

            mockMvc.perform(get("/api/v1/travel/requests/{id}", requestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(requestId.toString()))
                    .andExpect(jsonPath("$.originCity").value("Bangalore"))
                    .andExpect(jsonPath("$.destinationCity").value("Mumbai"));

            verify(travelService).getById(requestId);
        }

        @Test
        @DisplayName("Should delete draft travel request")
        void shouldDeleteDraftTravelRequest() throws Exception {
            doNothing().when(travelService).deleteRequest(requestId);

            mockMvc.perform(delete("/api/v1/travel/requests/{id}", requestId))
                    .andExpect(status().isNoContent());

            verify(travelService).deleteRequest(requestId);
        }
    }

    @Nested
    @DisplayName("Travel Request Workflow Tests")
    class WorkflowTests {

        @Test
        @DisplayName("Should submit travel request for approval")
        void shouldSubmitRequest() throws Exception {
            TravelRequestDto submitted = TravelRequestDto.builder()
                    .id(requestId)
                    .status(TravelStatus.SUBMITTED)
                    .build();

            when(travelService.submitRequest(requestId)).thenReturn(submitted);

            mockMvc.perform(post("/api/v1/travel/requests/{id}/submit", requestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SUBMITTED"));

            verify(travelService).submitRequest(requestId);
        }

        @Test
        @DisplayName("Should approve travel request")
        void shouldApproveRequest() throws Exception {
            TravelRequestDto approved = TravelRequestDto.builder()
                    .id(requestId)
                    .status(TravelStatus.APPROVED)
                    .build();

            when(travelService.approveRequest(eq(requestId), anyString()))
                    .thenReturn(approved);

            mockMvc.perform(post("/api/v1/travel/requests/{id}/approve", requestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"comments\": \"Approved for Q2 budget\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));

            verify(travelService).approveRequest(eq(requestId), anyString());
        }

        @Test
        @DisplayName("Should reject travel request with reason")
        void shouldRejectRequest() throws Exception {
            TravelRequestDto rejected = TravelRequestDto.builder()
                    .id(requestId)
                    .status(TravelStatus.REJECTED)
                    .rejectionReason("Budget exceeded")
                    .build();

            when(travelService.rejectRequest(eq(requestId), anyString()))
                    .thenReturn(rejected);

            mockMvc.perform(post("/api/v1/travel/requests/{id}/reject", requestId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"reason\": \"Budget exceeded\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));

            verify(travelService).rejectRequest(eq(requestId), anyString());
        }

        @Test
        @DisplayName("Should cancel travel request")
        void shouldCancelRequest() throws Exception {
            TravelRequestDto cancelled = TravelRequestDto.builder()
                    .id(requestId)
                    .status(TravelStatus.CANCELLED)
                    .build();

            when(travelService.cancelRequest(requestId)).thenReturn(cancelled);

            mockMvc.perform(post("/api/v1/travel/requests/{id}/cancel", requestId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CANCELLED"));

            verify(travelService).cancelRequest(requestId);
        }
    }

    @Nested
    @DisplayName("Travel Request Retrieval Tests")
    class RetrievalTests {

        @Test
        @DisplayName("Should get my travel requests with pagination")
        void shouldGetMyRequests() throws Exception {
            Page<TravelRequestDto> page = new PageImpl<>(
                    Collections.singletonList(travelDto), PageRequest.of(0, 20), 1);

            when(travelService.getMyRequests(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/travel/requests/my"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(travelService).getMyRequests(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get pending approval requests")
        void shouldGetPendingApprovals() throws Exception {
            Page<TravelRequestDto> page = new PageImpl<>(
                    Collections.singletonList(travelDto), PageRequest.of(0, 20), 1);

            when(travelService.getPendingApprovals(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/travel/requests/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)));

            verify(travelService).getPendingApprovals(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get upcoming travel")
        void shouldGetUpcomingTravel() throws Exception {
            when(travelService.getUpcomingTravel())
                    .thenReturn(Collections.singletonList(travelDto));

            mockMvc.perform(get("/api/v1/travel/requests/upcoming"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].requestNumber").value("TRV-2026-001"));

            verify(travelService).getUpcomingTravel();
        }
    }
}
