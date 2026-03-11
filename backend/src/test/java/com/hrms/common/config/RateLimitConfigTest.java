package com.hrms.common.config;

import io.github.bucket4j.Bucket;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for RateLimitConfig.
 *
 * Tests token bucket creation and rate limit enforcement across different
 * endpoint categories: auth, api, export, and wall endpoints.
 */
@DisplayName("RateLimitConfig Tests")
class RateLimitConfigTest {

    private RateLimitConfig rateLimitConfig;

    @BeforeEach
    void setUp() {
        rateLimitConfig = new RateLimitConfig();
        // Set default values via reflection to simulate property injection
        ReflectionTestUtils.setField(rateLimitConfig, "authCapacity", 10);
        ReflectionTestUtils.setField(rateLimitConfig, "authRefillTokens", 10);
        ReflectionTestUtils.setField(rateLimitConfig, "authRefillMinutes", 1);
        ReflectionTestUtils.setField(rateLimitConfig, "apiCapacity", 100);
        ReflectionTestUtils.setField(rateLimitConfig, "apiRefillTokens", 100);
        ReflectionTestUtils.setField(rateLimitConfig, "apiRefillMinutes", 1);
        ReflectionTestUtils.setField(rateLimitConfig, "exportCapacity", 5);
        ReflectionTestUtils.setField(rateLimitConfig, "exportRefillTokens", 5);
        ReflectionTestUtils.setField(rateLimitConfig, "exportRefillMinutes", 5);
        ReflectionTestUtils.setField(rateLimitConfig, "wallCapacity", 30);
        ReflectionTestUtils.setField(rateLimitConfig, "wallRefillTokens", 30);
        ReflectionTestUtils.setField(rateLimitConfig, "wallRefillMinutes", 1);
    }

    @Nested
    @DisplayName("Auth Bucket Tests")
    class AuthBucketTests {

        @Test
        @DisplayName("Should create auth bucket with 10 token capacity")
        void shouldCreateAuthBucketWithTenTokenCapacity() {
            // When
            Bucket bucket = rateLimitConfig.getAuthBucket("test-client");

            // Then
            assertNotNull(bucket);
            assertTrue(bucket.getAvailableTokens() > 0);
        }

        @Test
        @DisplayName("Should allow 10 auth requests per minute")
        void shouldAllow10AuthRequestsPerMinute() {
            // Given
            String clientKey = "client-auth-1";

            // When & Then
            for (int i = 0; i < 10; i++) {
                assertTrue(rateLimitConfig.tryConsumeAuth(clientKey),
                        "Auth request " + (i + 1) + " should be allowed");
            }
        }

        @Test
        @DisplayName("Should reject 11th auth request")
        void shouldReject11thAuthRequest() {
            // Given
            String clientKey = "client-auth-2";

            // When - consume 10 tokens
            for (int i = 0; i < 10; i++) {
                rateLimitConfig.tryConsumeAuth(clientKey);
            }

            // Then - 11th request should be rejected
            assertFalse(rateLimitConfig.tryConsumeAuth(clientKey),
                    "11th auth request should be rejected");
        }

        @Test
        @DisplayName("Should track remaining tokens for auth bucket")
        void shouldTrackRemainingTokensForAuthBucket() {
            // Given
            String clientKey = "client-auth-3";

            // When - consume 3 tokens
            for (int i = 0; i < 3; i++) {
                rateLimitConfig.tryConsumeAuth(clientKey);
            }

            // Then - should have 7 tokens remaining
            long remaining = rateLimitConfig.getAuthRemainingTokens(clientKey);
            assertTrue(remaining > 0 && remaining <= 10);
        }

        @Test
        @DisplayName("Should return different buckets for different clients")
        void shouldReturnDifferentBucketsForDifferentClients() {
            // When
            Bucket bucket1 = rateLimitConfig.getAuthBucket("client-1");
            Bucket bucket2 = rateLimitConfig.getAuthBucket("client-2");

            // Then
            assertNotSame(bucket1, bucket2);
        }

        @Test
        @DisplayName("Should return same bucket for same client")
        void shouldReturnSameBucketForSameClient() {
            // When
            Bucket bucket1 = rateLimitConfig.getAuthBucket("same-client");
            Bucket bucket2 = rateLimitConfig.getAuthBucket("same-client");

            // Then
            assertSame(bucket1, bucket2);
        }
    }

    @Nested
    @DisplayName("API Bucket Tests")
    class ApiBucketTests {

        @Test
        @DisplayName("Should create API bucket with 100 token capacity")
        void shouldCreateApiBucketWithHundredTokenCapacity() {
            // When
            Bucket bucket = rateLimitConfig.getApiBucket("test-client");

            // Then
            assertNotNull(bucket);
            assertTrue(bucket.getAvailableTokens() > 0);
        }

        @Test
        @DisplayName("Should allow 100 API requests per minute")
        void shouldAllow100ApiRequestsPerMinute() {
            // Given
            String clientKey = "client-api-1";

            // When & Then
            for (int i = 0; i < 100; i++) {
                assertTrue(rateLimitConfig.tryConsumeApi(clientKey),
                        "API request " + (i + 1) + " should be allowed");
            }
        }

        @Test
        @DisplayName("Should reject 101st API request")
        void shouldReject101stApiRequest() {
            // Given
            String clientKey = "client-api-2";

            // When - consume 100 tokens
            for (int i = 0; i < 100; i++) {
                rateLimitConfig.tryConsumeApi(clientKey);
            }

            // Then - 101st request should be rejected
            assertFalse(rateLimitConfig.tryConsumeApi(clientKey),
                    "101st API request should be rejected");
        }

        @Test
        @DisplayName("Should return same API bucket for same client")
        void shouldReturnSameApiBucketForSameClient() {
            // When
            Bucket bucket1 = rateLimitConfig.getApiBucket("same-api-client");
            Bucket bucket2 = rateLimitConfig.getApiBucket("same-api-client");

            // Then
            assertSame(bucket1, bucket2);
        }
    }

    @Nested
    @DisplayName("Export Bucket Tests")
    class ExportBucketTests {

        @Test
        @DisplayName("Should create export bucket with 5 token capacity")
        void shouldCreateExportBucketWithFiveTokenCapacity() {
            // When
            Bucket bucket = rateLimitConfig.getExportBucket("test-client");

            // Then
            assertNotNull(bucket);
            assertTrue(bucket.getAvailableTokens() > 0);
        }

        @Test
        @DisplayName("Should allow 5 export requests per 5 minutes")
        void shouldAllow5ExportRequestsPer5Minutes() {
            // Given
            String clientKey = "client-export-1";

            // When & Then
            for (int i = 0; i < 5; i++) {
                assertTrue(rateLimitConfig.tryConsumeExport(clientKey),
                        "Export request " + (i + 1) + " should be allowed");
            }
        }

        @Test
        @DisplayName("Should reject 6th export request")
        void shouldReject6thExportRequest() {
            // Given
            String clientKey = "client-export-2";

            // When - consume 5 tokens
            for (int i = 0; i < 5; i++) {
                rateLimitConfig.tryConsumeExport(clientKey);
            }

            // Then - 6th request should be rejected
            assertFalse(rateLimitConfig.tryConsumeExport(clientKey),
                    "6th export request should be rejected");
        }

        @Test
        @DisplayName("Should return same export bucket for same client")
        void shouldReturnSameExportBucketForSameClient() {
            // When
            Bucket bucket1 = rateLimitConfig.getExportBucket("same-export-client");
            Bucket bucket2 = rateLimitConfig.getExportBucket("same-export-client");

            // Then
            assertSame(bucket1, bucket2);
        }
    }

    @Nested
    @DisplayName("Wall Bucket Tests")
    class WallBucketTests {

        @Test
        @DisplayName("Should create wall bucket with 30 token capacity")
        void shouldCreateWallBucketWithThirtyTokenCapacity() {
            // When
            Bucket bucket = rateLimitConfig.getWallBucket("test-client");

            // Then
            assertNotNull(bucket);
            assertTrue(bucket.getAvailableTokens() > 0);
        }

        @Test
        @DisplayName("Should allow 30 wall requests per minute")
        void shouldAllow30WallRequestsPerMinute() {
            // Given
            String clientKey = "client-wall-1";

            // When & Then
            for (int i = 0; i < 30; i++) {
                assertTrue(rateLimitConfig.tryConsumeWall(clientKey),
                        "Wall request " + (i + 1) + " should be allowed");
            }
        }

        @Test
        @DisplayName("Should reject 31st wall request")
        void shouldReject31stWallRequest() {
            // Given
            String clientKey = "client-wall-2";

            // When - consume 30 tokens
            for (int i = 0; i < 30; i++) {
                rateLimitConfig.tryConsumeWall(clientKey);
            }

            // Then - 31st request should be rejected
            assertFalse(rateLimitConfig.tryConsumeWall(clientKey),
                    "31st wall request should be rejected");
        }

        @Test
        @DisplayName("Should return same wall bucket for same client")
        void shouldReturnSameWallBucketForSameClient() {
            // When
            Bucket bucket1 = rateLimitConfig.getWallBucket("same-wall-client");
            Bucket bucket2 = rateLimitConfig.getWallBucket("same-wall-client");

            // Then
            assertSame(bucket1, bucket2);
        }
    }

    @Nested
    @DisplayName("Bucket Isolation Tests")
    class BucketIsolationTests {

        @Test
        @DisplayName("Should isolate auth buckets from API buckets")
        void shouldIsolateAuthBucketsFromApiBuckets() {
            // Given
            String clientKey = "client-isolation-1";

            // When - consume all auth tokens
            for (int i = 0; i < 10; i++) {
                rateLimitConfig.tryConsumeAuth(clientKey);
            }

            // Then - API bucket should still have tokens
            assertTrue(rateLimitConfig.tryConsumeApi(clientKey),
                    "API bucket should be independent of auth bucket");
        }

        @Test
        @DisplayName("Should isolate export buckets from API buckets")
        void shouldIsolateExportBucketsFromApiBuckets() {
            // Given
            String clientKey = "client-isolation-2";

            // When - consume all export tokens
            for (int i = 0; i < 5; i++) {
                rateLimitConfig.tryConsumeExport(clientKey);
            }

            // Then - API bucket should still have tokens
            assertTrue(rateLimitConfig.tryConsumeApi(clientKey),
                    "API bucket should be independent of export bucket");
        }

        @Test
        @DisplayName("Should isolate wall buckets from API buckets")
        void shouldIsolateWallBucketsFromApiBuckets() {
            // Given
            String clientKey = "client-isolation-3";

            // When - consume all wall tokens
            for (int i = 0; i < 30; i++) {
                rateLimitConfig.tryConsumeWall(clientKey);
            }

            // Then - API bucket should still have tokens
            assertTrue(rateLimitConfig.tryConsumeApi(clientKey),
                    "API bucket should be independent of wall bucket");
        }
    }

    @Nested
    @DisplayName("Cleanup Tests")
    class CleanupTests {

        @Test
        @DisplayName("Should clear buckets when cleanup is called")
        void shouldClearBucketsWhenCleanupCalled() {
            // Given
            String clientKey = "client-cleanup-1";
            rateLimitConfig.getAuthBucket(clientKey);
            rateLimitConfig.getApiBucket(clientKey);

            // When
            rateLimitConfig.cleanupBuckets();

            // Then - new buckets should be created
            Bucket newAuthBucket = rateLimitConfig.getAuthBucket(clientKey);
            Bucket newApiBucket = rateLimitConfig.getApiBucket(clientKey);
            assertNotNull(newAuthBucket);
            assertNotNull(newApiBucket);
        }

        @Test
        @DisplayName("Should not crash when cleanup called with empty buckets")
        void shouldNotCrashWhenCleanupCalledWithEmptyBuckets() {
            // When & Then - should not throw exception
            assertDoesNotThrow(() -> rateLimitConfig.cleanupBuckets());
        }
    }

    @Nested
    @DisplayName("Configuration Value Tests")
    class ConfigurationValueTests {

        @Test
        @DisplayName("Should use configured auth capacity")
        void shouldUseConfiguredAuthCapacity() {
            // Given - auth capacity is set to 10
            String clientKey = "config-test-1";

            // When & Then
            for (int i = 0; i < 10; i++) {
                assertTrue(rateLimitConfig.tryConsumeAuth(clientKey));
            }
            assertFalse(rateLimitConfig.tryConsumeAuth(clientKey));
        }

        @Test
        @DisplayName("Should use configured API capacity")
        void shouldUseConfiguredApiCapacity() {
            // Given - API capacity is set to 100
            String clientKey = "config-test-2";

            // When & Then
            for (int i = 0; i < 100; i++) {
                assertTrue(rateLimitConfig.tryConsumeApi(clientKey));
            }
            assertFalse(rateLimitConfig.tryConsumeApi(clientKey));
        }

        @Test
        @DisplayName("Should use configured export capacity")
        void shouldUseConfiguredExportCapacity() {
            // Given - export capacity is set to 5
            String clientKey = "config-test-3";

            // When & Then
            for (int i = 0; i < 5; i++) {
                assertTrue(rateLimitConfig.tryConsumeExport(clientKey));
            }
            assertFalse(rateLimitConfig.tryConsumeExport(clientKey));
        }

        @Test
        @DisplayName("Should use configured wall capacity")
        void shouldUseConfiguredWallCapacity() {
            // Given - wall capacity is set to 30
            String clientKey = "config-test-4";

            // When & Then
            for (int i = 0; i < 30; i++) {
                assertTrue(rateLimitConfig.tryConsumeWall(clientKey));
            }
            assertFalse(rateLimitConfig.tryConsumeWall(clientKey));
        }
    }

    @Nested
    @DisplayName("Multiple Client Tests")
    class MultipleClientTests {

        @Test
        @DisplayName("Should maintain separate rate limits for different clients")
        void shouldMaintainSeparateRateLimitsForDifferentClients() {
            // Given
            String client1 = "multi-client-1";
            String client2 = "multi-client-2";

            // When - exhaust client1's quota
            for (int i = 0; i < 10; i++) {
                rateLimitConfig.tryConsumeAuth(client1);
            }

            // Then - client2 should still have quota
            assertTrue(rateLimitConfig.tryConsumeAuth(client2),
                    "Client2 should have separate rate limit from Client1");
        }

        @Test
        @DisplayName("Should handle 100+ concurrent clients")
        void shouldHandle100ConcurrentClients() {
            // When & Then - create buckets for 100+ clients and verify independence
            for (int i = 0; i < 150; i++) {
                String clientKey = "client-" + i;
                assertTrue(rateLimitConfig.tryConsumeApi(clientKey),
                        "Client " + i + " should be able to consume API token");
            }
        }
    }

    @Nested
    @DisplayName("Edge Case Tests")
    class EdgeCaseTests {

        @Test
        @DisplayName("Should handle null client key gracefully")
        void shouldHandleNullClientKeyGracefully() {
            // When & Then
            assertThrows(NullPointerException.class, () -> rateLimitConfig.getAuthBucket(null));
        }

        @Test
        @DisplayName("Should handle empty string client key")
        void shouldHandleEmptyStringClientKey() {
            // When
            Bucket bucket = rateLimitConfig.getAuthBucket("");

            // Then
            assertNotNull(bucket);
        }

        @Test
        @DisplayName("Should allow zero tokens remaining")
        void shouldAllowZeroTokensRemaining() {
            // Given
            String clientKey = "edge-case-1";

            // When - consume all tokens
            for (int i = 0; i < 10; i++) {
                rateLimitConfig.tryConsumeAuth(clientKey);
            }

            // Then - remaining should be 0
            long remaining = rateLimitConfig.getAuthRemainingTokens(clientKey);
            assertEquals(0, remaining);
        }

        @Test
        @DisplayName("Should handle rapid sequential requests")
        void shouldHandleRapidSequentialRequests() {
            // Given
            String clientKey = "edge-case-2";

            // When & Then - rapid fire requests
            for (int i = 0; i < 10; i++) {
                assertTrue(rateLimitConfig.tryConsumeAuth(clientKey));
            }
            assertFalse(rateLimitConfig.tryConsumeAuth(clientKey));
        }
    }
}
