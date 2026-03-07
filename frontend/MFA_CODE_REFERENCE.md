# MFA Code Reference

Quick reference for MFA implementation code snippets.

## API Usage

### Import the MFA API service
```typescript
import { mfaApi } from '@/lib/api/mfa';
```

### Get MFA Status
```typescript
try {
  const status = await mfaApi.getStatus();
  console.log(status.enabled); // boolean
  console.log(status.setupAt); // ISO date string
} catch (error) {
  console.error('Failed to load MFA status', error);
}
```

### Get Setup Information
```typescript
try {
  const setup = await mfaApi.getSetup();
  console.log(setup.qrCodeUrl);    // URL to QR code image
  console.log(setup.secret);       // Manual entry code
  console.log(setup.backupCodes);  // Array of backup codes
} catch (error) {
  console.error('Failed to load setup', error);
}
```

### Verify MFA Code
```typescript
try {
  const result = await mfaApi.verify('123456');
  console.log(result.backupCodes); // Array of backup codes
} catch (error) {
  console.error('Invalid code', error);
}
```

### Disable MFA
```typescript
try {
  await mfaApi.disable('123456');
  console.log('MFA disabled');
} catch (error) {
  console.error('Failed to disable MFA', error);
}
```

### Login with MFA
```typescript
try {
  const result = await mfaApi.mfaLogin('user-id', '123456');
  console.log(result.accessToken);
  console.log(result.refreshToken);
  // User is now authenticated
} catch (error) {
  console.error('MFA verification failed', error);
}
```

## Component Usage

### MfaSetup Component
```typescript
import { MfaSetup } from '@/components/auth';
import { useState } from 'react';

export default function MyComponent() {
  const [showSetup, setShowSetup] = useState(false);
  
  const handleSuccess = () => {
    setShowSetup(false);
    // Reload settings or show success message
  };
  
  return (
    <>
      <button onClick={() => setShowSetup(true)}>
        Enable Two-Factor Authentication
      </button>
      
      <MfaSetup
        isOpen={showSetup}
        onSuccess={handleSuccess}
        onCancel={() => setShowSetup(false)}
      />
    </>
  );
}
```

### MfaVerification Component
```typescript
import { MfaVerification } from '@/components/auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const handleMfaSuccess = (token: string) => {
    // Token is already set by the API
    router.push('/home');
  };
  
  if (mfaRequired && userId) {
    return (
      <MfaVerification
        userId={userId}
        onSuccess={handleMfaSuccess}
        onCancel={() => {
          setMfaRequired(false);
          setUserId(null);
        }}
      />
    );
  }
  
  return <div>Login form...</div>;
}
```

## Security Settings Page Integration

```typescript
import { MfaSetup } from '@/components/auth';
import { mfaApi } from '@/lib/api/mfa';
import { useState, useEffect } from 'react';

export default function SecuritySettings() {
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await mfaApi.getStatus();
        setMfaEnabled(status.enabled);
      } catch (error) {
        console.error('Failed to load MFA status', error);
      }
    };
    loadStatus();
  }, []);
  
  const handleSetupSuccess = () => {
    setShowSetup(false);
    setMfaEnabled(true);
    // Show success message
  };
  
  return (
    <div>
      {mfaEnabled ? (
        <div>MFA is enabled</div>
      ) : (
        <button onClick={() => setShowSetup(true)}>
          Enable MFA
        </button>
      )}
      
      <MfaSetup
        isOpen={showSetup}
        onSuccess={handleSetupSuccess}
        onCancel={() => setShowSetup(false)}
      />
    </div>
  );
}
```

## Handling MFA During Login

```typescript
// In your login handler
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await login({ email, password });
    
    // Check if MFA is required
    if ((response as any).mfaRequired === true && (response as any).userId) {
      // Switch to MFA verification screen
      setMfaRequired(true);
      setMfaUserId((response as any).userId);
      return;
    }
    
    // Normal login success
    router.push('/home');
  } catch (error) {
    console.error('Login failed', error);
    setError(error.response?.data?.message || 'Login failed');
  }
};
```

## Backup Code Handling

```typescript
// Generate backup codes (returned from verify API)
const backupCodes = result.backupCodes;

// Download as text file
const downloadBackupCodes = (codes: string[]) => {
  const text = codes.join('\n');
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', 'backup-codes.txt');
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

// Print backup codes
const printBackupCodes = (codes: string[]) => {
  const printWindow = window.open('', '', 'height=400,width=600');
  printWindow?.document.write('<pre>' + codes.join('\n') + '</pre>');
  printWindow?.print();
};
```

## Error Handling Patterns

```typescript
// Handle MFA errors
const handleMfaError = (error: any) => {
  const message = error.response?.data?.message || 'MFA verification failed';
  
  if (error.response?.status === 400) {
    // Invalid code format
    setError('Please enter a valid code');
  } else if (error.response?.status === 401) {
    // Invalid or expired code
    setError('Code is invalid or has expired');
  } else if (error.response?.status === 429) {
    // Rate limited
    setError('Too many attempts. Please try again later');
  } else if (error.response?.status === 500) {
    // Server error
    setError('Server error. Please try again');
  } else {
    setError(message);
  }
};
```

## Input Validation Patterns

```typescript
// Validate 6-digit code
const validate6DigitCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

// Validate 12-digit backup code
const validate12DigitCode = (code: string): boolean => {
  return /^\d{12}$/.test(code);
};

// Auto-format numeric input
const formatNumericInput = (value: string, maxLength: number): string => {
  return value.replace(/\D/g, '').slice(0, maxLength);
};

// Validate input on change
const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
  const formatted = formatNumericInput(e.target.value, 6);
  setCode(formatted);
};
```

## Dark Mode Styling

```typescript
// Common dark mode patterns used in MFA components

// Alert boxes
<div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
  <p className="text-red-700 dark:text-red-300">Error message</p>
</div>

// Input fields
<input
  className="bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50 border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-slate-500"
/>

// Status cards
<div className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
  <p className="text-green-900 dark:text-green-100">Status message</p>
</div>

// Buttons
<button className="bg-primary-600 hover:bg-primary-700 dark:hover:bg-primary-700 text-white">
  Action
</button>
```

## Type Definitions

```typescript
// MFA API Response Types
interface MfaStatus {
  enabled: boolean;
  setupAt?: string;
}

interface MfaSetupResponse {
  qrCodeUrl: string;
  secret: string;
  backupCodes: string[];
}

interface MfaVerifyResponse {
  backupCodes: string[];
}

interface MfaLoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

// Component Props
interface MfaSetupProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface MfaVerificationProps {
  userId: string;
  onSuccess: (token: string) => void;
  onCancel: () => void;
}
```

## Testing Examples

```typescript
// Unit test for input validation
describe('MFA Input Validation', () => {
  it('should accept only numeric input', () => {
    const input = 'abc123def456';
    const formatted = input.replace(/\D/g, '');
    expect(formatted).toBe('123456');
  });
  
  it('should validate 6-digit code', () => {
    expect(/^\d{6}$/.test('123456')).toBe(true);
    expect(/^\d{6}$/.test('12345')).toBe(false);
    expect(/^\d{6}$/.test('123456a')).toBe(false);
  });
});

// Integration test example
describe('MFA Flow', () => {
  it('should enable MFA successfully', async () => {
    const { getByText, getByPlaceholderText } = render(<MfaSetup isOpen={true} />);
    
    // Wait for setup data to load
    await waitFor(() => {
      expect(getByText(/scan the qr code/i)).toBeInTheDocument();
    });
    
    // Click "I've scanned the code"
    fireEvent.click(getByText(/i've scanned/i));
    
    // Enter verification code
    fireEvent.change(getByPlaceholderText('000000'), {
      target: { value: '123456' }
    });
    
    // Submit
    fireEvent.click(getByText(/verify & enable/i));
    
    // Wait for success
    await waitFor(() => {
      expect(getByText(/enabled/i)).toBeInTheDocument();
    });
  });
});
```

## Common Issues and Solutions

### Issue: Code field not auto-focusing
**Solution:**
```typescript
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();
}, []);

return <input ref={inputRef} />;
```

### Issue: Copy button not working
**Solution:**
```typescript
const copyCode = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (error) {
    console.error('Copy failed', error);
  }
};
```

### Issue: Modal not closing on success
**Solution:**
```typescript
// Use useEffect to close after success
useEffect(() => {
  if (step === 'complete') {
    setTimeout(() => {
      onSuccess();
    }, 1500); // Allow success animation to play
  }
}, [step]);
```

### Issue: Form validation not preventing submission
**Solution:**
```typescript
<button
  type="submit"
  disabled={code.length !== 6}
>
  Verify
</button>
```

---

For more information, see `/MFA_IMPLEMENTATION.md`
