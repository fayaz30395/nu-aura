package com.nulogic.common.api.response;

import com.nulogic.common.exception.ErrorResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class ApiResponseBodyAdviceTest {

    private final ApiResponseBodyAdvice advice = new ApiResponseBodyAdvice();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void wrapsPlainDtoOnAnnotatedController() throws Exception {
        MethodParameter param = parameter(WrappedController.class, "getDto");

        assertThat(advice.supports(param, jsonConverter())).isTrue();
        Object result = advice.beforeBodyWrite(
                new SampleDto("hello"), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(result).isInstanceOf(ApiResponse.class);
        ApiResponse<?> wrapped = (ApiResponse<?>) result;
        assertThat(wrapped.data()).isInstanceOf(SampleDto.class);
        assertThat(((SampleDto) wrapped.data()).value()).isEqualTo("hello");
        assertThat(wrapped.serverTime()).isNotNull();
        assertThat(wrapped.traceId()).isNull(); // no MDC set
    }

    @Test
    void leavesBodyUntouchedWhenAnnotationAbsent() throws Exception {
        MethodParameter param = parameter(UnwrappedController.class, "getDto");

        assertThat(advice.supports(param, jsonConverter())).isFalse();
    }

    @Test
    void doesNotRewrapApiResponseBody() throws Exception {
        MethodParameter param = parameter(WrappedController.class, "getDto");
        ApiResponse<SampleDto> alreadyWrapped = ApiResponse.of(new SampleDto("x"), "trace-1");

        Object result = advice.beforeBodyWrite(
                alreadyWrapped, param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(result).isSameAs(alreadyWrapped);
    }

    @Test
    void doesNotWrapErrorResponse() throws Exception {
        MethodParameter param = parameter(WrappedController.class, "getDto");
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(500)
                .error("Internal Server Error")
                .message("boom")
                .build();

        Object result = advice.beforeBodyWrite(
                error, param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(result).isSameAs(error);
    }

    @Test
    void picksUpTraceIdFromMdc() throws Exception {
        MDC.put("traceId", "trace-xyz");
        MethodParameter param = parameter(WrappedController.class, "getDto");

        Object result = advice.beforeBodyWrite(
                new SampleDto("v"), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(((ApiResponse<?>) result).traceId()).isEqualTo("trace-xyz");
    }

    @Test
    void fallsBackToRequestIdMdcKey() throws Exception {
        MDC.put("requestId", "req-42");
        MethodParameter param = parameter(WrappedController.class, "getDto");

        Object result = advice.beforeBodyWrite(
                new SampleDto("v"), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(((ApiResponse<?>) result).traceId()).isEqualTo("req-42");
    }

    @Test
    void methodLevelAnnotationOptsIn() throws Exception {
        MethodParameter param = parameter(MethodAnnotatedController.class, "getDto");

        assertThat(advice.supports(param, jsonConverter())).isTrue();
    }

    @Test
    void streamingTypesAreSkipped() throws Exception {
        assertThat(advice.supports(parameter(WrappedController.class, "stream"), jsonConverter())).isFalse();
        assertThat(advice.supports(parameter(WrappedController.class, "sse"), jsonConverter())).isFalse();
    }

    /**
     * Migration smoke tests: each of the three pilot controllers
     * annotated with {@link WrapResponse} (T3-11 wave 1) is detected
     * by the advice and its handler bodies are wrapped into
     * {@link ApiResponse} before serialization. Uses reflection on a
     * real handler method per controller — keeps the test independent
     * of MockMvc / Spring context bootstrap.
     */
    @Test
    void dashboardControllerHandlerOptsIn() throws Exception {
        MethodParameter param = handler(
                com.nulogic.api.dashboard.controller.DashboardController.class,
                "getDashboardMetrics");

        assertThat(advice.supports(param, jsonConverter())).isTrue();

        MDC.put("traceId", "dash-trace");
        Object wrapped = advice.beforeBodyWrite(
                Map.of("totalEmployees", 100L), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(wrapped).isInstanceOf(ApiResponse.class);
        ApiResponse<?> resp = (ApiResponse<?>) wrapped;
        assertThat(resp.traceId()).isEqualTo("dash-trace");
        assertThat(resp.data()).isInstanceOf(Map.class);
    }

    @Test
    void permissionControllerHandlerOptsIn() throws Exception {
        MethodParameter param = handler(
                com.nulogic.api.user.controller.PermissionController.class,
                "getPermissionsByResource");

        assertThat(advice.supports(param, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of("perm-a", "perm-b"), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(wrapped).isInstanceOf(ApiResponse.class);
        assertThat(((ApiResponse<?>) wrapped).data()).isInstanceOf(List.class);
    }

    @Test
    void approvalsControllerHandlerOptsIn() throws Exception {
        MethodParameter param = handler(
                com.nulogic.api.workflow.controller.ApprovalsController.class,
                "getMyApprovalTasks");

        assertThat(advice.supports(param, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of(), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(wrapped).isInstanceOf(ApiResponse.class);
        assertThat(((ApiResponse<?>) wrapped).serverTime()).isNotNull();
    }

    /**
     * Wave 2 migration smoke tests: 5 additional controllers annotated
     * with {@link WrapResponse} on 2026-05-20 (T3-11 wave 2).
     * <p>
     * {@code HomeController}, {@code KnowledgeSearchController}, and
     * {@code StatutoryContributionController} carry class-level
     * {@code @WrapResponse} (all GETs). {@code CalendarController} and
     * {@code FeatureFlagController} are mixed CRUD; the GET handlers are
     * annotated per-method, leaving writes opt-out for now.
     */
    @Test
    void homeControllerHandlerOptsIn() throws Exception {
        MethodParameter param = handler(
                com.nulogic.api.home.controller.HomeController.class,
                "getUpcomingBirthdays");

        assertThat(advice.supports(param, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of(), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(wrapped).isInstanceOf(ApiResponse.class);
        assertThat(((ApiResponse<?>) wrapped).serverTime()).isNotNull();
    }

    @Test
    void knowledgeSearchControllerHandlerOptsIn() throws Exception {
        MethodParameter param = handler(
                com.nulogic.api.knowledge.controller.KnowledgeSearchController.class,
                "searchWiki");

        assertThat(advice.supports(param, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of(), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(wrapped).isInstanceOf(ApiResponse.class);
    }

    @Test
    void statutoryContributionControllerHandlerOptsIn() throws Exception {
        MethodParameter param = handler(
                com.nulogic.api.statutory.controller.StatutoryContributionController.class,
                "getMonthlyContributions");

        assertThat(advice.supports(param, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of(), param, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));

        assertThat(wrapped).isInstanceOf(ApiResponse.class);
    }

    @Test
    void calendarControllerGetHandlerOptsInButWriteDoesNot() throws Exception {
        // GET — method-level @WrapResponse applied
        MethodParameter getParam = handler(
                com.nulogic.api.calendar.controller.CalendarController.class,
                "getMyEvents");
        assertThat(advice.supports(getParam, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of(), getParam, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));
        assertThat(wrapped).isInstanceOf(ApiResponse.class);

        // POST — unannotated, advice must skip
        MethodParameter postParam = handler(
                com.nulogic.api.calendar.controller.CalendarController.class,
                "createEvent");
        assertThat(advice.supports(postParam, jsonConverter())).isFalse();
    }

    @Test
    void featureFlagControllerGetHandlerOptsInButWriteDoesNot() throws Exception {
        // GET — method-level @WrapResponse applied
        MethodParameter getParam = handler(
                com.nulogic.api.featureflag.FeatureFlagController.class,
                "getAllFlags");
        assertThat(advice.supports(getParam, jsonConverter())).isTrue();

        Object wrapped = advice.beforeBodyWrite(
                List.of(), getParam, MediaType.APPLICATION_JSON, jsonConverter(),
                mock(ServerHttpRequest.class), mock(ServerHttpResponse.class));
        assertThat(wrapped).isInstanceOf(ApiResponse.class);

        // POST — unannotated, advice must skip
        MethodParameter postParam = handler(
                com.nulogic.api.featureflag.FeatureFlagController.class,
                "setFeatureFlag");
        assertThat(advice.supports(postParam, jsonConverter())).isFalse();
    }

    @Test
    void paginationMetaShapesAreStable() throws Exception {
        org.springframework.data.domain.Page<String> page =
                new org.springframework.data.domain.PageImpl<>(
                        List.of("a", "b"),
                        org.springframework.data.domain.PageRequest.of(1, 2),
                        7);

        Map<String, Object> meta = PaginationMeta.from(page);

        assertThat(meta).containsExactly(
                Map.entry("page", 1),
                Map.entry("size", 2),
                Map.entry("totalElements", 7L),
                Map.entry("totalPages", 4)
        );
    }

    // ---------- helpers ----------

    @SuppressWarnings("unchecked")
    private static Class<? extends HttpMessageConverter<?>> jsonConverter() {
        return (Class<? extends HttpMessageConverter<?>>)
                (Class<?>) org.springframework.http.converter.json.MappingJackson2HttpMessageConverter.class;
    }

    private static MethodParameter parameter(Class<?> declaring, String methodName) throws NoSuchMethodException {
        Method method = declaring.getDeclaredMethod(methodName);
        return new MethodParameter(method, -1);
    }

    /**
     * Locate a real controller handler method by name, ignoring parameters.
     * Used by the migration-smoke tests to grab handlers that take request
     * arguments (Pageable, path vars, etc.) without coupling the test to
     * controller signatures.
     */
    private static MethodParameter handler(Class<?> declaring, String methodName) {
        for (Method method : declaring.getDeclaredMethods()) {
            if (method.getName().equals(methodName)) {
                return new MethodParameter(method, -1);
            }
        }
        throw new IllegalArgumentException(
                "No handler named " + methodName + " on " + declaring.getName());
    }

    // ---------- fixtures ----------

    record SampleDto(String value) {
    }

    @WrapResponse
    static class WrappedController {
        public SampleDto getDto() {
            return new SampleDto("hello");
        }

        public StreamingResponseBody stream() {
            return out -> {
            };
        }

        public SseEmitter sse() {
            return new SseEmitter();
        }
    }

    static class UnwrappedController {
        public SampleDto getDto() {
            return new SampleDto("hello");
        }
    }

    static class MethodAnnotatedController {
        @WrapResponse
        public SampleDto getDto() {
            return new SampleDto("hello");
        }
    }
}
