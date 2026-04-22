package com.hrms.api.performance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.application.performance.dto.ReviewRequest;
import com.hrms.application.performance.dto.ReviewResponse;
import com.hrms.domain.performance.PerformanceReview;

import java.math.BigDecimal;

import com.hrms.application.performance.service.PerformanceReviewService;
import com.hrms.common.security.JwtAuthenticationFilter;
import com.hrms.common.security.TenantFilter;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PerformanceReviewController.class)
@ContextConfiguration(classes = {PerformanceReviewController.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("PerformanceReviewController Unit Tests")
class PerformanceReviewControllerTest {

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PerformanceReviewService reviewService;

    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockitoBean
    private TenantFilter tenantFilter;

    private UUID reviewId;
    private UUID employeeId;
    private ReviewResponse reviewResponse;

    @BeforeEach
    void setUp() {
        reviewId = UUID.randomUUID();
        employeeId = UUID.randomUUID();

        reviewResponse = ReviewResponse.builder()
                .id(reviewId)
                .employeeId(employeeId)
                .status(PerformanceReview.ReviewStatus.IN_REVIEW)
                .overallRating(new BigDecimal("3.8"))
                .build();
    }

    @Nested
    @DisplayName("Create Review Tests")
    class CreateReviewTests {

        @Test
        @DisplayName("Should create performance review")
        void shouldCreateReview() throws Exception {
            ReviewRequest request = new ReviewRequest();
            request.setEmployeeId(employeeId);
            request.setReviewerId(UUID.randomUUID());

            when(reviewService.createReview(any(ReviewRequest.class))).thenReturn(reviewResponse);

            mockMvc.perform(post("/api/v1/reviews")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(reviewId.toString()))
                    .andExpect(jsonPath("$.status").value("IN_REVIEW"));

            verify(reviewService).createReview(any(ReviewRequest.class));
        }
    }

    @Nested
    @DisplayName("Get Review Tests")
    class GetReviewTests {

        @Test
        @DisplayName("Should get all reviews paginated")
        void shouldGetAllReviewsPaginated() throws Exception {
            Page<ReviewResponse> page = new PageImpl<>(List.of(reviewResponse), PageRequest.of(0, 20), 1);
            when(reviewService.getAllReviews(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/reviews")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.content[0].status").value("IN_REVIEW"));

            verify(reviewService).getAllReviews(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get review by ID")
        void shouldGetReviewById() throws Exception {
            when(reviewService.getReviewById(reviewId)).thenReturn(reviewResponse);

            mockMvc.perform(get("/api/v1/reviews/{id}", reviewId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(reviewId.toString()))
                    .andExpect(jsonPath("$.overallRating").value(3.8));

            verify(reviewService).getReviewById(reviewId);
        }

        @Test
        @DisplayName("Should get reviews by employee ID")
        void shouldGetReviewsByEmployee() throws Exception {
            when(reviewService.getEmployeeReviews(employeeId)).thenReturn(List.of(reviewResponse));

            mockMvc.perform(get("/api/v1/reviews/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk());

            verify(reviewService).getEmployeeReviews(employeeId);
        }
    }

    @Nested
    @DisplayName("Update Review Tests")
    class UpdateReviewTests {

        @Test
        @DisplayName("Should update review")
        void shouldUpdateReview() throws Exception {
            ReviewRequest request = new ReviewRequest();
            request.setEmployeeId(employeeId);
            request.setReviewerId(UUID.randomUUID());

            ReviewResponse updated = ReviewResponse.builder()
                    .id(reviewId)
                    .status(PerformanceReview.ReviewStatus.COMPLETED)
                    .overallRating(new BigDecimal("4.2"))
                    .build();

            when(reviewService.updateReview(eq(reviewId), any(ReviewRequest.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/reviews/{id}", reviewId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"))
                    .andExpect(jsonPath("$.overallRating").value(4.2));

            verify(reviewService).updateReview(eq(reviewId), any(ReviewRequest.class));
        }

        @Test
        @DisplayName("Should delete review")
        void shouldDeleteReview() throws Exception {
            doNothing().when(reviewService).deleteReview(reviewId);

            mockMvc.perform(delete("/api/v1/reviews/{id}", reviewId))
                    .andExpect(status().isNoContent());

            verify(reviewService).deleteReview(reviewId);
        }
    }
}
