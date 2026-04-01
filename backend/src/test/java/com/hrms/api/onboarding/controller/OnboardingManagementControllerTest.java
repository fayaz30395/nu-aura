package com.hrms.api.onboarding.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.onboarding.dto.*;
import com.hrms.application.onboarding.service.OnboardingManagementService;
import com.hrms.common.security.*;
import com.hrms.domain.onboarding.OnboardingProcess;
import com.hrms.domain.onboarding.OnboardingTask;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(OnboardingManagementController.class)
@ContextConfiguration(classes = {OnboardingManagementController.class, OnboardingManagementControllerTest.TestConfig.class})
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("OnboardingManagementController Integration Tests")
class OnboardingManagementControllerTest {

    @Configuration
    static class TestConfig {
        @Bean
        public org.springframework.data.domain.AuditorAware<UUID> auditorProvider() {
            return () -> Optional.of(UUID.randomUUID());
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private OnboardingManagementService onboardingService;

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

    private UUID processId;
    private UUID employeeId;
    private UUID templateId;
    private UUID taskId;
    private UUID buddyId;
    private OnboardingProcessResponse processResponse;
    private OnboardingTaskResponse taskResponse;
    private OnboardingChecklistTemplateResponse templateResponse;

    @BeforeEach
    void setUp() {
        processId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        templateId = UUID.randomUUID();
        taskId = UUID.randomUUID();
        buddyId = UUID.randomUUID();

        processResponse = OnboardingProcessResponse.builder()
                .id(processId)
                .employeeId(employeeId)
                .status(OnboardingProcess.ProcessStatus.IN_PROGRESS)
                .completionPercentage(25)
                .createdAt(LocalDateTime.now())
                .build();

        taskResponse = OnboardingTaskResponse.builder()
                .id(taskId)
                .processId(processId)
                .taskName("Complete HR Documentation")
                .status(OnboardingTask.TaskStatus.PENDING)
                .build();

        templateResponse = OnboardingChecklistTemplateResponse.builder()
                .id(templateId)
                .name("Standard Onboarding Template")
                .description("Standard onboarding checklist for new employees")
                .build();
    }

    @Nested
    @DisplayName("Onboarding Process Creation Tests")
    class ProcessCreationTests {

        @Test
        @DisplayName("Should create onboarding process successfully")
        void shouldCreateProcessSuccessfully() throws Exception {
            OnboardingProcessRequest request = new OnboardingProcessRequest();
            request.setEmployeeId(employeeId);
            request.setTemplateId(templateId);
            request.setAssignedBuddyId(buddyId);
            request.setProcessType(OnboardingProcess.ProcessType.ONBOARDING);

            when(onboardingService.createProcess(any(OnboardingProcessRequest.class)))
                    .thenReturn(processResponse);

            mockMvc.perform(post("/api/v1/onboarding/processes")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()))
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

            verify(onboardingService).createProcess(any(OnboardingProcessRequest.class));
        }

        @Test
        @DisplayName("Should return 400 for invalid process request")
        void shouldReturn400ForInvalidRequest() throws Exception {
            OnboardingProcessRequest request = new OnboardingProcessRequest();

            mockMvc.perform(post("/api/v1/onboarding/processes")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("Onboarding Process Update Tests")
    class ProcessUpdateTests {

        @Test
        @DisplayName("Should update onboarding process successfully")
        void shouldUpdateProcessSuccessfully() throws Exception {
            OnboardingProcessRequest request = new OnboardingProcessRequest();
            request.setEmployeeId(employeeId);
            request.setTemplateId(templateId);
            request.setAssignedBuddyId(buddyId);
            request.setProcessType(OnboardingProcess.ProcessType.ONBOARDING);

            OnboardingProcessResponse updatedResponse = OnboardingProcessResponse.builder()
                    .id(processId)
                    .employeeId(employeeId)
                    .status(OnboardingProcess.ProcessStatus.IN_PROGRESS)
                    .completionPercentage(25)
                    .createdAt(processResponse.getCreatedAt())
                    .build();

            when(onboardingService.updateProcess(eq(processId), any(OnboardingProcessRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/onboarding/processes/{processId}", processId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

            verify(onboardingService).updateProcess(eq(processId), any(OnboardingProcessRequest.class));
        }

        @Test
        @DisplayName("Should update process status")
        void shouldUpdateProcessStatus() throws Exception {
            OnboardingProcessResponse completedResponse = OnboardingProcessResponse.builder()
                    .id(processId)
                    .employeeId(employeeId)
                    .status(OnboardingProcess.ProcessStatus.COMPLETED)
                    .completionPercentage(100)
                    .createdAt(processResponse.getCreatedAt())
                    .build();

            when(onboardingService.updateStatus(eq(processId), any(OnboardingProcess.ProcessStatus.class)))
                    .thenReturn(completedResponse);

            mockMvc.perform(patch("/api/v1/onboarding/processes/{processId}/status", processId)
                    .param("status", "COMPLETED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"))
                    .andExpect(jsonPath("$.completionPercentage").value(100));

            verify(onboardingService).updateStatus(eq(processId), any(OnboardingProcess.ProcessStatus.class));
        }

        @Test
        @DisplayName("Should update process progress")
        void shouldUpdateProcessProgress() throws Exception {
            OnboardingProcessResponse progressResponse = OnboardingProcessResponse.builder()
                    .id(processId)
                    .employeeId(employeeId)
                    .status(OnboardingProcess.ProcessStatus.IN_PROGRESS)
                    .completionPercentage(50)
                    .createdAt(processResponse.getCreatedAt())
                    .build();

            when(onboardingService.updateProgress(eq(processId), eq(50)))
                    .thenReturn(progressResponse);

            mockMvc.perform(patch("/api/v1/onboarding/processes/{processId}/progress", processId)
                    .param("completionPercentage", "50"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.completionPercentage").value(50));

            verify(onboardingService).updateProgress(eq(processId), eq(50));
        }
    }

    @Nested
    @DisplayName("Onboarding Process Retrieval Tests")
    class ProcessRetrievalTests {

        @Test
        @DisplayName("Should get process by ID")
        void shouldGetProcessById() throws Exception {
            when(onboardingService.getProcessById(processId))
                    .thenReturn(processResponse);

            mockMvc.perform(get("/api/v1/onboarding/processes/{processId}", processId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(processId.toString()))
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

            verify(onboardingService).getProcessById(processId);
        }

        @Test
        @DisplayName("Should get process by employee ID")
        void shouldGetProcessByEmployee() throws Exception {
            when(onboardingService.getProcessByEmployee(employeeId))
                    .thenReturn(processResponse);

            mockMvc.perform(get("/api/v1/onboarding/processes/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

            verify(onboardingService).getProcessByEmployee(employeeId);
        }

        @Test
        @DisplayName("Should get all processes with pagination")
        void shouldGetAllProcesses() throws Exception {
            Page<OnboardingProcessResponse> page = new PageImpl<>(
                    Collections.singletonList(processResponse),
                    PageRequest.of(0, 20),
                    1
            );

            when(onboardingService.getAllProcesses(any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get("/api/v1/onboarding/processes"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(onboardingService).getAllProcesses(any(Pageable.class));
        }

        @Test
        @DisplayName("Should get processes by status")
        void shouldGetProcessesByStatus() throws Exception {
            List<OnboardingProcessResponse> processes = Collections.singletonList(processResponse);

            when(onboardingService.getProcessesByStatus(OnboardingProcess.ProcessStatus.IN_PROGRESS))
                    .thenReturn(processes);

            mockMvc.perform(get("/api/v1/onboarding/processes/status/{status}", "IN_PROGRESS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].status").value("IN_PROGRESS"));

            verify(onboardingService).getProcessesByStatus(OnboardingProcess.ProcessStatus.IN_PROGRESS);
        }

        @Test
        @DisplayName("Should get processes by buddy")
        void shouldGetProcessesByBuddy() throws Exception {
            List<OnboardingProcessResponse> processes = Collections.singletonList(processResponse);

            when(onboardingService.getProcessesByBuddy(buddyId))
                    .thenReturn(processes);

            mockMvc.perform(get("/api/v1/onboarding/processes/buddy/{buddyId}", buddyId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(onboardingService).getProcessesByBuddy(buddyId);
        }
    }

    @Nested
    @DisplayName("Onboarding Template Tests")
    class TemplateTests {

        @Test
        @DisplayName("Should create template successfully")
        void shouldCreateTemplateSuccessfully() throws Exception {
            OnboardingChecklistTemplateRequest request = OnboardingChecklistTemplateRequest.builder()
                    .name("Standard Onboarding Template")
                    .description("Standard onboarding checklist for new employees")
                    .build();

            when(onboardingService.createTemplate(any(OnboardingChecklistTemplateRequest.class)))
                    .thenReturn(templateResponse);

            mockMvc.perform(post("/api/v1/onboarding/templates")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.name").value("Standard Onboarding Template"));

            verify(onboardingService).createTemplate(any(OnboardingChecklistTemplateRequest.class));
        }

        @Test
        @DisplayName("Should get all templates")
        void shouldGetAllTemplates() throws Exception {
            List<OnboardingChecklistTemplateResponse> templates = Collections.singletonList(templateResponse);

            when(onboardingService.getAllTemplates())
                    .thenReturn(templates);

            mockMvc.perform(get("/api/v1/onboarding/templates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].name").value("Standard Onboarding Template"));

            verify(onboardingService).getAllTemplates();
        }

        @Test
        @DisplayName("Should get template by ID")
        void shouldGetTemplateById() throws Exception {
            when(onboardingService.getTemplateById(templateId))
                    .thenReturn(templateResponse);

            mockMvc.perform(get("/api/v1/onboarding/templates/{templateId}", templateId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(templateId.toString()));

            verify(onboardingService).getTemplateById(templateId);
        }

        @Test
        @DisplayName("Should update template successfully")
        void shouldUpdateTemplateSuccessfully() throws Exception {
            OnboardingChecklistTemplateRequest request = OnboardingChecklistTemplateRequest.builder()
                    .name("Updated Template")
                    .description("Updated description")
                    .build();

            OnboardingChecklistTemplateResponse updatedResponse = OnboardingChecklistTemplateResponse.builder()
                    .id(templateId)
                    .name("Updated Template")
                    .description("Updated description")
                    .build();

            when(onboardingService.updateTemplate(eq(templateId), any(OnboardingChecklistTemplateRequest.class)))
                    .thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/onboarding/templates/{templateId}", templateId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.name").value("Updated Template"));

            verify(onboardingService).updateTemplate(eq(templateId), any(OnboardingChecklistTemplateRequest.class));
        }

        @Test
        @DisplayName("Should delete template successfully")
        void shouldDeleteTemplateSuccessfully() throws Exception {
            doNothing().when(onboardingService).deleteTemplate(templateId);

            mockMvc.perform(delete("/api/v1/onboarding/templates/{templateId}", templateId))
                    .andExpect(status().isNoContent());

            verify(onboardingService).deleteTemplate(templateId);
        }
    }

    @Nested
    @DisplayName("Onboarding Task Tests")
    class TaskTests {

        @Test
        @DisplayName("Should add template task successfully")
        void shouldAddTemplateTaskSuccessfully() throws Exception {
            OnboardingTemplateTaskRequest request = OnboardingTemplateTaskRequest.builder()
                    .taskName("Complete HR Documentation")
                    .description("Fill out all required HR forms")
                    .build();

            OnboardingTemplateTaskResponse response = OnboardingTemplateTaskResponse.builder()
                    .id(taskId)
                    .templateId(templateId)
                    .taskName("Complete HR Documentation")
                    .build();

            when(onboardingService.addTemplateTask(eq(templateId), any(OnboardingTemplateTaskRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(post("/api/v1/onboarding/templates/{templateId}/tasks", templateId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.templateId").value(templateId.toString()));

            verify(onboardingService).addTemplateTask(eq(templateId), any(OnboardingTemplateTaskRequest.class));
        }

        @Test
        @DisplayName("Should get process tasks")
        void shouldGetProcessTasks() throws Exception {
            List<OnboardingTaskResponse> tasks = Collections.singletonList(taskResponse);

            when(onboardingService.getProcessTasks(processId))
                    .thenReturn(tasks);

            mockMvc.perform(get("/api/v1/onboarding/processes/{processId}/tasks", processId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].processId").value(processId.toString()));

            verify(onboardingService).getProcessTasks(processId);
        }

        @Test
        @DisplayName("Should update task status")
        void shouldUpdateTaskStatus() throws Exception {
            OnboardingTaskResponse completedTask = OnboardingTaskResponse.builder()
                    .id(taskId)
                    .processId(processId)
                    .taskName("Complete HR Documentation")
                    .status(OnboardingTask.TaskStatus.COMPLETED)
                    .build();

            when(onboardingService.updateTaskStatus(eq(taskId), any(OnboardingTask.TaskStatus.class), anyString()))
                    .thenReturn(completedTask);

            mockMvc.perform(patch("/api/v1/onboarding/tasks/{taskId}/status", taskId)
                    .param("status", "COMPLETED")
                    .param("remarks", "Task completed"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("COMPLETED"));

            verify(onboardingService).updateTaskStatus(eq(taskId), any(OnboardingTask.TaskStatus.class), anyString());
        }

        @Test
        @DisplayName("Should update task status without remarks")
        void shouldUpdateTaskStatusWithoutRemarks() throws Exception {
            OnboardingTaskResponse inProgressTask = OnboardingTaskResponse.builder()
                    .id(taskId)
                    .processId(processId)
                    .taskName("Complete HR Documentation")
                    .status(OnboardingTask.TaskStatus.IN_PROGRESS)
                    .build();

            when(onboardingService.updateTaskStatus(eq(taskId), any(OnboardingTask.TaskStatus.class), isNull()))
                    .thenReturn(inProgressTask);

            mockMvc.perform(patch("/api/v1/onboarding/tasks/{taskId}/status", taskId)
                    .param("status", "IN_PROGRESS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

            verify(onboardingService).updateTaskStatus(eq(taskId), any(OnboardingTask.TaskStatus.class), isNull());
        }

        @Test
        @DisplayName("Should get template tasks")
        void shouldGetTemplateTasks() throws Exception {
            OnboardingTemplateTaskResponse templateTask = OnboardingTemplateTaskResponse.builder()
                    .id(taskId)
                    .templateId(templateId)
                    .taskName("Complete HR Documentation")
                    .build();

            List<OnboardingTemplateTaskResponse> tasks = Collections.singletonList(templateTask);

            when(onboardingService.getTemplateTasks(templateId))
                    .thenReturn(tasks);

            mockMvc.perform(get("/api/v1/onboarding/templates/{templateId}/tasks", templateId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)));

            verify(onboardingService).getTemplateTasks(templateId);
        }

        @Test
        @DisplayName("Should update template task")
        void shouldUpdateTemplateTask() throws Exception {
            OnboardingTemplateTaskRequest request = OnboardingTemplateTaskRequest.builder()
                    .taskName("Updated Task Title")
                    .description("Updated description")
                    .build();

            OnboardingTemplateTaskResponse response = OnboardingTemplateTaskResponse.builder()
                    .id(taskId)
                    .templateId(templateId)
                    .taskName("Updated Task Title")
                    .build();

            when(onboardingService.updateTemplateTask(eq(templateId), eq(taskId), any(OnboardingTemplateTaskRequest.class)))
                    .thenReturn(response);

            mockMvc.perform(put("/api/v1/onboarding/templates/{templateId}/tasks/{taskId}", templateId, taskId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.taskName").value("Updated Task Title"));

            verify(onboardingService).updateTemplateTask(eq(templateId), eq(taskId), any(OnboardingTemplateTaskRequest.class));
        }

        @Test
        @DisplayName("Should delete template task")
        void shouldDeleteTemplateTask() throws Exception {
            doNothing().when(onboardingService).deleteTemplateTask(templateId, taskId);

            mockMvc.perform(delete("/api/v1/onboarding/templates/{templateId}/tasks/{taskId}", templateId, taskId))
                    .andExpect(status().isNoContent());

            verify(onboardingService).deleteTemplateTask(templateId, taskId);
        }
    }

    @Nested
    @DisplayName("Onboarding Process Deletion Tests")
    class ProcessDeletionTests {

        @Test
        @DisplayName("Should delete process successfully")
        void shouldDeleteProcessSuccessfully() throws Exception {
            doNothing().when(onboardingService).deleteProcess(processId);

            mockMvc.perform(delete("/api/v1/onboarding/processes/{processId}", processId))
                    .andExpect(status().isNoContent());

            verify(onboardingService).deleteProcess(processId);
        }
    }
}
