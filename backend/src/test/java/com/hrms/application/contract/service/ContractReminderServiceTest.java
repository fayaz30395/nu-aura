package com.hrms.application.contract.service;

import com.hrms.common.security.TenantContext;
import com.hrms.domain.contract.ContractReminder;
import com.hrms.domain.contract.ReminderType;
import com.hrms.infrastructure.contract.repository.ContractReminderRepository;
import com.hrms.infrastructure.contract.repository.ContractRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ContractReminderService.
 * Covers reminder creation, update, completion, and queries.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ContractReminderService Tests")
class ContractReminderServiceTest {

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final UUID CONTRACT_ID = UUID.randomUUID();

    @Mock
    private ContractReminderRepository reminderRepository;

    @Mock
    private ContractRepository contractRepository;

    @InjectMocks
    private ContractReminderService reminderService;

    @Captor
    private ArgumentCaptor<ContractReminder> reminderCaptor;

    private MockedStatic<TenantContext> tenantContextMock;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::requireCurrentTenant).thenReturn(TENANT_ID);
        tenantContextMock.when(TenantContext::getCurrentTenant).thenReturn(TENANT_ID);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    @Nested
    @DisplayName("createOrUpdateExpiryReminder")
    class CreateOrUpdateExpiryReminder {

        @Test
        @DisplayName("Should create new expiry reminder when none exists")
        void shouldCreateNewExpiryReminder() {
            // Given
            LocalDate expiryDate = LocalDate.now().plusMonths(1);
            when(reminderRepository.findPendingReminder(CONTRACT_ID, ReminderType.EXPIRY))
                    .thenReturn(Optional.empty());
            when(reminderRepository.save(any(ContractReminder.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            reminderService.createOrUpdateExpiryReminder(CONTRACT_ID, expiryDate);

            // Then
            verify(reminderRepository).save(reminderCaptor.capture());
            ContractReminder saved = reminderCaptor.getValue();

            assertThat(saved.getTenantId()).isEqualTo(TENANT_ID);
            assertThat(saved.getContractId()).isEqualTo(CONTRACT_ID);
            assertThat(saved.getReminderDate()).isEqualTo(expiryDate);
            assertThat(saved.getReminderType()).isEqualTo(ReminderType.EXPIRY);
            assertThat(saved.getIsCompleted()).isFalse();
        }

        @Test
        @DisplayName("Should update existing expiry reminder date")
        void shouldUpdateExistingExpiryReminder() {
            // Given
            LocalDate newExpiryDate = LocalDate.now().plusMonths(2);
            ContractReminder existing = ContractReminder.builder()
                    .contractId(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .reminderDate(LocalDate.now().plusMonths(1))
                    .reminderType(ReminderType.EXPIRY)
                    .isCompleted(false)
                    .build();
            existing.setId(UUID.randomUUID());

            when(reminderRepository.findPendingReminder(CONTRACT_ID, ReminderType.EXPIRY))
                    .thenReturn(Optional.of(existing));
            when(reminderRepository.save(any(ContractReminder.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            reminderService.createOrUpdateExpiryReminder(CONTRACT_ID, newExpiryDate);

            // Then
            verify(reminderRepository).save(reminderCaptor.capture());
            assertThat(reminderCaptor.getValue().getReminderDate()).isEqualTo(newExpiryDate);
        }
    }

    @Nested
    @DisplayName("createOrUpdateRenewalReminder")
    class CreateOrUpdateRenewalReminder {

        @Test
        @DisplayName("Should create new renewal reminder when none exists")
        void shouldCreateNewRenewalReminder() {
            // Given
            LocalDate renewalDate = LocalDate.now().plusDays(30);
            when(reminderRepository.findPendingReminder(CONTRACT_ID, ReminderType.RENEWAL))
                    .thenReturn(Optional.empty());
            when(reminderRepository.save(any(ContractReminder.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            reminderService.createOrUpdateRenewalReminder(CONTRACT_ID, renewalDate);

            // Then
            verify(reminderRepository).save(reminderCaptor.capture());
            ContractReminder saved = reminderCaptor.getValue();

            assertThat(saved.getReminderType()).isEqualTo(ReminderType.RENEWAL);
            assertThat(saved.getContractId()).isEqualTo(CONTRACT_ID);
            assertThat(saved.getTenantId()).isEqualTo(TENANT_ID);
        }

        @Test
        @DisplayName("Should update existing renewal reminder")
        void shouldUpdateExistingRenewalReminder() {
            // Given
            LocalDate newDate = LocalDate.now().plusDays(60);
            ContractReminder existing = ContractReminder.builder()
                    .contractId(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .reminderDate(LocalDate.now().plusDays(30))
                    .reminderType(ReminderType.RENEWAL)
                    .isCompleted(false)
                    .build();
            existing.setId(UUID.randomUUID());

            when(reminderRepository.findPendingReminder(CONTRACT_ID, ReminderType.RENEWAL))
                    .thenReturn(Optional.of(existing));
            when(reminderRepository.save(any(ContractReminder.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            reminderService.createOrUpdateRenewalReminder(CONTRACT_ID, newDate);

            // Then
            verify(reminderRepository).save(reminderCaptor.capture());
            assertThat(reminderCaptor.getValue().getReminderDate()).isEqualTo(newDate);
        }
    }

    @Nested
    @DisplayName("createOrUpdateReviewReminder")
    class CreateOrUpdateReviewReminder {

        @Test
        @DisplayName("Should create new review reminder when none exists")
        void shouldCreateNewReviewReminder() {
            // Given
            LocalDate reviewDate = LocalDate.now().plusDays(14);
            when(reminderRepository.findPendingReminder(CONTRACT_ID, ReminderType.REVIEW))
                    .thenReturn(Optional.empty());
            when(reminderRepository.save(any(ContractReminder.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            reminderService.createOrUpdateReviewReminder(CONTRACT_ID, reviewDate);

            // Then
            verify(reminderRepository).save(reminderCaptor.capture());
            ContractReminder saved = reminderCaptor.getValue();

            assertThat(saved.getReminderType()).isEqualTo(ReminderType.REVIEW);
            assertThat(saved.getTenantId()).isEqualTo(TENANT_ID);
        }
    }

    @Nested
    @DisplayName("markReminderAsCompleted")
    class MarkReminderAsCompleted {

        @Test
        @DisplayName("Should mark reminder as completed and set notifiedAt")
        void shouldMarkReminderAsCompleted() {
            // Given
            UUID reminderId = UUID.randomUUID();
            ContractReminder reminder = ContractReminder.builder()
                    .contractId(CONTRACT_ID)
                    .tenantId(TENANT_ID)
                    .reminderDate(LocalDate.now())
                    .reminderType(ReminderType.EXPIRY)
                    .isCompleted(false)
                    .build();
            reminder.setId(reminderId);

            when(reminderRepository.findById(reminderId)).thenReturn(Optional.of(reminder));
            when(reminderRepository.save(any(ContractReminder.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            reminderService.markReminderAsCompleted(reminderId);

            // Then
            verify(reminderRepository).save(reminderCaptor.capture());
            ContractReminder saved = reminderCaptor.getValue();
            assertThat(saved.getIsCompleted()).isTrue();
            assertThat(saved.getNotifiedAt()).isNotNull();
        }

        @Test
        @DisplayName("Should do nothing when reminder not found")
        void shouldDoNothingWhenReminderNotFound() {
            // Given
            UUID reminderId = UUID.randomUUID();
            when(reminderRepository.findById(reminderId)).thenReturn(Optional.empty());

            // When
            reminderService.markReminderAsCompleted(reminderId);

            // Then
            verify(reminderRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("Query Methods")
    class QueryMethods {

        @Test
        @DisplayName("Should return reminders for today")
        void shouldReturnRemindersForToday() {
            // Given
            ContractReminder reminder = ContractReminder.builder()
                    .contractId(CONTRACT_ID)
                    .reminderDate(LocalDate.now())
                    .reminderType(ReminderType.EXPIRY)
                    .isCompleted(false)
                    .build();

            when(reminderRepository.findRemindersForToday()).thenReturn(List.of(reminder));

            // When
            List<ContractReminder> result = reminderService.getRemindersForToday();

            // Then
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should return overdue reminders")
        void shouldReturnOverdueReminders() {
            // Given
            ContractReminder reminder = ContractReminder.builder()
                    .contractId(CONTRACT_ID)
                    .reminderDate(LocalDate.now().minusDays(3))
                    .reminderType(ReminderType.RENEWAL)
                    .isCompleted(false)
                    .build();

            when(reminderRepository.findOverdueReminders()).thenReturn(List.of(reminder));

            // When
            List<ContractReminder> result = reminderService.getOverdueReminders();

            // Then
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("Should return reminders in date range")
        void shouldReturnRemindersInDateRange() {
            // Given
            LocalDate start = LocalDate.now();
            LocalDate end = LocalDate.now().plusDays(30);

            ContractReminder reminder = ContractReminder.builder()
                    .contractId(CONTRACT_ID)
                    .reminderDate(LocalDate.now().plusDays(15))
                    .reminderType(ReminderType.REVIEW)
                    .isCompleted(false)
                    .build();

            when(reminderRepository.findRemindersInDateRange(start, end)).thenReturn(List.of(reminder));

            // When
            List<ContractReminder> result = reminderService.getRemindersInDateRange(start, end);

            // Then
            assertThat(result).hasSize(1);
        }
    }
}
