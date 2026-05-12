package com.nulogic.application.compliance.service;

import com.nulogic.domain.user.User;
import com.nulogic.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link UserAnonymizer}.
 *
 * <p>Pure-Mockito because the anonymiser delegates only to a {@link UserRepository}
 * — covering its contract with mocks is the right balance: fast, deterministic,
 * and zero Spring context to spin up. The cross-tenant + cascade integration
 * concerns are covered separately by {@code DsrErasureServiceIntegrationTest}.</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("UserAnonymizer Unit Tests")
class UserAnonymizerTest {

    private static final UUID USER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final UUID TENANT_ID = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserAnonymizer anonymizer;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .email("alice@example.com")
                .firstName("Alice")
                .lastName("Wonderland")
                .passwordHash("$2a$10$realbcrypthashshouldbeoverwrittenbywipe")
                .status(User.UserStatus.ACTIVE)
                .mfaEnabled(true)
                .mfaSecret("TOTP-SEED-DO-NOT-LEAK")
                .mfaBackupCodes("code1,code2,code3")
                .profilePictureUrl("https://cdn.example.com/alice.png")
                .build();
        user.setId(USER_ID);
        user.setTenantId(TENANT_ID);
    }

    @Test
    @DisplayName("anonymize wipes all PII fields (email, names, MFA, profile picture)")
    void anonymize_wipesAllPiiFields() {
        when(userRepository.findByIdAndTenantId(USER_ID, TENANT_ID)).thenReturn(Optional.of(user));

        String originalEmail = anonymizer.anonymize(USER_ID, TENANT_ID);

        assertThat(originalEmail).isEqualTo("alice@example.com");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User saved = captor.getValue();

        // RFC 6761 .invalid TLD — guaranteed never to route.
        assertThat(saved.getEmail()).startsWith("anonymized+").endsWith("@erased.invalid");
        assertThat(saved.getFirstName()).isEqualTo("ANONYMIZED");
        assertThat(saved.getLastName()).isNull();
        assertThat(saved.getProfilePictureUrl()).isNull();
        assertThat(saved.getMfaSecret()).isNull();
        assertThat(saved.getMfaBackupCodes()).isNull();
    }

    @Test
    @DisplayName("anonymize sets an unguessable, BCrypt-incompatible password hash")
    void anonymize_setsUnguessablePasswordHash() {
        when(userRepository.findByIdAndTenantId(USER_ID, TENANT_ID)).thenReturn(Optional.of(user));

        anonymizer.anonymize(USER_ID, TENANT_ID);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        String hash = captor.getValue().getPasswordHash();

        // The forensic marker prefix lets investigators spot the sentinel; the
        // non-BCrypt format ensures BCryptPasswordEncoder.matches always returns
        // false — no input can ever authenticate against this hash.
        assertThat(hash).isNotNull().startsWith("ERASED:");
        assertThat(hash).doesNotStartWith("$2a$").doesNotStartWith("$2b$").doesNotStartWith("$2y$");
        assertThat(hash.length()).isGreaterThan(40);
    }

    @Test
    @DisplayName("anonymize sets status to INACTIVE so login flows reject the principal")
    void anonymize_setsStatusInactive() {
        when(userRepository.findByIdAndTenantId(USER_ID, TENANT_ID)).thenReturn(Optional.of(user));

        anonymizer.anonymize(USER_ID, TENANT_ID);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(User.UserStatus.INACTIVE);
    }

    @Test
    @DisplayName("anonymize is idempotent — second call on an already-anonymised user is a no-op")
    void anonymize_idempotent() {
        // Simulate an already-anonymised user — anonymizedAt is non-null.
        user.setAnonymizedAt(LocalDateTime.now().minusDays(1));
        when(userRepository.findByIdAndTenantId(USER_ID, TENANT_ID)).thenReturn(Optional.of(user));

        String originalEmail = anonymizer.anonymize(USER_ID, TENANT_ID);

        // Contract: returns null when already anonymised so the caller skips
        // double-emitting an audit row.
        assertThat(originalEmail).isNull();
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("anonymize stamps anonymizedAt on first wipe")
    void anonymize_stampsAnonymizedAt() {
        when(userRepository.findByIdAndTenantId(USER_ID, TENANT_ID)).thenReturn(Optional.of(user));

        LocalDateTime before = LocalDateTime.now().minusSeconds(1);
        anonymizer.anonymize(USER_ID, TENANT_ID);
        LocalDateTime after = LocalDateTime.now().plusSeconds(1);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        LocalDateTime stamp = captor.getValue().getAnonymizedAt();

        assertThat(stamp).isNotNull();
        assertThat(stamp).isAfter(before).isBefore(after);
    }
}
