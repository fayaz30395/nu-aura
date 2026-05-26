package com.nulogic.common.websocket;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WebSocketAuthTokenHandshakeInterceptorTest {

    @Test
    void resolveAccessTokenPrefersHostPrefixedCookie() {
        String token = WebSocketAuthTokenHandshakeInterceptor.resolveAccessToken(List.of(
                "access_token=legacy-token; __Host-hrms-access=hardened-token"
        ));

        assertThat(token).isEqualTo("hardened-token");
    }

    @Test
    void resolveAccessTokenFallsBackToLegacyCookie() {
        String token = WebSocketAuthTokenHandshakeInterceptor.resolveAccessToken(List.of(
                "XSRF-TOKEN=csrf-token; access_token=legacy-token"
        ));

        assertThat(token).isEqualTo("legacy-token");
    }

    @Test
    void resolveAccessTokenReturnsNullWhenCookieMissing() {
        String token = WebSocketAuthTokenHandshakeInterceptor.resolveAccessToken(List.of(
                "XSRF-TOKEN=csrf-token; refresh_token=refresh-token"
        ));

        assertThat(token).isNull();
    }
}
