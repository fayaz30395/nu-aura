package com.hrms.common.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for ApiKeyService.
 *
 * <p><strong>SECURITY:</strong> These tests verify that API key validation
 * uses prefix-based lookup instead of loading all keys, preventing cross-tenant
 * data leaks and improving performance.</p>
 */
@ExtendWith(MockitoExtension.class)
class ApiKeyServiceTest {

    private static final String API_KEY_PREFIX = "hrms_";
    @Mock
    private ApiKeyRepository apiKeyRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    private ApiKeyService apiKeyService;

    @BeforeEach
    void setUp() {
        apiKeyService = new ApiKeyService(apiKeyRepository, passwordEncoder);
    }

    @Nested
    @DisplayName("validateApiKey()")
    class ValidateApiKeyTests {

        @Test
        @DisplayName("should reject null API key")
        void validateApiKey_RejectsNull() {
            Optional<ApiKey> result = apiKeyService.validateApiKey(null, "127.0.0.1");

            assertThat(result).isEmpty();
            verify(apiKeyRepository, never()).findActiveByKeyPrefix(any());
            verify(apiKeyRepository, never()).findAll();
        }

        @Test
        @DisplayName("should reject API key without prefix")
        void validateApiKey_RejectsWithoutPrefix() {
            Optional<ApiKey> result = apiKeyService.validateApiKey("invalid_key", "127.0.0.1");

            assertThat(result).isEmpty();
            verify(apiKeyRepository, never()).findActiveByKeyPrefix(any());
            verify(apiKeyRepository, never()).findAll();
        }

        @Test
        @DisplayName("should reject API key that is too short")
        void validateApiKey_RejectsTooShort() {
            // Key after removing prefix is less than 8 chars
            Optional<ApiKey> result = apiKeyService.validateApiKey(API_KEY_PREFIX + "short", "127.0.0.1");

            assertThat(result).isEmpty();
            verify(apiKeyRepository, never()).findActiveByKeyPrefix(any());
            verify(apiKeyRepository, never()).findAll();
        }

        @Test
        @DisplayName("should use prefix-based lookup, not findAll()")
        void validateApiKey_UsesPrefixLookup_NotFindAll() {
            String rawKey = API_KEY_PREFIX + "12345678abcdefghijklmnop";
            String keyWithoutPrefix = "12345678abcdefghijklmnop";
            String keyPrefix = "12345678";

            when(apiKeyRepository.findActiveByKeyPrefix(keyPrefix))
                    .thenReturn(Collections.emptyList());

            apiKeyService.validateApiKey(rawKey, "127.0.0.1");

            // Verify prefix-based lookup was used
            verify(apiKeyRepository).findActiveByKeyPrefix(keyPrefix);
            // Verify findAll() was NOT called (security requirement)
            verify(apiKeyRepository, never()).findAll();
        }

        @Test
        @DisplayName("should validate matching API key and record usage")
        void validateApiKey_ValidatesMatchingKey() {
            String rawKey = API_KEY_PREFIX + "12345678abcdefghijklmnop";
            String keyWithoutPrefix = "12345678abcdefghijklmnop";
            String keyPrefix = "12345678";
            UUID tenantId = UUID.randomUUID();

            ApiKey mockApiKey = ApiKey.builder()
                    .name("Test Key")
                    .keyHash("$2a$10$hashedvalue")
                    .keyPrefix(keyPrefix)
                    .isActive(true)
                    .scopes(Set.of("read"))
                    .build();
            mockApiKey.setId(UUID.randomUUID());
            mockApiKey.setTenantId(tenantId);

            when(apiKeyRepository.findActiveByKeyPrefix(keyPrefix))
                    .thenReturn(List.of(mockApiKey));
            when(passwordEncoder.matches(keyWithoutPrefix, mockApiKey.getKeyHash()))
                    .thenReturn(true);
            when(apiKeyRepository.save(any(ApiKey.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            Optional<ApiKey> result = apiKeyService.validateApiKey(rawKey, "127.0.0.1");

            assertThat(result).isPresent();
            assertThat(result.get().getTenantId()).isEqualTo(tenantId);

            // Verify usage was recorded
            ArgumentCaptor<ApiKey> savedKey = ArgumentCaptor.forClass(ApiKey.class);
            verify(apiKeyRepository).save(savedKey.capture());
            assertThat(savedKey.getValue().getLastUsedIp()).isEqualTo("127.0.0.1");
            assertThat(savedKey.getValue().getLastUsedAt()).isNotNull();
        }

        @Test
        @DisplayName("should reject when no keys match prefix")
        void validateApiKey_RejectsWhenNoPrefixMatch() {
            String rawKey = API_KEY_PREFIX + "12345678abcdefghijklmnop";
            String keyPrefix = "12345678";

            when(apiKeyRepository.findActiveByKeyPrefix(keyPrefix))
                    .thenReturn(Collections.emptyList());

            Optional<ApiKey> result = apiKeyService.validateApiKey(rawKey, "127.0.0.1");

            assertThat(result).isEmpty();
            verify(apiKeyRepository, never()).save(any());
        }

        @Test
        @DisplayName("should reject when hash does not match")
        void validateApiKey_RejectsWhenHashMismatch() {
            String rawKey = API_KEY_PREFIX + "12345678abcdefghijklmnop";
            String keyWithoutPrefix = "12345678abcdefghijklmnop";
            String keyPrefix = "12345678";

            ApiKey mockApiKey = ApiKey.builder()
                    .name("Test Key")
                    .keyHash("$2a$10$differenthash")
                    .keyPrefix(keyPrefix)
                    .isActive(true)
                    .build();
            mockApiKey.setId(UUID.randomUUID());
            mockApiKey.setTenantId(UUID.randomUUID());

            when(apiKeyRepository.findActiveByKeyPrefix(keyPrefix))
                    .thenReturn(List.of(mockApiKey));
            when(passwordEncoder.matches(keyWithoutPrefix, mockApiKey.getKeyHash()))
                    .thenReturn(false);

            Optional<ApiKey> result = apiKeyService.validateApiKey(rawKey, "127.0.0.1");

            assertThat(result).isEmpty();
            verify(apiKeyRepository, never()).save(any());
        }

        @Test
        @DisplayName("should only match the correct key among multiple candidates")
        void validateApiKey_MatchesCorrectKeyAmongMultiple() {
            String rawKey = API_KEY_PREFIX + "12345678abcdefghijklmnop";
            String keyWithoutPrefix = "12345678abcdefghijklmnop";
            String keyPrefix = "12345678";

            UUID tenant1 = UUID.randomUUID();
            UUID tenant2 = UUID.randomUUID();

            ApiKey wrongKey = ApiKey.builder()
                    .name("Wrong Key")
                    .keyHash("$2a$10$wronghash")
                    .keyPrefix(keyPrefix)
                    .isActive(true)
                    .build();
            wrongKey.setId(UUID.randomUUID());
            wrongKey.setTenantId(tenant1);

            ApiKey correctKey = ApiKey.builder()
                    .name("Correct Key")
                    .keyHash("$2a$10$correcthash")
                    .keyPrefix(keyPrefix)
                    .isActive(true)
                    .build();
            correctKey.setId(UUID.randomUUID());
            correctKey.setTenantId(tenant2);

            when(apiKeyRepository.findActiveByKeyPrefix(keyPrefix))
                    .thenReturn(List.of(wrongKey, correctKey));
            when(passwordEncoder.matches(keyWithoutPrefix, wrongKey.getKeyHash()))
                    .thenReturn(false);
            when(passwordEncoder.matches(keyWithoutPrefix, correctKey.getKeyHash()))
                    .thenReturn(true);
            when(apiKeyRepository.save(any(ApiKey.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            Optional<ApiKey> result = apiKeyService.validateApiKey(rawKey, "127.0.0.1");

            assertThat(result).isPresent();
            assertThat(result.get().getTenantId()).isEqualTo(tenant2);
            assertThat(result.get().getName()).isEqualTo("Correct Key");
        }
    }

    @Nested
    @DisplayName("createApiKey()")
    class CreateApiKeyTests {

        @Test
        @DisplayName("should create API key with correct tenant ID")
        void createApiKey_SetsCorrectTenantId() {
            UUID tenantId = UUID.randomUUID();
            UUID createdBy = UUID.randomUUID();

            when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encoded");
            when(apiKeyRepository.save(any(ApiKey.class)))
                    .thenAnswer(invocation -> {
                        ApiKey key = invocation.getArgument(0);
                        key.setId(UUID.randomUUID());
                        return key;
                    });

            ApiKeyService.ApiKeyCreationResult result = apiKeyService.createApiKey(
                    "Test Key",
                    "Test Description",
                    Set.of("read", "write"),
                    LocalDateTime.now().plusDays(30),
                    tenantId,
                    createdBy
            );

            assertThat(result.rawKey()).startsWith(API_KEY_PREFIX);
            assertThat(result.apiKey().getTenantId()).isEqualTo(tenantId);
            assertThat(result.apiKey().getName()).isEqualTo("Test Key");

            // Verify the saved key has the correct tenant
            ArgumentCaptor<ApiKey> savedKey = ArgumentCaptor.forClass(ApiKey.class);
            verify(apiKeyRepository).save(savedKey.capture());
            assertThat(savedKey.getValue().getTenantId()).isEqualTo(tenantId);
        }
    }

    @Nested
    @DisplayName("Tenant-scoped operations")
    class TenantScopedOperationsTests {

        @Test
        @DisplayName("revokeApiKey should enforce tenant isolation")
        void revokeApiKey_EnforcesTenantIsolation() {
            UUID keyId = UUID.randomUUID();
            UUID tenantId = UUID.randomUUID();

            ApiKey mockApiKey = ApiKey.builder()
                    .name("Test Key")
                    .isActive(true)
                    .build();
            mockApiKey.setId(keyId);
            mockApiKey.setTenantId(tenantId);

            when(apiKeyRepository.findByIdAndTenantId(keyId, tenantId))
                    .thenReturn(Optional.of(mockApiKey));
            when(apiKeyRepository.save(any(ApiKey.class)))
                    .thenAnswer(invocation -> invocation.getArgument(0));

            apiKeyService.revokeApiKey(keyId, tenantId);

            // Verify tenant-scoped lookup was used
            verify(apiKeyRepository).findByIdAndTenantId(keyId, tenantId);
            // Verify key was deactivated
            ArgumentCaptor<ApiKey> savedKey = ArgumentCaptor.forClass(ApiKey.class);
            verify(apiKeyRepository).save(savedKey.capture());
            assertThat(savedKey.getValue().getIsActive()).isFalse();
        }

        @Test
        @DisplayName("deleteApiKey should enforce tenant isolation")
        void deleteApiKey_EnforcesTenantIsolation() {
            UUID keyId = UUID.randomUUID();
            UUID tenantId = UUID.randomUUID();

            ApiKey mockApiKey = ApiKey.builder()
                    .name("Test Key")
                    .build();
            mockApiKey.setId(keyId);
            mockApiKey.setTenantId(tenantId);

            when(apiKeyRepository.findByIdAndTenantId(keyId, tenantId))
                    .thenReturn(Optional.of(mockApiKey));

            apiKeyService.deleteApiKey(keyId, tenantId);

            // Verify tenant-scoped lookup was used
            verify(apiKeyRepository).findByIdAndTenantId(keyId, tenantId);
            verify(apiKeyRepository).delete(mockApiKey);
        }
    }
}
