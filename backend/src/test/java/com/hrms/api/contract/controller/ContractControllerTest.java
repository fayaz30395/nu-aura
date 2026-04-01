package com.hrms.api.contract.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hrms.api.contract.dto.*;
import com.hrms.application.contract.service.ContractService;
import com.hrms.application.contract.service.ContractSignatureService;
import com.hrms.domain.contract.ContractStatus;
import com.hrms.domain.contract.ContractType;
import com.hrms.domain.contract.SignatureStatus;
import com.hrms.domain.contract.SignerRole;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for ContractController.
 * Verifies REST endpoint behaviour, HTTP status codes, and request/response mapping.
 */
@WebMvcTest(ContractController.class)
@ContextConfiguration(classes = {ContractController.class})
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("ContractController Tests")
class ContractControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ContractService contractService;

    @MockitoBean
    private ContractSignatureService signatureService;

    @MockitoBean
    private JpaMetamodelMappingContext jpaMetamodelMappingContext;


    private static final String BASE_URL = "/api/v1/contracts";

    @Nested
    @DisplayName("POST /api/v1/contracts")
    class CreateContractEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 201 when contract created")
        void shouldReturn201WhenContractCreated() throws Exception {
            // Given
            CreateContractRequest request = new CreateContractRequest();
            request.setTitle("Employment Contract");
            request.setType(ContractType.EMPLOYMENT);
            request.setStartDate(LocalDate.now());

            ContractDto responseDto = ContractDto.builder()
                    .id(UUID.randomUUID())
                    .title("Employment Contract")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.DRAFT)
                    .build();

            when(contractService.createContract(any(CreateContractRequest.class)))
                    .thenReturn(responseDto);

            // When/Then
            mockMvc.perform(post(BASE_URL)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.title").value("Employment Contract"))
                    .andExpect(jsonPath("$.status").value("DRAFT"));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/contracts/{contractId}")
    class GetContractEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 200 with contract details")
        void shouldReturn200WithContractDetails() throws Exception {
            // Given
            UUID contractId = UUID.randomUUID();
            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .title("NDA")
                    .type(ContractType.NDA)
                    .status(ContractStatus.ACTIVE)
                    .signatureCount(2)
                    .pendingSignatureCount(0)
                    .build();

            when(contractService.getContractById(contractId)).thenReturn(dto);

            // When/Then
            mockMvc.perform(get(BASE_URL + "/" + contractId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("NDA"))
                    .andExpect(jsonPath("$.signatureCount").value(2));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/contracts")
    class GetAllContractsEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return paginated list of contracts")
        void shouldReturnPaginatedContracts() throws Exception {
            // Given
            ContractListDto listDto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Test Contract")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.DRAFT)
                    .build();

            Page<ContractListDto> page = new PageImpl<>(List.of(listDto));
            when(contractService.getAllContracts(any(Pageable.class))).thenReturn(page);

            // When/Then
            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.totalElements").value(1));
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/contracts/{contractId}")
    class UpdateContractEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 200 when contract updated")
        void shouldReturn200WhenContractUpdated() throws Exception {
            // Given
            UUID contractId = UUID.randomUUID();
            UpdateContractRequest request = new UpdateContractRequest();
            request.setTitle("Updated Title");
            request.setValue(new BigDecimal("75000"));

            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .title("Updated Title")
                    .build();

            when(contractService.updateContract(eq(contractId), any(UpdateContractRequest.class)))
                    .thenReturn(dto);

            // When/Then
            mockMvc.perform(put(BASE_URL + "/" + contractId)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.title").value("Updated Title"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/contracts/{contractId}")
    class DeleteContractEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return 204 when contract deleted")
        void shouldReturn204WhenContractDeleted() throws Exception {
            // Given
            UUID contractId = UUID.randomUUID();
            doNothing().when(contractService).deleteContract(contractId);

            // When/Then
            mockMvc.perform(delete(BASE_URL + "/" + contractId)
                            .with(csrf()))
                    .andExpect(status().isNoContent());

            verify(contractService).deleteContract(contractId);
        }
    }

    @Nested
    @DisplayName("Status Transition Endpoints")
    class StatusTransitionEndpoints {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should mark contract as pending review")
        void shouldMarkAsPendingReview() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .status(ContractStatus.PENDING_REVIEW)
                    .build();
            when(contractService.markAsPendingReview(contractId)).thenReturn(dto);

            mockMvc.perform(patch(BASE_URL + "/" + contractId + "/mark-pending-review")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PENDING_REVIEW"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should activate contract")
        void shouldActivateContract() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .status(ContractStatus.ACTIVE)
                    .build();
            when(contractService.markAsActive(contractId)).thenReturn(dto);

            mockMvc.perform(patch(BASE_URL + "/" + contractId + "/mark-active")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACTIVE"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should terminate contract")
        void shouldTerminateContract() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .status(ContractStatus.TERMINATED)
                    .build();
            when(contractService.terminateContract(contractId)).thenReturn(dto);

            mockMvc.perform(patch(BASE_URL + "/" + contractId + "/terminate")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("TERMINATED"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should renew contract")
        void shouldRenewContract() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .status(ContractStatus.RENEWED)
                    .build();
            when(contractService.renewContract(contractId)).thenReturn(dto);

            mockMvc.perform(patch(BASE_URL + "/" + contractId + "/renew")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("RENEWED"));
        }
    }

    @Nested
    @DisplayName("Expiry & Filter Endpoints")
    class ExpiryAndFilterEndpoints {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return expiring contracts")
        void shouldReturnExpiringContracts() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Expiring Soon")
                    .status(ContractStatus.ACTIVE)
                    .build();

            when(contractService.getExpiringContracts(eq(30), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(dto)));

            mockMvc.perform(get(BASE_URL + "/expiring")
                            .param("days", "30"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].title").value("Expiring Soon"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return contracts by status")
        void shouldReturnContractsByStatus() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Active Contract")
                    .status(ContractStatus.ACTIVE)
                    .build();
            Page<ContractListDto> page = new PageImpl<>(List.of(dto));

            when(contractService.getContractsByStatus(eq(ContractStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/status/ACTIVE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("ACTIVE"));
        }
    }

    @Nested
    @DisplayName("Version History Endpoint")
    class VersionHistoryEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return version history")
        void shouldReturnVersionHistory() throws Exception {
            UUID contractId = UUID.randomUUID();
            Map<String, Object> v1 = Map.of("versionNumber", 1, "changeNotes", "Initial");
            Map<String, Object> v2 = Map.of("versionNumber", 2, "changeNotes", "Updated");

            when(contractService.getVersionHistory(eq(contractId), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(v2, v1)));

            mockMvc.perform(get(BASE_URL + "/" + contractId + "/versions"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(2));
        }
    }

    @Nested
    @DisplayName("Filtering by Type Endpoint")
    class FilterByTypeEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return contracts by type NDA")
        void shouldReturnContractsByType() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("NDA Agreement")
                    .type(ContractType.NDA)
                    .status(ContractStatus.ACTIVE)
                    .build();
            Page<ContractListDto> page = new PageImpl<>(List.of(dto));

            when(contractService.getContractsByType(eq(ContractType.NDA), any(org.springframework.data.domain.Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/type/NDA"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].type").value("NDA"));
        }
    }

    @Nested
    @DisplayName("Filter by Employee Endpoint")
    class FilterByEmployeeEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return contracts for a specific employee")
        void shouldReturnContractsForEmployee() throws Exception {
            UUID employeeId = UUID.randomUUID();
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Employee Contract")
                    .type(ContractType.EMPLOYMENT)
                    .status(ContractStatus.ACTIVE)
                    .build();
            Page<ContractListDto> page = new PageImpl<>(List.of(dto));

            when(contractService.getEmployeeContracts(eq(employeeId), any(org.springframework.data.domain.Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/employee/" + employeeId))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].title").value("Employee Contract"));
        }
    }

    @Nested
    @DisplayName("Search Endpoint")
    class SearchEndpoint {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should search contracts by keyword")
        void shouldSearchContractsByKeyword() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Freelance Agreement")
                    .type(ContractType.FREELANCER)
                    .status(ContractStatus.ACTIVE)
                    .build();
            Page<ContractListDto> page = new PageImpl<>(List.of(dto));

            when(contractService.searchContracts(eq("Freelance"), any(org.springframework.data.domain.Pageable.class)))
                    .thenReturn(page);

            mockMvc.perform(get(BASE_URL + "/search").param("search", "Freelance"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].title").value("Freelance Agreement"));
        }
    }

    @Nested
    @DisplayName("Expiry Tracking Endpoints")
    class ExpiryTrackingEndpoints {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return expired contracts")
        void shouldReturnExpiredContracts() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Expired Contract")
                    .status(ContractStatus.EXPIRED)
                    .build();

            when(contractService.getExpiredContracts(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(dto)));

            mockMvc.perform(get(BASE_URL + "/expired"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("EXPIRED"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return active contracts list")
        void shouldReturnActiveContractsList() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Active Employment")
                    .status(ContractStatus.ACTIVE)
                    .build();

            when(contractService.getActiveContracts(any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(dto)));

            mockMvc.perform(get(BASE_URL + "/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content[0].status").value("ACTIVE"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should return contracts expiring in custom days window")
        void shouldReturnContractsExpiringInCustomDays() throws Exception {
            ContractListDto dto = ContractListDto.builder()
                    .id(UUID.randomUUID())
                    .title("Expiring in 7 days")
                    .status(ContractStatus.ACTIVE)
                    .build();

            when(contractService.getExpiringContracts(eq(7), any(Pageable.class)))
                    .thenReturn(new PageImpl<>(List.of(dto)));

            mockMvc.perform(get(BASE_URL + "/expiring").param("days", "7"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content.length()").value(1));
        }
    }

    @Nested
    @DisplayName("Signature Management Endpoints")
    class SignatureManagementEndpoints {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should send contract for signing")
        void shouldSendContractForSigning() throws Exception {
            UUID contractId = UUID.randomUUID();
            SendForSigningRequest request = new SendForSigningRequest();
            request.setSignerName("John Signer");
            request.setSignerEmail("signer@example.com");

            ContractSignatureDto signatureDto =
                    ContractSignatureDto.builder()
                            .id(UUID.randomUUID())
                            .contractId(contractId)
                            .signerEmail("signer@example.com")
                            .status(SignatureStatus.PENDING)
                            .build();

            when(signatureService.sendForSigning(eq(contractId), any()))
                    .thenReturn(signatureDto);

            mockMvc.perform(post(BASE_URL + "/" + contractId + "/send-for-signing")
                            .with(csrf())
                            .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.signerEmail").value("signer@example.com"))
                    .andExpect(jsonPath("$.status").value("PENDING"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should get all signatures for a contract")
        void shouldGetAllSignaturesForContract() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractSignatureDto sig1 =
                    ContractSignatureDto.builder()
                            .id(UUID.randomUUID())
                            .contractId(contractId)
                            .signerEmail("alice@example.com")
                            .status(SignatureStatus.SIGNED)
                            .build();
            ContractSignatureDto sig2 =
                    ContractSignatureDto.builder()
                            .id(UUID.randomUUID())
                            .contractId(contractId)
                            .signerEmail("bob@example.com")
                            .status(SignatureStatus.PENDING)
                            .build();

            when(signatureService.getContractSignatures(contractId)).thenReturn(List.of(sig1, sig2));

            mockMvc.perform(get(BASE_URL + "/" + contractId + "/signatures"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should get pending signatures for a contract")
        void shouldGetPendingSignaturesForContract() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractSignatureDto pending =
                    ContractSignatureDto.builder()
                            .id(UUID.randomUUID())
                            .contractId(contractId)
                            .signerEmail("pending@example.com")
                            .status(SignatureStatus.PENDING)
                            .build();

            when(signatureService.getPendingSignatures(contractId)).thenReturn(List.of(pending));

            mockMvc.perform(get(BASE_URL + "/" + contractId + "/signatures/pending"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].status").value("PENDING"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should get signature summary for contract")
        void shouldGetSignatureSummary() throws Exception {
            UUID contractId = UUID.randomUUID();
            Map<String, Integer> summary = Map.of("SIGNED", 2, "PENDING", 1, "DECLINED", 0);

            when(signatureService.getSignatureSummary(contractId)).thenReturn(summary);

            mockMvc.perform(get(BASE_URL + "/" + contractId + "/signatures/summary"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.SIGNED").value(2))
                    .andExpect(jsonPath("$.PENDING").value(1));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should record a signature")
        void shouldRecordSignature() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractSignatureDto signed =
                    ContractSignatureDto.builder()
                            .id(UUID.randomUUID())
                            .contractId(contractId)
                            .signerEmail("signer@example.com")
                            .status(SignatureStatus.SIGNED)
                            .build();

            when(signatureService.recordSignature(
                    eq(contractId), anyString(), anyString(), any()))
                    .thenReturn(signed);

            mockMvc.perform(post(BASE_URL + "/" + contractId + "/record-signature")
                            .with(csrf())
                            .param("signerEmail", "signer@example.com")
                            .param("signatureImageUrl", "https://storage/sig.png"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("SIGNED"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should record decline to sign")
        void shouldRecordDeclineSignature() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractSignatureDto declined =
                    ContractSignatureDto.builder()
                            .id(UUID.randomUUID())
                            .contractId(contractId)
                            .signerEmail("signer@example.com")
                            .status(SignatureStatus.DECLINED)
                            .build();

            when(signatureService.declineSignature(eq(contractId), anyString()))
                    .thenReturn(declined);

            mockMvc.perform(post(BASE_URL + "/" + contractId + "/decline-signature")
                            .with(csrf())
                            .param("signerEmail", "signer@example.com"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("DECLINED"));
        }
    }

    @Nested
    @DisplayName("Status Transition — Pending Signatures")
    class PendingSignaturesTransition {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("Should mark contract as pending signatures")
        void shouldMarkAsPendingSignatures() throws Exception {
            UUID contractId = UUID.randomUUID();
            ContractDto dto = ContractDto.builder()
                    .id(contractId)
                    .status(ContractStatus.PENDING_SIGNATURES)
                    .build();
            when(contractService.markAsPendingSignatures(contractId)).thenReturn(dto);

            mockMvc.perform(patch(BASE_URL + "/" + contractId + "/mark-pending-signatures")
                            .with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("PENDING_SIGNATURES"));
        }
    }
}
