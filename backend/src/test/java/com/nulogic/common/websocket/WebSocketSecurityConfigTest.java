package com.nulogic.common.websocket;

import com.nulogic.common.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WebSocketSecurityConfigTest {

    private static final String TOKEN = "access.jwt.token";
    private static final String EMAIL = "employee@example.com";
    private static final UUID USER_ID = UUID.fromString("660e8400-e29b-41d4-a716-446655440000");
    private static final UUID TENANT_ID = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
    private static final UUID OTHER_TENANT_ID = UUID.fromString("770e8400-e29b-41d4-a716-446655440000");

    private JwtTokenProvider jwtTokenProvider;
    private WebSocketSecurityConfig config;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = mock(JwtTokenProvider.class);
        config = new WebSocketSecurityConfig(jwtTokenProvider);

        when(jwtTokenProvider.validateToken(TOKEN)).thenReturn(true);
        when(jwtTokenProvider.getUsernameFromToken(TOKEN)).thenReturn(EMAIL);
        when(jwtTokenProvider.getUserIdFromToken(TOKEN)).thenReturn(USER_ID);
        when(jwtTokenProvider.getTenantIdFromToken(TOKEN)).thenReturn(TENANT_ID);
    }

    @Test
    void handleConnectAuthenticatesFromHandshakeCookieAttribute() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put(WebSocketAuthTokenHandshakeInterceptor.ACCESS_TOKEN_ATTRIBUTE, TOKEN);
        accessor.setSessionAttributes(sessionAttributes);

        ReflectionTestUtils.invokeMethod(config, "handleConnect", accessor);

        Principal principal = accessor.getUser();
        assertThat(principal).isNotNull();
        assertThat(principal.getName()).isEqualTo(USER_ID.toString());
        assertThat(accessor.getSessionAttributes()).containsEntry("tenantId", TENANT_ID);
        assertThat(accessor.getSessionAttributes()).containsEntry("username", EMAIL);
    }

    @Test
    void handleConnectInitializesSessionAttributesForAuthorizationHeader() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer " + TOKEN);

        ReflectionTestUtils.invokeMethod(config, "handleConnect", accessor);

        assertThat(accessor.getUser()).isNotNull();
        assertThat(accessor.getSessionAttributes()).containsEntry("tenantId", TENANT_ID);
        assertThat(accessor.getSessionAttributes()).containsEntry("username", EMAIL);
    }

    @Test
    void handleConnectRejectsMissingToken() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setSessionAttributes(new HashMap<>());

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "handleConnect", accessor))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void handleSubscribeAllowsMatchingTenantTopic() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tenant/" + TENANT_ID + "/notifications");
        accessor.setUser(() -> USER_ID.toString());
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("tenantId", TENANT_ID);
        accessor.setSessionAttributes(sessionAttributes);

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .doesNotThrowAnyException();
    }

    @Test
    void handleSubscribeAllowsTenantScopedDepartmentTopic() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tenant/" + TENANT_ID + "/department/" + UUID.randomUUID() + "/notifications");
        accessor.setUser(() -> USER_ID.toString());
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("tenantId", TENANT_ID);
        accessor.setSessionAttributes(sessionAttributes);

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .doesNotThrowAnyException();
    }

    @Test
    void handleSubscribeRejectsCrossTenantTopic() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/tenant/" + OTHER_TENANT_ID + "/notifications");
        accessor.setUser(() -> USER_ID.toString());
        Map<String, Object> sessionAttributes = new HashMap<>();
        sessionAttributes.put("tenantId", TENANT_ID);
        accessor.setSessionAttributes(sessionAttributes);

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Cross-tenant subscription");
    }

    @Test
    void handleSubscribeAllowsUserQueueDestination() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/notifications");
        accessor.setUser(() -> USER_ID.toString());
        accessor.setSessionAttributes(new HashMap<>());

        assertThatCode(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .doesNotThrowAnyException();
    }

    @Test
    void handleSubscribeRejectsUserQueueWithoutAuthenticatedUser() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/user/queue/notifications");
        accessor.setSessionAttributes(new HashMap<>());

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void handleSubscribeRejectsPublicTopicWithoutAuthenticatedUser() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/announcements");
        accessor.setSessionAttributes(new HashMap<>());

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("Authentication required");
    }

    @Test
    void handleSubscribeRejectsLegacyUserTopicDestination() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/user/" + USER_ID);
        accessor.setUser(() -> USER_ID.toString());
        accessor.setSessionAttributes(new HashMap<>());

        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(config, "handleSubscribe", accessor))
                .isInstanceOf(MessageDeliveryException.class)
                .hasMessageContaining("topic must be tenant-prefixed");
    }
}
