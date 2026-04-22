package com.hrms.api.helpdesk.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.helpdesk.dto.*;
import com.hrms.application.helpdesk.service.HelpdeskService;
import com.hrms.common.exception.GlobalExceptionHandler;
import com.hrms.common.security.*;
import com.hrms.domain.helpdesk.Ticket;
import com.hrms.common.config.TestMeterRegistryConfig;
import org.springframework.context.annotation.Import;
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

import java.util.*;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(HelpdeskController.class)
@ContextConfiguration(classes = {HelpdeskController.class, GlobalExceptionHandler.class})
@Import(TestMeterRegistryConfig.class)
@AutoConfigureMockMvc(addFilters = false)
@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
@DisplayName("HelpdeskController Unit Tests")
class HelpdeskControllerTest {

    private static final String BASE_URL = "/api/v1/helpdesk";
    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @MockitoBean
    private HelpdeskService helpdeskService;
    @MockitoBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;
    @MockitoBean
    private TenantFilter tenantFilter;
    private UUID ticketId;
    private UUID employeeId;
    private UUID assigneeId;
    private UUID categoryId;
    private TicketResponse ticketResponse;

    @BeforeEach
    void setUp() {
        ticketId = UUID.randomUUID();
        employeeId = UUID.randomUUID();
        assigneeId = UUID.randomUUID();
        categoryId = UUID.randomUUID();

        ticketResponse = TicketResponse.builder()
                .id(ticketId)
                .ticketNumber("TKT-2024-001")
                .employeeId(employeeId)
                .employeeName("John Doe")
                .subject("Cannot access payroll module")
                .description("Getting 403 error when accessing payroll.")
                .priority(Ticket.TicketPriority.HIGH)
                .status(Ticket.TicketStatus.OPEN)
                .build();
    }

    // ===================== Ticket CRUD Tests =====================

    @Nested
    @DisplayName("POST /helpdesk/tickets — Create ticket")
    class CreateTicketTests {

        @Test
        @DisplayName("Should create ticket successfully")
        void shouldCreateTicketSuccessfully() throws Exception {
            TicketRequest request = TicketRequest.builder()
                    .employeeId(employeeId)
                    .subject("Cannot access payroll module")
                    .description("Getting 403 error when accessing payroll.")
                    .priority(Ticket.TicketPriority.HIGH)
                    .build();

            when(helpdeskService.createTicket(any(TicketRequest.class))).thenReturn(ticketResponse);

            mockMvc.perform(post(BASE_URL + "/tickets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(ticketId.toString()))
                    .andExpect(jsonPath("$.ticketNumber").value("TKT-2024-001"))
                    .andExpect(jsonPath("$.status").value("OPEN"))
                    .andExpect(jsonPath("$.priority").value("HIGH"));

            verify(helpdeskService).createTicket(any(TicketRequest.class));
        }

        @Test
        @DisplayName("Should return 400 when required fields are missing")
        void shouldReturn400WhenRequiredFieldsMissing() throws Exception {
            TicketRequest request = new TicketRequest();
            // Missing employeeId, subject, description, priority

            mockMvc.perform(post(BASE_URL + "/tickets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 400 when subject exceeds max length")
        void shouldReturn400WhenSubjectExceedsMaxLength() throws Exception {
            TicketRequest request = TicketRequest.builder()
                    .employeeId(employeeId)
                    .subject("S".repeat(201))  // exceeds 200 chars
                    .description("Valid description")
                    .priority(Ticket.TicketPriority.LOW)
                    .build();

            mockMvc.perform(post(BASE_URL + "/tickets")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("PUT /helpdesk/tickets/{id} — Update ticket")
    class UpdateTicketTests {

        @Test
        @DisplayName("Should update ticket successfully")
        void shouldUpdateTicketSuccessfully() throws Exception {
            TicketRequest request = TicketRequest.builder()
                    .employeeId(employeeId)
                    .subject("Updated subject")
                    .description("Updated description for the issue.")
                    .priority(Ticket.TicketPriority.MEDIUM)
                    .build();

            TicketResponse updated = TicketResponse.builder()
                    .id(ticketId)
                    .ticketNumber("TKT-2024-001")
                    .subject("Updated subject")
                    .priority(Ticket.TicketPriority.MEDIUM)
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            when(helpdeskService.updateTicket(eq(ticketId), any(TicketRequest.class))).thenReturn(updated);

            mockMvc.perform(put(BASE_URL + "/tickets/{id}", ticketId)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.subject").value("Updated subject"))
                    .andExpect(jsonPath("$.priority").value("MEDIUM"));

            verify(helpdeskService).updateTicket(eq(ticketId), any(TicketRequest.class));
        }
    }

    @Nested
    @DisplayName("GET /helpdesk/tickets/{id} — Get ticket by ID")
    class GetTicketByIdTests {

        @Test
        @DisplayName("Should return ticket by ID")
        void shouldReturnTicketById() throws Exception {
            when(helpdeskService.getTicketById(ticketId)).thenReturn(ticketResponse);

            mockMvc.perform(get(BASE_URL + "/tickets/{id}", ticketId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(ticketId.toString()))
                    .andExpect(jsonPath("$.ticketNumber").value("TKT-2024-001"))
                    .andExpect(jsonPath("$.employeeId").value(employeeId.toString()));

            verify(helpdeskService).getTicketById(ticketId);
        }
    }

    @Nested
    @DisplayName("GET /helpdesk/tickets/number/{ticketNumber} — Get by ticket number")
    class GetTicketByNumberTests {

        @Test
        @DisplayName("Should return ticket by ticket number")
        void shouldReturnTicketByNumber() throws Exception {
            when(helpdeskService.getTicketByNumber("TKT-2024-001")).thenReturn(ticketResponse);

            mockMvc.perform(get(BASE_URL + "/tickets/number/TKT-2024-001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.ticketNumber").value("TKT-2024-001"));

            verify(helpdeskService).getTicketByNumber("TKT-2024-001");
        }
    }

    @Nested
    @DisplayName("GET /helpdesk/tickets — Get all tickets")
    class GetAllTicketsTests {

        @Test
        @DisplayName("Should return paginated list of tickets")
        void shouldReturnPaginatedTickets() throws Exception {
            Page<TicketResponse> page = new PageImpl<>(
                    List.of(ticketResponse), Pageable.ofSize(20), 1
            );

            when(helpdeskService.getAllTickets(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/tickets")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.totalElements").value(1));

            verify(helpdeskService).getAllTickets(any(Pageable.class));
        }
    }

    @Nested
    @DisplayName("DELETE /helpdesk/tickets/{id} — Delete ticket")
    class DeleteTicketTests {

        @Test
        @DisplayName("Should delete ticket successfully")
        void shouldDeleteTicketSuccessfully() throws Exception {
            doNothing().when(helpdeskService).deleteTicket(ticketId);

            mockMvc.perform(delete(BASE_URL + "/tickets/{id}", ticketId))
                    .andExpect(status().isNoContent());

            verify(helpdeskService).deleteTicket(ticketId);
        }
    }

    // ===================== Ticket Assignment Tests =====================

    @Nested
    @DisplayName("PATCH /helpdesk/tickets/{id}/assign — Assign ticket")
    class AssignTicketTests {

        @Test
        @DisplayName("Should assign ticket to agent successfully")
        void shouldAssignTicketToAgentSuccessfully() throws Exception {
            TicketResponse assigned = TicketResponse.builder()
                    .id(ticketId)
                    .ticketNumber("TKT-2024-001")
                    .assignedTo(assigneeId)
                    .assignedToName("Support Agent")
                    .status(Ticket.TicketStatus.IN_PROGRESS)
                    .build();

            when(helpdeskService.assignTicket(ticketId, assigneeId)).thenReturn(assigned);

            mockMvc.perform(patch(BASE_URL + "/tickets/{id}/assign", ticketId)
                            .param("assigneeId", assigneeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.assignedTo").value(assigneeId.toString()))
                    .andExpect(jsonPath("$.assignedToName").value("Support Agent"));

            verify(helpdeskService).assignTicket(ticketId, assigneeId);
        }

        @Test
        @DisplayName("Should reassign ticket to different agent")
        void shouldReassignTicketToDifferentAgent() throws Exception {
            UUID newAssigneeId = UUID.randomUUID();
            TicketResponse reassigned = TicketResponse.builder()
                    .id(ticketId)
                    .assignedTo(newAssigneeId)
                    .status(Ticket.TicketStatus.IN_PROGRESS)
                    .build();

            when(helpdeskService.assignTicket(ticketId, newAssigneeId)).thenReturn(reassigned);

            mockMvc.perform(patch(BASE_URL + "/tickets/{id}/assign", ticketId)
                            .param("assigneeId", newAssigneeId.toString()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.assignedTo").value(newAssigneeId.toString()));
        }
    }

    @Nested
    @DisplayName("PATCH /helpdesk/tickets/{id}/status — Update ticket status")
    class UpdateTicketStatusTests {

        @Test
        @DisplayName("Should update ticket status to IN_PROGRESS")
        void shouldUpdateTicketStatusToInProgress() throws Exception {
            TicketResponse inProgress = TicketResponse.builder()
                    .id(ticketId)
                    .status(Ticket.TicketStatus.IN_PROGRESS)
                    .build();

            when(helpdeskService.updateTicketStatus(ticketId, Ticket.TicketStatus.IN_PROGRESS))
                    .thenReturn(inProgress);

            mockMvc.perform(patch(BASE_URL + "/tickets/{id}/status", ticketId)
                            .param("status", "IN_PROGRESS"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

            verify(helpdeskService).updateTicketStatus(ticketId, Ticket.TicketStatus.IN_PROGRESS);
        }

        @Test
        @DisplayName("Should update ticket status to RESOLVED")
        void shouldUpdateTicketStatusToResolved() throws Exception {
            TicketResponse resolved = TicketResponse.builder()
                    .id(ticketId)
                    .status(Ticket.TicketStatus.RESOLVED)
                    .build();

            when(helpdeskService.updateTicketStatus(ticketId, Ticket.TicketStatus.RESOLVED))
                    .thenReturn(resolved);

            mockMvc.perform(patch(BASE_URL + "/tickets/{id}/status", ticketId)
                            .param("status", "RESOLVED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("RESOLVED"));
        }

        @Test
        @DisplayName("Should update ticket status to CLOSED")
        void shouldUpdateTicketStatusToClosed() throws Exception {
            TicketResponse closed = TicketResponse.builder()
                    .id(ticketId)
                    .status(Ticket.TicketStatus.CLOSED)
                    .build();

            when(helpdeskService.updateTicketStatus(ticketId, Ticket.TicketStatus.CLOSED))
                    .thenReturn(closed);

            mockMvc.perform(patch(BASE_URL + "/tickets/{id}/status", ticketId)
                            .param("status", "CLOSED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("CLOSED"));
        }
    }

    // ===================== Ticket Filtering Tests =====================

    @Nested
    @DisplayName("Ticket filtering endpoints")
    class TicketFilteringTests {

        @Test
        @DisplayName("Should get tickets by employee")
        void shouldGetTicketsByEmployee() throws Exception {
            when(helpdeskService.getTicketsByEmployee(employeeId)).thenReturn(List.of(ticketResponse));

            mockMvc.perform(get(BASE_URL + "/tickets/employee/{employeeId}", employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].employeeId").value(employeeId.toString()));

            verify(helpdeskService).getTicketsByEmployee(employeeId);
        }

        @Test
        @DisplayName("Should get tickets by assignee")
        void shouldGetTicketsByAssignee() throws Exception {
            TicketResponse assignedTicket = TicketResponse.builder()
                    .id(ticketId)
                    .assignedTo(assigneeId)
                    .status(Ticket.TicketStatus.IN_PROGRESS)
                    .build();

            when(helpdeskService.getTicketsByAssignee(assigneeId)).thenReturn(List.of(assignedTicket));

            mockMvc.perform(get(BASE_URL + "/tickets/assignee/{assigneeId}", assigneeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].assignedTo").value(assigneeId.toString()));
        }

        @Test
        @DisplayName("Should get tickets by status OPEN")
        void shouldGetTicketsByStatus() throws Exception {
            when(helpdeskService.getTicketsByStatus(Ticket.TicketStatus.OPEN))
                    .thenReturn(List.of(ticketResponse));

            mockMvc.perform(get(BASE_URL + "/tickets/status/{status}", "OPEN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].status").value("OPEN"));

            verify(helpdeskService).getTicketsByStatus(Ticket.TicketStatus.OPEN);
        }

        @Test
        @DisplayName("Should get tickets by category")
        void shouldGetTicketsByCategory() throws Exception {
            TicketResponse categorized = TicketResponse.builder()
                    .id(ticketId)
                    .categoryId(categoryId)
                    .status(Ticket.TicketStatus.OPEN)
                    .build();

            when(helpdeskService.getTicketsByCategory(categoryId)).thenReturn(List.of(categorized));

            mockMvc.perform(get(BASE_URL + "/tickets/category/{categoryId}", categoryId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].categoryId").value(categoryId.toString()));
        }
    }

    // ===================== Comment Tests =====================

    @Nested
    @DisplayName("Comment management")
    class CommentTests {

        @Test
        @DisplayName("Should add comment to ticket")
        void shouldAddCommentToTicket() throws Exception {
            TicketCommentRequest request = TicketCommentRequest.builder()
                    .ticketId(ticketId)
                    .commenterId(employeeId)
                    .comment("We are investigating this issue.")
                    .build();

            TicketCommentResponse response = TicketCommentResponse.builder()
                    .id(UUID.randomUUID())
                    .ticketId(ticketId)
                    .build();

            when(helpdeskService.addComment(any(TicketCommentRequest.class))).thenReturn(response);

            mockMvc.perform(post(BASE_URL + "/comments")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.ticketId").value(ticketId.toString()));

            verify(helpdeskService).addComment(any(TicketCommentRequest.class));
        }

        @Test
        @DisplayName("Should get comments for ticket")
        void shouldGetCommentsForTicket() throws Exception {
            TicketCommentResponse comment = TicketCommentResponse.builder()
                    .id(UUID.randomUUID())
                    .ticketId(ticketId)
                    .build();

            when(helpdeskService.getCommentsByTicket(ticketId)).thenReturn(List.of(comment));

            mockMvc.perform(get(BASE_URL + "/comments/ticket/{ticketId}", ticketId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].ticketId").value(ticketId.toString()));
        }

        @Test
        @DisplayName("Should delete comment")
        void shouldDeleteComment() throws Exception {
            UUID commentId = UUID.randomUUID();
            doNothing().when(helpdeskService).deleteComment(commentId);

            mockMvc.perform(delete(BASE_URL + "/comments/{id}", commentId))
                    .andExpect(status().isNoContent());

            verify(helpdeskService).deleteComment(commentId);
        }
    }

    // ===================== Category Tests =====================

    @Nested
    @DisplayName("Category management")
    class CategoryTests {

        @Test
        @DisplayName("Should create ticket category")
        void shouldCreateTicketCategory() throws Exception {
            TicketCategoryRequest request = TicketCategoryRequest.builder()
                    .name("IT Support")
                    .description("IT related issues")
                    .build();

            TicketCategoryResponse response = TicketCategoryResponse.builder()
                    .id(categoryId)
                    .name("IT Support")
                    .isActive(true)
                    .build();

            when(helpdeskService.createCategory(any(TicketCategoryRequest.class))).thenReturn(response);

            mockMvc.perform(post(BASE_URL + "/categories")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.name").value("IT Support"))
                    .andExpect(jsonPath("$.isActive").value(true));
        }

        @Test
        @DisplayName("Should get all categories")
        void shouldGetAllCategories() throws Exception {
            TicketCategoryResponse cat1 = TicketCategoryResponse.builder()
                    .id(UUID.randomUUID()).name("IT Support").isActive(true).build();
            TicketCategoryResponse cat2 = TicketCategoryResponse.builder()
                    .id(UUID.randomUUID()).name("HR Queries").isActive(true).build();

            when(helpdeskService.getAllCategories()).thenReturn(List.of(cat1, cat2));

            mockMvc.perform(get(BASE_URL + "/categories"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)));
        }

        @Test
        @DisplayName("Should get active categories only")
        void shouldGetActiveCategories() throws Exception {
            TicketCategoryResponse active = TicketCategoryResponse.builder()
                    .id(UUID.randomUUID()).name("Active Category").isActive(true).build();

            when(helpdeskService.getActiveCategories()).thenReturn(List.of(active));

            mockMvc.perform(get(BASE_URL + "/categories/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].isActive").value(true));
        }

        @Test
        @DisplayName("Should delete category")
        void shouldDeleteCategory() throws Exception {
            doNothing().when(helpdeskService).deleteCategory(categoryId);

            mockMvc.perform(delete(BASE_URL + "/categories/{id}", categoryId))
                    .andExpect(status().isNoContent());

            verify(helpdeskService).deleteCategory(categoryId);
        }
    }

    // ===================== Permission Annotation Tests =====================

    @Nested
    @DisplayName("Permission annotation verification")
    class PermissionAnnotationTests {

        @Test
        @DisplayName("createTicket should require EMPLOYEE_VIEW_SELF permission")
        void createTicketShouldRequireEmployeeViewSelf() throws Exception {
            var method = HelpdeskController.class.getMethod("createTicket", TicketRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.EMPLOYEE_VIEW_SELF));
        }

        @Test
        @DisplayName("updateTicket should require HELPDESK_TICKET_RESOLVE permission")
        void updateTicketShouldRequireHelpdeskTicketResolve() throws Exception {
            var method = HelpdeskController.class.getMethod(
                    "updateTicket", UUID.class, TicketRequest.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.HELPDESK_TICKET_RESOLVE));
        }

        @Test
        @DisplayName("assignTicket should require HELPDESK_TICKET_ASSIGN permission")
        void assignTicketShouldRequireHelpdeskTicketAssign() throws Exception {
            var method = HelpdeskController.class.getMethod(
                    "assignTicket", UUID.class, UUID.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.HELPDESK_TICKET_ASSIGN));
        }

        @Test
        @DisplayName("deleteTicket should require HELPDESK_TICKET_MANAGE permission")
        void deleteTicketShouldRequireHelpdeskTicketManage() throws Exception {
            var method = HelpdeskController.class.getMethod("deleteTicket", UUID.class);
            var annotation = method.getAnnotation(RequiresPermission.class);
            Assertions.assertNotNull(annotation);
            Assertions.assertTrue(
                    java.util.Arrays.asList(annotation.value()[0]).contains(Permission.HELPDESK_TICKET_MANAGE));
        }
    }
}
