package com.hrms.application.auth.service;

import com.hrms.api.auth.dto.MfaSetupResponse;
import com.hrms.api.auth.dto.MfaStatusResponse;
import com.hrms.common.exception.AuthenticationException;
import com.hrms.common.exception.ResourceNotFoundException;
import com.hrms.domain.user.User;
import com.hrms.infrastructure.user.repository.UserRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("MfaService Tests")
class MfaServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private MfaService mfaService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new User();
        user.setId(userId);
        user.setEmail("test@nuaura.com");
        user.setMfaEnabled(false);
        user.setMfaSecret(null);
        user.setMfaBackupCodes(null);
        user.setMfaSetupAt(null);
    }

    @Nested
    @DisplayName("setupMfa")
    class SetupMfaTests {

        @Test
        @DisplayName("Should generate secret, backup codes, and QR URL for valid user")
        void shouldSetupMfaSuccessfully() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$hashed");
            when(userRepository.save(any(User.class))).thenReturn(user);

            // When
            MfaSetupResponse result = mfaService.setupMfa(userId);

            // Then
            assertThat(result).isNotNull();
            assertThat(result.getSecret()).isNotBlank();
            assertThat(result.getQrCodeUrl()).contains("otpauth://totp/NU-AURA");
            assertThat(result.getBackupCodes()).hasSize(10);
            // All backup codes should be 8-char uppercase alphanumeric
            result.getBackupCodes().forEach(code ->
                    assertThat(code).matches("[A-Z0-9]{8}"));

            verify(userRepository).save(argThat(u -> u.getMfaSecret() != null));
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException when user not found")
        void shouldThrowWhenUserNotFound() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> mfaService.setupMfa(userId))
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("User not found");
        }

        @Test
        @DisplayName("Should store hashed backup codes, not plaintext")
        void shouldStoreHashedBackupCodes() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$hashedvalue");
            when(userRepository.save(any(User.class))).thenReturn(user);

            // When
            mfaService.setupMfa(userId);

            // Then - passwordEncoder.encode called 10 times (one per backup code)
            verify(passwordEncoder, times(10)).encode(anyString());
            verify(userRepository).save(argThat(u ->
                    u.getMfaBackupCodes() != null && u.getMfaBackupCodes().contains("$2a$10$hashedvalue")));
        }

        @Test
        @DisplayName("Should set mfaSetupAt timestamp but not enable MFA yet")
        void shouldNotEnableMfaBeforeVerification() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$hashed");
            when(userRepository.save(any(User.class))).thenReturn(user);

            // When
            mfaService.setupMfa(userId);

            // Then
            verify(userRepository).save(argThat(u ->
                    u.getMfaSetupAt() != null && !Boolean.TRUE.equals(u.getMfaEnabled())));
        }
    }

    @Nested
    @DisplayName("verifyAndEnableMfa")
    class VerifyAndEnableMfaTests {

        @Test
        @DisplayName("Should throw AuthenticationException when MFA setup not initiated")
        void shouldThrowWhenMfaNotSetup() {
            // Given - user has no mfaSecret
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When/Then
            assertThatThrownBy(() -> mfaService.verifyAndEnableMfa(userId, "123456"))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("MFA setup not initiated");
        }

        @Test
        @DisplayName("Should throw AuthenticationException for invalid TOTP code")
        void shouldThrowForInvalidCode() {
            // Given
            user.setMfaSecret("JBSWY3DPEHPK3PXP"); // valid base32 secret
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When/Then - "000000" is extremely unlikely to be valid
            assertThatThrownBy(() -> mfaService.verifyAndEnableMfa(userId, "invalid"))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Invalid MFA code");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for unknown user")
        void shouldThrowForUnknownUser() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> mfaService.verifyAndEnableMfa(userId, "123456"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("verifyMfaCode")
    class VerifyMfaCodeTests {

        @Test
        @DisplayName("Should return false when MFA is not enabled")
        void shouldReturnFalseWhenMfaNotEnabled() {
            // Given
            user.setMfaEnabled(false);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            boolean result = mfaService.verifyMfaCode(userId, "123456");

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false when MFA enabled but secret is null")
        void shouldReturnFalseWhenSecretNull() {
            // Given
            user.setMfaEnabled(true);
            user.setMfaSecret(null);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            boolean result = mfaService.verifyMfaCode(userId, "123456");

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should return false for invalid TOTP code when MFA is enabled")
        void shouldReturnFalseForInvalidTotp() {
            // Given
            user.setMfaEnabled(true);
            user.setMfaSecret("JBSWY3DPEHPK3PXP");
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When - "000000" is extremely unlikely to be correct
            boolean result = mfaService.verifyMfaCode(userId, "000000");

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should verify backup code when format matches 8-char alphanumeric")
        void shouldAttemptBackupCodeVerification() {
            // Given
            user.setMfaEnabled(true);
            user.setMfaSecret("JBSWY3DPEHPK3PXP");
            user.setMfaBackupCodes("[\"$2a$10$hashedvalue\"]");
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(eq("ABCD1234"), eq("$2a$10$hashedvalue"))).thenReturn(true);

            // When
            boolean result = mfaService.verifyMfaCode(userId, "ABCD1234");

            // Then
            assertThat(result).isTrue();
            verify(passwordEncoder).matches("ABCD1234", "$2a$10$hashedvalue");
        }

        @Test
        @DisplayName("Should return false when backup codes are null")
        void shouldReturnFalseWhenNoBackupCodes() {
            // Given
            user.setMfaEnabled(true);
            user.setMfaSecret("JBSWY3DPEHPK3PXP");
            user.setMfaBackupCodes(null);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When - 8-char code that triggers backup path
            boolean result = mfaService.verifyMfaCode(userId, "ABCD1234");

            // Then
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for unknown user")
        void shouldThrowForUnknownUser() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> mfaService.verifyMfaCode(userId, "123456"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("disableMfa")
    class DisableMfaTests {

        @Test
        @DisplayName("Should throw AuthenticationException when MFA is not enabled")
        void shouldThrowWhenMfaNotEnabled() {
            // Given
            user.setMfaEnabled(false);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When/Then
            assertThatThrownBy(() -> mfaService.disableMfa(userId, "123456"))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("MFA is not enabled");
        }

        @Test
        @DisplayName("Should throw AuthenticationException for invalid code on disable")
        void shouldThrowForInvalidCodeOnDisable() {
            // Given
            user.setMfaEnabled(true);
            user.setMfaSecret("JBSWY3DPEHPK3PXP");
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When/Then
            assertThatThrownBy(() -> mfaService.disableMfa(userId, "000000"))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessageContaining("Invalid MFA code");
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for unknown user")
        void shouldThrowForUnknownUser() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> mfaService.disableMfa(userId, "123456"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getMfaStatus")
    class GetMfaStatusTests {

        @Test
        @DisplayName("Should return enabled status and setup time")
        void shouldReturnEnabledStatus() {
            // Given
            LocalDateTime setupTime = LocalDateTime.of(2026, 3, 1, 10, 0);
            user.setMfaEnabled(true);
            user.setMfaSetupAt(setupTime);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            MfaStatusResponse result = mfaService.getMfaStatus(userId);

            // Then
            assertThat(result.getEnabled()).isTrue();
            assertThat(result.getSetupAt()).isEqualTo(setupTime);
        }

        @Test
        @DisplayName("Should return false when MFA not enabled")
        void shouldReturnDisabledStatus() {
            // Given
            user.setMfaEnabled(false);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            MfaStatusResponse result = mfaService.getMfaStatus(userId);

            // Then
            assertThat(result.getEnabled()).isFalse();
            assertThat(result.getSetupAt()).isNull();
        }

        @Test
        @DisplayName("Should handle null mfaEnabled gracefully")
        void shouldHandleNullMfaEnabled() {
            // Given
            user.setMfaEnabled(null);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            MfaStatusResponse result = mfaService.getMfaStatus(userId);

            // Then
            assertThat(result.getEnabled()).isFalse();
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for unknown user")
        void shouldThrowForUnknownUser() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> mfaService.getMfaStatus(userId))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("consumeBackupCode")
    class ConsumeBackupCodeTests {

        @Test
        @DisplayName("Should remove matched backup code after consumption")
        void shouldConsumeBackupCode() {
            // Given
            user.setMfaBackupCodes("[\"$2a$10$hash1\",\"$2a$10$hash2\"]");
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(eq("ABCD1234"), eq("$2a$10$hash1"))).thenReturn(true);
            when(passwordEncoder.matches(eq("ABCD1234"), eq("$2a$10$hash2"))).thenReturn(false);
            when(userRepository.save(any(User.class))).thenReturn(user);

            // When
            mfaService.consumeBackupCode(userId, "ABCD1234");

            // Then
            verify(userRepository).save(argThat(u ->
                    u.getMfaBackupCodes() != null && !u.getMfaBackupCodes().contains("hash1")));
        }

        @Test
        @DisplayName("Should set backup codes to null when last code consumed")
        void shouldClearBackupCodesWhenAllConsumed() {
            // Given
            user.setMfaBackupCodes("[\"$2a$10$onlyhash\"]");
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(eq("ABCD1234"), eq("$2a$10$onlyhash"))).thenReturn(true);
            when(userRepository.save(any(User.class))).thenReturn(user);

            // When
            mfaService.consumeBackupCode(userId, "ABCD1234");

            // Then
            verify(userRepository).save(argThat(u -> u.getMfaBackupCodes() == null));
        }

        @Test
        @DisplayName("Should do nothing when backup codes are null")
        void shouldDoNothingWhenBackupCodesNull() {
            // Given
            user.setMfaBackupCodes(null);
            when(userRepository.findById(userId)).thenReturn(Optional.of(user));

            // When
            mfaService.consumeBackupCode(userId, "ABCD1234");

            // Then
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw ResourceNotFoundException for unknown user")
        void shouldThrowForUnknownUser() {
            // Given
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // When/Then
            assertThatThrownBy(() -> mfaService.consumeBackupCode(userId, "ABCD1234"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
