package com.hrms.api.admin.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.common.security.*;
import com.hrms.domain.kafka.FailedKafkaEvent;
import com.hrms.domain.kafka.FailedKafkaEvent.FailedEventStatus;
import com.hrms.infrastructure.kafka.consumer.DeadLetterHandler;
import com.hrms.infrastructure.kafka.repository.FailedKafkaEventRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.*;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.util.*;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(KafkaAdminController.class)
@ContextConfiguration(classes = {KafkaAdminController.class, KafkaAdminControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("KafkaAdminController Integration Tests")
class KafkaAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private DeadLetterHandler deadLetterHandler;
    @MockitoBean
    private FailedKafkaEventRepository failedKafkaEventRepository;
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

    private UUID eventId;

    @BeforeEach
    void setUp() {
        eventId = UUID.randomUUID();
    }

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Nested
    @DisplayName("List Failed Events Tests")
    class ListFailedEventsTests {

        @Test
        @DisplayName("Should list failed events with default status")
        void shouldListFailedEventsWithDefaultStatus() throws Exception {
            Page<FailedKafkaEvent> page = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 25), 0);

            when(failedKafkaEventRepository.findByStatusOrderByCreatedAtDesc(
                    eq(FailedEventStatus.PENDING_REPLAY), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/admin/kafka/failed-events"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(0));

            verify(failedKafkaEventRepository).findByStatusOrderByCreatedAtDesc(
                    eq(FailedEventStatus.PENDING_REPLAY), any(Pageable.class));
        }

        @Test
        @DisplayName("Should list failed events filtered by IGNORED status")
        void shouldListFailedEventsFilteredByIgnoredStatus() throws Exception {
            Page<FailedKafkaEvent> page = new PageImpl<>(
                    Collections.emptyList(), PageRequest.of(0, 25), 0);

            when(failedKafkaEventRepository.findByStatusOrderByCreatedAtDesc(
                    eq(FailedEventStatus.IGNORED), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/admin/kafka/failed-events")
                            .param("status", "IGNORED"))
                    .andExpect(status().isOk());

            verify(failedKafkaEventRepository).findByStatusOrderByCreatedAtDesc(
                    eq(FailedEventStatus.IGNORED), any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("Get Failed Event Detail Tests")
    class GetFailedEventDetailTests {

        @Test
        @DisplayName("Should return failed event by ID")
        void shouldReturnFailedEventById() throws Exception {
            FailedKafkaEvent event = new FailedKafkaEvent();
            event.setId(eventId);
            event.setTopic("nu-aura.approvals.dlt");
            event.setStatus(FailedEventStatus.PENDING_REPLAY);

            when(failedKafkaEventRepository.findById(eventId)).thenReturn(Optional.of(event));

            mockMvc.perform(get("/api/v1/admin/kafka/failed-events/{id}", eventId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(eventId.toString()));

            verify(failedKafkaEventRepository).findById(eventId);
        }

        @Test
        @DisplayName("Should return 404 when event not found")
        void shouldReturn404WhenEventNotFound() throws Exception {
            when(failedKafkaEventRepository.findById(eventId)).thenReturn(Optional.empty());

            mockMvc.perform(get("/api/v1/admin/kafka/failed-events/{id}", eventId))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("Replay Failed Event Tests")
    class ReplayFailedEventTests {

        @Test
        @DisplayName("Should replay failed event successfully")
        void shouldReplayFailedEventSuccessfully() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                UUID adminId = UUID.randomUUID();
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(adminId);

                doNothing().when(deadLetterHandler).replayFailedEvent(eventId, adminId);

                mockMvc.perform(post("/api/v1/admin/kafka/replay/{id}", eventId))
                        .andExpect(status().isNoContent());

                verify(deadLetterHandler).replayFailedEvent(eventId, adminId);
            }
        }

        @Test
        @DisplayName("Should return 404 when replaying non-existent event")
        void shouldReturn404WhenReplayingNonExistentEvent() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

                doThrow(new IllegalArgumentException("Event not found"))
                        .when(deadLetterHandler).replayFailedEvent(eq(eventId), any(UUID.class));

                mockMvc.perform(post("/api/v1/admin/kafka/replay/{id}", eventId))
                        .andExpect(status().isNotFound());
            }
        }

        @Test
        @DisplayName("Should return 409 when event is not in PENDING_REPLAY status")
        void shouldReturn409WhenEventNotPendingReplay() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

                doThrow(new IllegalStateException("Event is not in PENDING_REPLAY status"))
                        .when(deadLetterHandler).replayFailedEvent(eq(eventId), any(UUID.class));

                mockMvc.perform(post("/api/v1/admin/kafka/replay/{id}", eventId))
                        .andExpect(status().isConflict());
            }
        }
    }

    @Nested
    @DisplayName("Ignore Failed Event Tests")
    class IgnoreFailedEventTests {

        @Test
        @DisplayName("Should ignore failed event successfully")
        void shouldIgnoreFailedEventSuccessfully() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                UUID adminId = UUID.randomUUID();
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(adminId);

                doNothing().when(deadLetterHandler).ignoreFailedEvent(eventId, adminId);

                mockMvc.perform(post("/api/v1/admin/kafka/ignore/{id}", eventId))
                        .andExpect(status().isNoContent());

                verify(deadLetterHandler).ignoreFailedEvent(eventId, adminId);
            }
        }

        @Test
        @DisplayName("Should return 404 when ignoring non-existent event")
        void shouldReturn404WhenIgnoringNonExistentEvent() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

                doThrow(new IllegalArgumentException("Not found"))
                        .when(deadLetterHandler).ignoreFailedEvent(eq(eventId), any(UUID.class));

                mockMvc.perform(post("/api/v1/admin/kafka/ignore/{id}", eventId))
                        .andExpect(status().isNotFound());
            }
        }
    }

    @Nested
    @DisplayName("Poison Pills and Bulk Ignore Tests")
    class PoisonPillsAndBulkIgnoreTests {

        @Test
        @DisplayName("Should list suspected poison pills")
        void shouldListSuspectedPoisonPills() throws Exception {
            when(failedKafkaEventRepository.findSuspectedPoisonPills(3))
                    .thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/admin/kafka/poison-pills"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));

            verify(failedKafkaEventRepository).findSuspectedPoisonPills(3);
        }

        @Test
        @DisplayName("Should bulk ignore all pending events for a topic")
        void shouldBulkIgnoreAllPendingEventsForTopic() throws Exception {
            try (MockedStatic<SecurityContext> securityContext = mockStatic(SecurityContext.class)) {
                securityContext.when(SecurityContext::getCurrentUserId).thenReturn(UUID.randomUUID());

                when(failedKafkaEventRepository.ignoreAllPendingForTopic("nu-aura.approvals.dlt"))
                        .thenReturn(5);

                mockMvc.perform(post("/api/v1/admin/kafka/ignore-topic")
                                .param("topic", "nu-aura.approvals.dlt"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.topic").value("nu-aura.approvals.dlt"))
                        .andExpect(jsonPath("$.updatedCount").value(5));
            }
        }
    }
}
