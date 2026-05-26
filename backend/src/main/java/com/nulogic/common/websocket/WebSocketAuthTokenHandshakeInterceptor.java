package com.nulogic.common.websocket;

import com.nulogic.common.config.CookieConfig;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.Nullable;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.List;
import java.util.Map;

/**
 * Copies the httpOnly access-token cookie from the SockJS/WebSocket handshake
 * into server-side session attributes for the subsequent STOMP CONNECT frame.
 */
public class WebSocketAuthTokenHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ACCESS_TOKEN_ATTRIBUTE = "accessToken";

    @Override
    public boolean beforeHandshake(ServerHttpRequest request,
                                   ServerHttpResponse response,
                                   WebSocketHandler wsHandler,
                                   Map<String, Object> attributes) {
        String accessToken = resolveAccessToken(request.getHeaders().get(HttpHeaders.COOKIE));
        if (accessToken != null) {
            attributes.put(ACCESS_TOKEN_ATTRIBUTE, accessToken);
        }
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request,
                               ServerHttpResponse response,
                               WebSocketHandler wsHandler,
                               @Nullable Exception exception) {
        // No-op.
    }

    static String resolveAccessToken(@Nullable List<String> cookieHeaders) {
        if (cookieHeaders == null || cookieHeaders.isEmpty()) {
            return null;
        }

        String legacyToken = null;
        for (String header : cookieHeaders) {
            String resolved = resolveHostPrefixedAccessToken(header);
            if (resolved != null) {
                return resolved;
            }
            if (legacyToken == null) {
                legacyToken = resolveLegacyAccessToken(header);
            }
        }
        return legacyToken;
    }

    private static String resolveHostPrefixedAccessToken(String cookieHeader) {
        return resolveCookie(cookieHeader, CookieConfig.ACCESS_TOKEN_COOKIE_HOST);
    }

    private static String resolveLegacyAccessToken(String cookieHeader) {
        return resolveCookie(cookieHeader, CookieConfig.ACCESS_TOKEN_COOKIE);
    }

    private static String resolveCookie(String cookieHeader, String cookieName) {
        if (cookieHeader == null || cookieHeader.isBlank()) {
            return null;
        }

        String[] cookies = cookieHeader.split(";");
        for (String cookie : cookies) {
            int separator = cookie.indexOf('=');
            if (separator <= 0) {
                continue;
            }
            String name = cookie.substring(0, separator).trim();
            String value = cookie.substring(separator + 1).trim();
            if (cookieName.equals(name) && !value.isBlank()) {
                return value;
            }
        }
        return null;
    }
}
