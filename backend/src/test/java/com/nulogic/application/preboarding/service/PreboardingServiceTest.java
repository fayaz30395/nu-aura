package com.nulogic.application.preboarding.service;

import com.nulogic.common.exception.BusinessException;
import com.nulogic.common.util.TenantTimeService;
import com.nulogic.domain.preboarding.PreboardingCandidate;
import com.nulogic.domain.preboarding.PreboardingCandidate.PreboardingStatus;
import com.nulogic.infrastructure.preboarding.repository.PreboardingCandidateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@MockitoSettings(strictness = Strictness.LENIENT)
@ExtendWith(MockitoExtension.class)
@DisplayName("PreboardingService portal token tests")
class PreboardingServiceTest {

    private static final String TOKEN = "token-1";

    @Mock
    private PreboardingCandidateRepository candidateRepository;
    @Mock
    private TenantTimeService tenantTimeService;
    @InjectMocks
    private PreboardingService service;

    @BeforeEach
    void setUp() {
        when(tenantTimeService.now(any(UUID.class))).thenReturn(LocalDateTime.of(2025, 6, 1, 9, 0));
        when(candidateRepository.save(any(PreboardingCandidate.class))).thenAnswer(i -> i.getArgument(0));
    }

    private PreboardingCandidate candidate(PreboardingStatus status) {
        PreboardingCandidate c = PreboardingCandidate.builder()
                .tenantId(UUID.randomUUID())
                .firstName("Test")
                .email("t@example.test")
                .expectedJoiningDate(LocalDate.of(2025, 7, 1))
                .accessToken(TOKEN)
                .tokenExpiresAt(LocalDateTime.of(2025, 6, 20, 9, 0))
                .status(status)
                .build();
        when(candidateRepository.findByAccessToken(TOKEN)).thenReturn(Optional.of(c));
        return c;
    }

    @Test
    @DisplayName("write actions work while IN_PROGRESS")
    void writesAllowedInProgress() {
        candidate(PreboardingStatus.IN_PROGRESS);
        PreboardingCandidate result = service.signOfferLetter(TOKEN);
        assertThat(result.getOfferLetterSigned()).isTrue();
        verify(candidateRepository).save(any());
    }

    @Test
    @DisplayName("write actions are rejected once COMPLETED and mutate nothing")
    void writesRejectedWhenCompleted() {
        PreboardingCandidate c = candidate(PreboardingStatus.COMPLETED);
        assertThatThrownBy(() -> service.signOfferLetter(TOKEN)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.markDocumentUploaded(TOKEN, "photo")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.updateBankDetails(TOKEN, "1", "b", "i", "t")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.updatePersonalInfo(TOKEN, null, "a", null, null, null, null, null, null, null))
                .isInstanceOf(BusinessException.class);
        assertThat(c.getOfferLetterSigned()).isFalse();
        verify(candidateRepository, never()).save(any());
    }

    @Test
    @DisplayName("token is dead for reads and writes once CONVERTED")
    void tokenDeadWhenConverted() {
        candidate(PreboardingStatus.CONVERTED);
        assertThatThrownBy(() -> service.getByAccessToken(TOKEN)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.signOfferLetter(TOKEN)).isInstanceOf(BusinessException.class);
        verify(candidateRepository, never()).save(any());
    }

    @Test
    @DisplayName("COMPLETED token may still be read (status page)")
    void completedReadable() {
        candidate(PreboardingStatus.COMPLETED);
        assertThat(service.getByAccessToken(TOKEN).getStatus()).isEqualTo(PreboardingStatus.COMPLETED);
    }
}
