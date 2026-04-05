# MFA (Multi-Factor Authentication) Implementation

This document outlines the complete MFA implementation for the Nu-Aura HRMS frontend.

## Overview

The MFA system provides two-factor authentication using Time-based One-Time Password (TOTP)
authenticator apps. Users can:

- Enable/disable MFA on their account
- Use authenticator apps (Google Authenticator, Microsoft Authenticator, Authy, etc.)
- Generate and use backup codes for emergency access
- Verify their identity during login using MFA

## Architecture

### API Layer

**File:** `/lib/api/mfa.ts`

Provides the following endpoints:

```typescript
mfaApi.getStatus()           // GET /v1/auth/mfa/status
mfaApi.getSetup()            // GET /v1/auth/mfa/setup
mfaApi.verify(code)          // POST /v1/auth/mfa/verify
mfaApi.disable(code)         // DELETE /v1/auth/mfa/disable
mfaApi.mfaLogin(userId, code) // POST /v1/auth/mfa-login
```

### Components

#### 1. MfaSetup Component

**File:** `/components/auth/MfaSetup.tsx`

A modal component that guides users through the MFA setup process.

**Props:**

```typescript
interface MfaSetupProps {
  isOpen: boolean;           // Controls modal visibility
  onSuccess: () => void;     // Callback when setup succeeds
  onCancel: () => void;      // Callback when user cancels
}
```

**Steps:**

1. **Loading** - Fetches QR code and secret from backend
2. **Scan** - Shows QR code and manual secret entry option
3. **Verify** - User enters 6-digit code from authenticator
4. **Backup** - Shows backup codes for emergency access
5. **Complete** - Success confirmation

**Features:**

- Copy-to-clipboard for secret and backup codes
- Auto-validation of 6-digit codes
- Error handling with user-friendly messages
- Prevents accidental closure during critical steps

#### 2. MfaVerification Component

**File:** `/components/auth/MfaVerification.tsx`

A card component shown during login when MFA is required.

**Props:**

```typescript
interface MfaVerificationProps {
  userId: string;            // User ID from initial login
  onSuccess: (token: string) => void;  // Callback with auth token
  onCancel: () => void;      // Callback to return to login
}
```

**Features:**

- Supports both authenticator codes and backup codes
- Auto-focus on input field
- Paste event handling for convenience
- Code length validation
- Numeric-only input
- Backup code toggle with 12-digit input support

#### 3. Security Settings Page

**File:** `/app/settings/security/page.tsx`

Full-featured security management page accessible at `/settings/security`.

**Features:**

- View current MFA status with setup date
- Enable/disable MFA with verification
- Display active sessions
- Security tips and best practices
- Responsive design with dark mode support
- Real-time status updates

### Updated Components

#### Login Page

**File:** `/app/auth/login/page.tsx`

**Changes:**

- Added MFA state management (`mfaRequired`, `mfaUserId`)
- Conditional rendering of `MfaVerification` component when MFA is required
- Handles `mfaRequired` response from login API
- Preserves form state and error messages
- Auto-redirects after successful MFA verification

## User Flows

### Setup Flow

1. User navigates to `/settings/security`
2. Clicks "Enable Two-Factor Authentication"
3. MfaSetup modal opens:

- Fetches QR code and secret
- User scans with authenticator app
- User confirms scanning and enters 6-digit code
- System verifies code and enables MFA
- Backup codes are displayed
- User saves backup codes
- Setup completes

4. User is redirected to security settings page

### Login with MFA

1. User enters email and password on `/auth/login`
2. Backend validates credentials and returns `mfaRequired: true` with `userId`
3. Frontend switches to MfaVerification component
4. User enters 6-digit code from authenticator app
5. Frontend calls `/v1/auth/mfa-login` with userId and code
6. On success, user is redirected to home page
7. If code fails, user can retry or switch to backup code

### Backup Code Usage

- User can toggle "Use a backup code instead" on the verification screen
- Expects 12-digit code format
- Each backup code can be used once
- Auto-submit when correct number of digits entered

### Disable MFA

1. User navigates to `/settings/security`
2. Clicks "Disable Two-Factor Authentication"
3. Inline form appears requesting current 6-digit code
4. User enters current authenticator code
5. Backend verifies code and disables MFA
6. User sees success message

## Dark Mode Support

All MFA components support dark mode with proper color theming:

- Uses `dark:` Tailwind classes
- Follows app color scheme (slate/primary/success/amber/red/blue)
- Proper contrast ratios in both modes

## Error Handling

### Common Errors

1. **Invalid Code**

- Message: "Invalid code. Please try again."
- Action: Clear input and refocus

2. **Code Expired**

- Message: "Code has expired. Please try again."
- Action: Request new code from authenticator

3. **Setup Failed**

- Message: From API response
- Action: Retry setup process

4. **Network Error**

- Message: "Failed to load MFA setup. Please try again."
- Action: Retry operation

### Validation

- Input length validation (6 digits for authenticator, 12 for backup)
- Numeric-only validation
- Auto-trim to max length
- Client-side validation before submission

## Security Considerations

1. **HTTPS Only**

- All MFA operations require secure connections
- QR codes and secrets are only transmitted over HTTPS

2. **Backup Code Storage**

- Users should store backup codes separately
- Component shows warning about secure storage
- Codes are single-use only

3. **Session Management**

- MFA verification binds token to user session
- Cannot reuse old tokens after disabling MFA
- Fresh authentication required after each MFA change

4. **Rate Limiting**

- Backend should implement rate limiting on MFA endpoints
- Prevent brute force attacks on 6-digit codes
- Lock account after multiple failed attempts

5. **Input Validation**

- Client-side numeric validation
- Server-side format validation
- CSRF protection via cookies

## Testing

### Manual Testing Checklist

- [ ] Enable MFA - scan QR code with real authenticator
- [ ] Verify 6-digit code entry
- [ ] View and copy backup codes
- [ ] Successfully complete setup
- [ ] Login with enabled MFA
- [ ] Test backup code usage
- [ ] Disable MFA with verification
- [ ] Test error messages and validation
- [ ] Test dark mode rendering
- [ ] Test responsive design on mobile
- [ ] Test paste functionality
- [ ] Test rate limiting behavior

### Integration Testing

The MFA components should be tested with the actual backend endpoints:

```bash
# Test MFA setup
curl -X GET https://api.example.com/api/v1/auth/mfa/setup

# Test code verification
curl -X POST https://api.example.com/api/v1/auth/mfa/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'

# Test MFA login
curl -X POST https://api.example.com/api/v1/auth/mfa-login \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","code":"123456"}'
```

## File Structure

```
/frontend
├── lib/
│   └── api/
│       └── mfa.ts                          # MFA API service
├── components/
│   └── auth/
│       ├── MfaSetup.tsx                    # Setup modal component
│       ├── MfaVerification.tsx             # Verification component
│       └── index.ts                        # Exports
├── app/
│   ├── auth/
│   │   └── login/
│   │       └── page.tsx                    # Updated with MFA support
│   └── settings/
│       ├── page.tsx                        # Main settings page
│       └── security/
│           └── page.tsx                    # New security settings page
└── MFA_IMPLEMENTATION.md                   # This file
```

## Future Enhancements

1. **WebAuthn Support**

- Add FIDO2/WebAuthn for hardware keys
- Support for security keys and biometrics

2. **Recovery Codes Management**

- Regenerate backup codes
- View previously generated codes
- Track code usage

3. **Device Trusting**

- Option to trust device for 30 days
- Skip MFA on trusted devices

4. **Multi-Device Management**

- View all authenticated devices
- Remote device logout
- Device fingerprinting

5. **SMS/Email Backup**

- Alternative verification methods
- SMS one-time codes
- Email verification links

6. **Admin Features**

- Force MFA on all users
- View user MFA status
- Reset user MFA if forgotten

## References

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [Google Authenticator](https://support.google.com/accounts/answer/1066447)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## Support

For issues or questions about the MFA implementation, please refer to:

- Backend MFA API documentation
- Component prop documentation in JSDoc comments
- Error messages for user feedback
