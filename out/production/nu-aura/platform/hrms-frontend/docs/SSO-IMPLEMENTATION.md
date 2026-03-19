# Google SSO Implementation for NU-Drive and NU-Mail

## Overview

This document describes the Single Sign-On (SSO) implementation that allows users to authenticate with Google once during login and automatically have access to both NU-Drive (Google Drive) and NU-Mail (Gmail) without needing to connect separately.

## Architecture

### Authentication Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Login Page    │────>│  Google OAuth    │────>│  Backend API    │
│                 │     │  (implicit flow) │     │  /auth/google   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Save Google     │     │ Request Scopes:  │     │ Validate via    │
│ Access Token    │     │ - Drive API      │     │ Google userinfo │
│ (localStorage)  │     │ - Gmail API      │     │ API             │
└─────────────────┘     │ - OpenID/Email   │     └─────────────────┘
        │               └──────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Token Storage (localStorage)                 │
├─────────────────────────────────────────────────────────────────┤
│  nu_google_token        - Unified Google access token           │
│  nu_google_token_expiry - Token expiration timestamp            │
│  nu_drive_token         - Copy for Drive (compatibility)        │
│  nu_drive_token_expiry  - Drive token expiry                    │
│  nu_mail_token          - Copy for Mail (compatibility)         │
│  nu_mail_token_expiry   - Mail token expiry                     │
└─────────────────────────────────────────────────────────────────┘
```

## Files Modified

### Frontend

| File | Purpose |
|------|---------|
| `lib/utils/googleToken.ts` | Unified token storage utility |
| `lib/types/auth.ts` | Updated `GoogleLoginRequest` interface |
| `lib/hooks/useAuth.ts` | Clear Google tokens on logout |
| `app/auth/login/page.tsx` | SSO login with combined scopes |
| `app/nu-drive/page.tsx` | Use unified token storage |
| `app/nu-mail/page.tsx` | Use unified token storage |

### Backend

| File | Purpose |
|------|---------|
| `api/auth/dto/GoogleLoginRequest.java` | Added `isAccessToken` field |
| `application/auth/service/AuthService.java` | Handle access token validation |

## Implementation Details

### 1. Unified Token Storage (`lib/utils/googleToken.ts`)

```typescript
// Key constants
const GOOGLE_TOKEN_KEY = 'nu_google_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'nu_google_token_expiry';

// Combined scopes for SSO
export const GOOGLE_SSO_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
].join(' ');

// Functions
saveGoogleToken(token, expiresIn)  // Save token to all storage keys
getGoogleToken()                    // Get valid token (with 5-min buffer)
clearGoogleToken()                  // Clear all Google tokens
hasValidGoogleToken()               // Check if valid token exists
```

### 2. Login Page SSO Flow (`app/auth/login/page.tsx`)

```typescript
const handleGoogleSSO = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    // 1. Validate domain via Google userinfo API
    const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
    });

    // 2. Check @nulogic.io domain restriction
    if (userInfo.hd !== 'nulogic.io') {
      setError('Only @nulogic.io accounts are allowed');
      return;
    }

    // 3. Save token for Drive/Mail SSO
    saveGoogleToken(tokenResponse.access_token, tokenResponse.expires_in);

    // 4. Authenticate with backend
    await googleLogin({
      credential: tokenResponse.access_token,
      accessToken: true  // Important: tells backend this is an access token
    });
  },
  scope: GOOGLE_SSO_SCOPES + ' openid email profile',
  flow: 'implicit',
});
```

### 3. Backend Authentication (`AuthService.java`)

```java
public AuthResponse googleLogin(GoogleLoginRequest request) {
    String email;
    String hostedDomain;

    if (request.isAccessToken()) {
        // Handle access token - call Google userinfo API
        GoogleUserInfo userInfo = getUserInfoFromAccessToken(request.getCredential());
        email = userInfo.email;
        hostedDomain = userInfo.hd;
    } else {
        // Handle ID token - verify with Google
        GoogleIdToken idToken = verifyGoogleToken(request.getCredential());
        email = idToken.getPayload().getEmail();
        hostedDomain = idToken.getPayload().getHostedDomain();
    }

    // Domain validation and user authentication...
}
```

### 4. NU-Drive/NU-Mail Token Usage

Both pages now use the unified token storage:

```typescript
// Check for SSO token on mount
const getStoredToken = (): string | null => {
  return getGoogleToken();  // Uses unified storage
};

// Save token (also updates unified storage)
const saveToken = (token: string, expiresIn: number = 3600) => {
  saveGoogleToken(token, expiresIn);
  setAccessToken(token);
};

// Clear token (clears all Google tokens)
const clearToken = () => {
  clearGoogleToken();
  setAccessToken(null);
};
```

## Important Notes

### JSON Field Naming (Jackson Serialization)

The backend uses Lombok `@Data` which generates `isAccessToken()` getter for boolean fields. Jackson serializes this as `accessToken` (without the `is` prefix).

**Frontend must send:**
```json
{ "credential": "...", "accessToken": true }
```

**NOT:**
```json
{ "credential": "...", "isAccessToken": true }
```

### Token Expiration

- Google access tokens expire in ~1 hour (3600 seconds)
- A 5-minute buffer is used when checking token validity
- If token is expired, user must re-authenticate via Google

### Logout Behavior

When user logs out:
1. HRMS tokens are cleared
2. Google SSO tokens are cleared (Drive + Mail)
3. User must re-authenticate with Google to access Drive/Mail

### Disconnect Behavior

If user clicks "Disconnect" on NU-Drive or NU-Mail:
- All Google tokens are cleared (unified storage)
- Both Drive and Mail will require reconnection
- This is intentional for security (single sign-out)

## User Experience

### Login Flow
1. User clicks "Sign in with Google"
2. Google popup requests permissions for:
   - Basic profile (email, name)
   - Google Drive (view, upload files)
   - Gmail (read emails, view labels)
3. User grants permissions
4. User is logged into HRMS
5. NU-Drive and NU-Mail are automatically connected

### NU-Drive/NU-Mail Access
1. User navigates to NU-Drive or NU-Mail
2. If SSO token exists and is valid:
   - Files/emails load automatically
   - No "Connect" button shown
3. If no token or expired:
   - "Connect" button shown
   - User can connect individually (tokens are shared)

## Troubleshooting

### "Authentication Failed" Error
- Check backend logs for specific error
- Ensure `accessToken: true` is being sent (not `isAccessToken`)
- Verify Google OAuth client ID is configured

### Drive/Mail Not Auto-Connected
- Check localStorage for `nu_google_token`
- Verify token hasn't expired
- Try clearing browser cache and re-logging in

### "Only @nulogic.io accounts allowed"
- User is trying to sign in with non-nulogic.io Google account
- This is a security restriction, not a bug

## Security Considerations

1. **Domain Restriction**: Only `@nulogic.io` accounts can sign in
2. **Token Storage**: Tokens stored in localStorage (client-side)
3. **Token Validation**: Backend validates tokens via Google API
4. **Scope Limitation**: Minimal required scopes requested
5. **Single Sign-Out**: Logout clears all tokens
