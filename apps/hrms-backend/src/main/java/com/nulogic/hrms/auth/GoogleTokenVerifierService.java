package com.nulogic.hrms.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.nulogic.hrms.config.HrmsProperties;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

@Slf4j
@Component
public class GoogleTokenVerifierService {
    private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo?access_token={accessToken}";
    private static final String USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

    private final HrmsProperties properties;
    private final List<String> allowedClientIds;
    private final GoogleIdTokenVerifier verifier;
    private final RestTemplate restTemplate;

    public GoogleTokenVerifierService(HrmsProperties properties) {
        this.properties = properties;
        List<String> clientIds = properties.getGoogle().getClientIds();
        log.info("Initializing Google SSO with allowed client IDs: {}", clientIds);
        
        List<String> sanitized = clientIds == null
                ? List.of()
                : clientIds.stream().filter(value -> value != null && !value.isBlank()).toList();
        if (sanitized.isEmpty()) {
            log.error("Google client IDs must be configured for SSO to work");
            throw new IllegalStateException("Google client IDs must be configured");
        }
        this.allowedClientIds = sanitized;
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(allowedClientIds)
                .build();
        this.restTemplate = new RestTemplate();
    }

    public GoogleUserInfo verify(String idToken) {
        log.debug("Verifying Google ID token");
        try {
            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                log.warn("Google ID token verification failed: token is null");
                throw new IllegalArgumentException("Invalid Google ID token");
            }

            GoogleIdToken.Payload payload = token.getPayload();
            String email = payload.getEmail();
            Boolean verified = payload.getEmailVerified();
            String hostedDomain = payload.getHostedDomain();

            log.info("ID token verified for user: {}, domain: {}", email, hostedDomain);

            if (email == null || !Boolean.TRUE.equals(verified)) {
                log.warn("Google email not verified for: {}", email);
                throw new IllegalArgumentException("Email is not verified");
            }

            validateDomain(email, hostedDomain);

            String fullName = (String) payload.get("name");
            String givenName = (String) payload.get("given_name");
            String familyName = (String) payload.get("family_name");

            return new GoogleUserInfo(email, fullName, givenName, familyName);
        } catch (Exception ex) {
            log.error("Failed to verify Google ID token: {}", ex.getMessage());
            if (ex instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) ex;
            }
            throw new IllegalArgumentException("Invalid Google ID token", ex);
        }
    }

    public GoogleUserInfo verifyAccessToken(String accessToken) {
        log.debug("Verifying Google access token");
        try {
            Map<String, Object> tokenInfo = restTemplate.getForObject(TOKEN_INFO_URL, Map.class, accessToken);
            if (tokenInfo == null) {
                log.warn("Failed to get token info from Google");
                throw new IllegalArgumentException("Invalid Google access token");
            }

            String aud = valueAsString(tokenInfo.get("aud"));
            String azp = valueAsString(tokenInfo.get("azp"));
            
            log.debug("Access token aud: {}, azp: {}", aud, azp);

            // Access tokens might use 'aud' or 'azp' for the client ID
            boolean clientIdValid = (aud != null && allowedClientIds.contains(aud)) 
                                 || (azp != null && allowedClientIds.contains(azp));
            
            if (!clientIdValid) {
                log.warn("Invalid Google access token audience/azp. aud: {}, azp: {}, allowed: {}", 
                        aud, azp, allowedClientIds);
                throw new IllegalArgumentException("Invalid Google access token client ID");
            }

            String email = valueAsString(tokenInfo.get("email"));
            boolean emailVerified = valueAsBoolean(tokenInfo.get("email_verified"));
            if (email == null || !emailVerified) {
                log.warn("Google email not verified or missing for access token: {}", email);
                throw new IllegalArgumentException("Email is not verified");
            }

            Map<String, Object> profile = fetchUserProfile(accessToken);
            String hostedDomain = firstNonBlank(valueAsString(tokenInfo.get("hd")), valueAsString(profile.get("hd")));
            
            log.info("Access token verified for user: {}, domain: {}", email, hostedDomain);
            validateDomain(email, hostedDomain);

            String fullName = valueAsString(profile.get("name"));
            String givenName = valueAsString(profile.get("given_name"));
            String familyName = valueAsString(profile.get("family_name"));

            return new GoogleUserInfo(email, fullName, givenName, familyName);
        } catch (Exception ex) {
            log.error("Failed to verify Google access token: {}", ex.getMessage());
            if (ex instanceof IllegalArgumentException) {
                throw (IllegalArgumentException) ex;
            }
            throw new IllegalArgumentException("Invalid Google access token", ex);
        }
    }

    private Map<String, Object> fetchUserProfile(String accessToken) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken);
            HttpEntity<Void> request = new HttpEntity<>(headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    USER_INFO_URL,
                    HttpMethod.GET,
                    request,
                    new ParameterizedTypeReference<>() {
                    }
            );
            return response.getBody() == null ? Map.of() : response.getBody();
        } catch (Exception ex) {
            log.warn("Failed to fetch user profile using access token: {}", ex.getMessage());
            return Map.of();
        }
    }

    private void validateDomain(String email, String hostedDomain) {
        String allowedDomain = properties.getGoogle().getAllowedDomain();
        if (allowedDomain == null || allowedDomain.isBlank()) {
            return;
        }
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Invalid email");
        }
        String emailDomain = email.substring(email.indexOf('@') + 1);
        boolean domainMatch = allowedDomain.equalsIgnoreCase(emailDomain)
                || (hostedDomain != null && allowedDomain.equalsIgnoreCase(hostedDomain));
        
        if (!domainMatch) {
            log.warn("Unauthorized domain: {} (hd: {}), allowed: {}", emailDomain, hostedDomain, allowedDomain);
            throw new IllegalArgumentException("Unauthorized domain: " + emailDomain);
        }
    }

    private String valueAsString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private boolean valueAsBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }
        if (value != null) {
            return "true".equalsIgnoreCase(value.toString());
        }
        return false;
    }

    private String firstNonBlank(String primary, String fallback) {
        return primary != null && !primary.isBlank() ? primary : fallback;
    }
}
