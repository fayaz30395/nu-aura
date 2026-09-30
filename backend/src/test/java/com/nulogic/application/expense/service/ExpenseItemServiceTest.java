package com.nulogic.application.expense.service;

import com.nulogic.api.expense.dto.ExpenseItemRequest;
import com.nulogic.api.expense.dto.ExpenseItemResponse;
import com.nulogic.application.document.service.FileStorageService;
import com.nulogic.common.security.TenantContext;
import com.nulogic.domain.expense.ExpenseClaim;
import com.nulogic.domain.expense.ExpenseItem;
import com.nulogic.infrastructure.expense.repository.ExpenseCategoryRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseClaimRepository;
import com.nulogic.infrastructure.expense.repository.ExpenseItemRepository;
import com.nulogic.common.exception.ValidationException;
import com.nulogic.common.security.Permission;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * BUG-E1 regression: an expense item must be able to carry an uploaded receipt, and the
 * owner must be able to read it back.
 *
 * <p>Before this, {@code ExpenseItemRequest} had no receipt fields at all, so even though the
 * entity, the DB columns and the response DTO were all in place, nothing could ever populate
 * them — the UI discarded the upload result and the detail page had no filename to render.</p>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("ExpenseItemService receipt handling (BUG-E1)")
class ExpenseItemServiceTest {

    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");

    @Mock
    private ExpenseItemRepository itemRepository;

    @Mock
    private ExpenseClaimRepository claimRepository;

    @Mock
    private ExpenseCategoryRepository categoryRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private ExpenseClaimService expenseClaimService;

    @InjectMocks
    private ExpenseItemService service;

    private UUID claimId;
    private UUID itemId;

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenant(TENANT_ID);
        claimId = UUID.randomUUID();
        itemId = UUID.randomUUID();

        ExpenseClaim claim = new ExpenseClaim();
        claim.setId(claimId);
        claim.setTenantId(TENANT_ID);
        claim.setClaimNumber("EXP-0001");
        claim.setStatus(ExpenseClaim.ExpenseStatus.DRAFT);
        when(claimRepository.findByIdAndTenantId(claimId, TENANT_ID)).thenReturn(Optional.of(claim));
        when(itemRepository.sumAmountByClaimId(claimId)).thenReturn(new BigDecimal("100.00"));
        when(itemRepository.save(any(ExpenseItem.class))).thenAnswer(inv -> inv.getArgument(0));
        when(categoryRepository.findAllById(any())).thenReturn(List.of());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    private ExpenseItemRequest request() {
        ExpenseItemRequest request = new ExpenseItemRequest();
        request.setDescription("Team lunch");
        request.setAmount(new BigDecimal("100.00"));
        request.setExpenseDate(LocalDate.of(2026, 9, 1));
        return request;
    }

    private ExpenseItem persistedItem(String storagePath, String fileName) {
        ExpenseItem item = new ExpenseItem();
        item.setId(itemId);
        item.setExpenseClaimId(claimId);
        item.setDescription("Team lunch");
        item.setAmount(new BigDecimal("100.00"));
        item.setReceiptStoragePath(storagePath);
        item.setReceiptFileName(fileName);
        return item;
    }

    @Test
    @DisplayName("addItem persists the uploaded receipt against the item")
    void addItemPersistsReceipt() {
        ExpenseItemRequest request = request();
        request.setReceiptStoragePath(TENANT_ID + "/receipts/" + claimId + "/1699_abc.pdf");
        request.setReceiptFileName("lunch-receipt.pdf");

        ExpenseItemResponse response = service.addItem(claimId, request);

        ArgumentCaptor<ExpenseItem> saved = ArgumentCaptor.forClass(ExpenseItem.class);
        verify(itemRepository).save(saved.capture());
        assertThat(saved.getValue().getReceiptStoragePath())
                .isEqualTo(TENANT_ID + "/receipts/" + claimId + "/1699_abc.pdf");
        assertThat(saved.getValue().getReceiptFileName()).isEqualTo("lunch-receipt.pdf");
        assertThat(response.getReceiptFileName()).isEqualTo("lunch-receipt.pdf");
    }

    @Test
    @DisplayName("addItem without a receipt leaves the fields null")
    void addItemWithoutReceiptIsUnchanged() {
        service.addItem(claimId, request());

        ArgumentCaptor<ExpenseItem> saved = ArgumentCaptor.forClass(ExpenseItem.class);
        verify(itemRepository).save(saved.capture());
        assertThat(saved.getValue().getReceiptStoragePath()).isNull();
        assertThat(saved.getValue().getReceiptFileName()).isNull();
    }

    @Test
    @DisplayName("updateItem that omits the receipt does not detach an existing one")
    void updateItemPreservesExistingReceipt() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(TENANT_ID + "/receipts/x/old.pdf", "old.pdf")));

        service.updateItem(claimId, itemId, request());

        ArgumentCaptor<ExpenseItem> saved = ArgumentCaptor.forClass(ExpenseItem.class);
        verify(itemRepository).save(saved.capture());
        assertThat(saved.getValue().getReceiptStoragePath()).isEqualTo(TENANT_ID + "/receipts/x/old.pdf");
        assertThat(saved.getValue().getReceiptFileName()).isEqualTo("old.pdf");
    }

    @Test
    @DisplayName("updateItem replaces the receipt when a new one is supplied")
    void updateItemReplacesReceiptWhenSupplied() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(TENANT_ID + "/receipts/x/old.pdf", "old.pdf")));

        ExpenseItemRequest request = request();
        request.setReceiptStoragePath(TENANT_ID + "/receipts/x/new.pdf");
        request.setReceiptFileName("new.pdf");
        service.updateItem(claimId, itemId, request);

        ArgumentCaptor<ExpenseItem> saved = ArgumentCaptor.forClass(ExpenseItem.class);
        verify(itemRepository).save(saved.capture());
        assertThat(saved.getValue().getReceiptFileName()).isEqualTo("new.pdf");
    }

    @Test
    @DisplayName("openReceipt streams the file recorded on the item")
    void openReceiptStreamsThePersistedPath() {
        String path = TENANT_ID + "/receipts/x/lunch.pdf";
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(path, "lunch receipt.pdf")));
        when(fileStorageService.getFile(path)).thenReturn(new ByteArrayInputStream("pdf".getBytes()));

        ExpenseItemService.ReceiptDownload download = service.openReceipt(claimId, itemId);

        verify(fileStorageService).getFile(path);
        // Sanitised so a stored name can never inject a Content-Disposition header.
        assertThat(download.fileName()).isEqualTo("lunch_receipt.pdf");
    }

    @Test
    @DisplayName("openReceipt refuses an item that belongs to a different claim")
    void openReceiptRejectsClaimMismatch() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(TENANT_ID + "/receipts/x/lunch.pdf", "lunch.pdf")));

        assertThatThrownBy(() -> service.openReceipt(UUID.randomUUID(), itemId))
                .isInstanceOf(EntityNotFoundException.class);
        verify(fileStorageService, never()).getFile(any());
    }

    @Test
    @DisplayName("openReceipt refuses a stored path outside the caller's tenant prefix")
    void openReceiptRejectsForeignTenantPath() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(UUID.randomUUID() + "/receipts/x/lunch.pdf", "lunch.pdf")));

        assertThatThrownBy(() -> service.openReceipt(claimId, itemId))
                .isInstanceOf(EntityNotFoundException.class);
        verify(fileStorageService, never()).getFile(any());
    }

    @Test
    @DisplayName("openReceipt reports a missing receipt instead of streaming nothing")
    void openReceiptRejectsItemWithoutReceipt() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(null, null)));

        assertThatThrownBy(() -> service.openReceipt(claimId, itemId))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("No receipt attached");
        verify(fileStorageService, never()).getFile(any());
    }

    // ─── Security regressions (found by the 2026-09-25 security verification) ────────
    //
    // SEC-E1 (CRITICAL): receiptStoragePath is client-supplied. Persisted verbatim, an employee
    // could point their own expense item at ANY path in the tenant — payslips, employee
    // documents — and stream it through the receipt endpoint, bypassing the category and
    // sensitivity guards that /api/v1/files/download/direct enforces.

    @Test
    @DisplayName("SEC-E1: addItem rejects a receipt path outside the tenant's receipts area")
    void addItemRejectsForeignReceiptPath() {
        ExpenseItemRequest request = request();
        request.setReceiptStoragePath(TENANT_ID + "/payslips/48000000-e001-0000-0000-000000000002/march.pdf");
        request.setReceiptFileName("victim-payslip.pdf");

        assertThatThrownBy(() -> service.addItem(claimId, request))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Invalid receipt reference");
        verify(itemRepository, never()).save(any());
    }

    @Test
    @DisplayName("SEC-E1: addItem rejects a receipt path from another tenant")
    void addItemRejectsOtherTenantReceiptPath() {
        ExpenseItemRequest request = request();
        request.setReceiptStoragePath(UUID.randomUUID() + "/receipts/x/lunch.pdf");

        assertThatThrownBy(() -> service.addItem(claimId, request))
                .isInstanceOf(ValidationException.class);
        verify(itemRepository, never()).save(any());
    }

    @Test
    @DisplayName("SEC-E1: path traversal in a receipt path is rejected, not normalised")
    void addItemRejectsTraversalReceiptPath() {
        ExpenseItemRequest request = request();
        request.setReceiptStoragePath(TENANT_ID + "/receipts/../payslips/march.pdf");

        assertThatThrownBy(() -> service.addItem(claimId, request))
                .isInstanceOf(ValidationException.class);
        verify(itemRepository, never()).save(any());
    }

    @Test
    @DisplayName("SEC-E1: a legitimate receipts path is still accepted")
    void addItemAcceptsOwnReceiptsPath() {
        ExpenseItemRequest request = request();
        request.setReceiptStoragePath(TENANT_ID + "/receipts/" + claimId + "/1699_abc.pdf");
        request.setReceiptFileName("lunch.pdf");

        service.addItem(claimId, request);

        verify(itemRepository).save(any(ExpenseItem.class));
    }

    // SEC-E2 (HIGH): tenant scoping is not authorization — the claim's owner must be checked.

    @Test
    @DisplayName("SEC-E2: openReceipt runs the claim-owner scope check")
    void openReceiptChecksClaimOwnership() {
        String path = TENANT_ID + "/receipts/x/lunch.pdf";
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(path, "lunch.pdf")));
        when(fileStorageService.getFile(path)).thenReturn(new ByteArrayInputStream("pdf".getBytes()));

        service.openReceipt(claimId, itemId);

        verify(expenseClaimService).assertEmployeeReadAccess(any());
    }

    @Test
    @DisplayName("SEC-E2: a denied scope check stops the download before any file is read")
    void openReceiptDeniedScopeDoesNotStream() {
        String path = TENANT_ID + "/receipts/x/lunch.pdf";
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(path, "lunch.pdf")));
        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(expenseClaimService).assertEmployeeReadAccess(any());

        assertThatThrownBy(() -> service.openReceipt(claimId, itemId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(fileStorageService, never()).getFile(any());
    }

    // SEC-E3 (MEDIUM): the {claimId} path variable was accepted and ignored on update.

    @Test
    @DisplayName("SEC-E3: updateItem refuses an item that does not belong to the given claim")
    void updateItemRejectsClaimMismatch() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(null, null)));

        assertThatThrownBy(() -> service.updateItem(UUID.randomUUID(), itemId, request()))
                .isInstanceOf(EntityNotFoundException.class);
        verify(itemRepository, never()).save(any());
    }

    // SEC-E4 (HIGH, 2026-09-25 remediation): the ownership gate was applied to updateItem,
    // getItemsByClaimId and openReceipt but NOT to the two sibling mutating paths. addItem
    // resolved the claim by (claimId, tenantId) alone, and deleteItem did the same by
    // (itemId, tenantId) while discarding {claimId} entirely.
    //
    // The write gate reads EXPENSE:CREATE, not EXPENSE:VIEW: a manager whose VIEW scope is
    // TEAM must not inherit write reach over a reportee's draft claim from it.

    @Test
    @DisplayName("SEC-E4: addItem runs the claim-owner gate against the WRITE permission")
    void addItemChecksClaimOwnership() {
        service.addItem(claimId, request());

        verify(expenseClaimService).assertEmployeeAccess(any(), eq(Permission.EXPENSE_CREATE));
    }

    @Test
    @DisplayName("SEC-E4: a denied owner check stops addItem before anything is persisted")
    void addItemDeniedScopeDoesNotPersist() {
        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(expenseClaimService).assertEmployeeAccess(any(), eq(Permission.EXPENSE_CREATE));

        assertThatThrownBy(() -> service.addItem(claimId, request()))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(itemRepository, never()).save(any());
    }

    @Test
    @DisplayName("SEC-E4: deleteItem runs the claim-owner gate against the WRITE permission")
    void deleteItemChecksClaimOwnership() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(null, null)));

        service.deleteItem(claimId, itemId);

        verify(expenseClaimService).assertEmployeeAccess(any(), eq(Permission.EXPENSE_CREATE));
        verify(itemRepository).delete(any(ExpenseItem.class));
    }

    @Test
    @DisplayName("SEC-E4: a denied owner check stops deleteItem before the row is removed")
    void deleteItemDeniedScopeDoesNotDelete() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(null, null)));
        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(expenseClaimService).assertEmployeeAccess(any(), eq(Permission.EXPENSE_CREATE));

        assertThatThrownBy(() -> service.deleteItem(claimId, itemId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(itemRepository, never()).delete(any(ExpenseItem.class));
    }

    @Test
    @DisplayName("SEC-E3: deleteItem refuses an item that does not belong to the given claim")
    void deleteItemRejectsClaimMismatch() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(null, null)));

        assertThatThrownBy(() -> service.deleteItem(UUID.randomUUID(), itemId))
                .isInstanceOf(EntityNotFoundException.class);
        verify(itemRepository, never()).delete(any(ExpenseItem.class));
    }

    @Test
    @DisplayName("SEC-E3: deleteItem authorization does not depend on {claimId} being supplied")
    void deleteItemStillGatesWhenClaimIdIsAbsent() {
        when(itemRepository.findByIdAndTenantId(itemId, TENANT_ID))
                .thenReturn(Optional.of(persistedItem(null, null)));
        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(expenseClaimService).assertEmployeeAccess(any(), eq(Permission.EXPENSE_CREATE));

        assertThatThrownBy(() -> service.deleteItem(null, itemId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(itemRepository, never()).delete(any(ExpenseItem.class));
    }

    // SEC-E2: the list gate must run on every path, including the claim-missing branch that
    // the earlier `ifPresent` form silently skipped.

    @Test
    @DisplayName("SEC-E2: getItemsByClaimId runs the read gate before returning any item")
    void getItemsByClaimIdChecksClaimOwnership() {
        when(itemRepository.findAllByExpenseClaimId(claimId)).thenReturn(List.of());

        service.getItemsByClaimId(claimId);

        verify(expenseClaimService).assertEmployeeReadAccess(any());
    }

    @Test
    @DisplayName("SEC-E2: a denied read gate returns no items at all")
    void getItemsByClaimIdDeniedScopeReturnsNothing() {
        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(expenseClaimService).assertEmployeeReadAccess(any());

        assertThatThrownBy(() -> service.getItemsByClaimId(claimId))
                .isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(itemRepository, never()).findAllByExpenseClaimId(any());
    }
}
