// Unified Google Token Storage for SSO
// This allows login to authenticate Drive and Mail simultaneously

const GOOGLE_TOKEN_KEY = 'nu_google_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'nu_google_token_expiry';

// Legacy keys for backward compatibility
const DRIVE_TOKEN_KEY = 'nu_drive_token';
const DRIVE_TOKEN_EXPIRY_KEY = 'nu_drive_token_expiry';
const MAIL_TOKEN_KEY = 'nu_mail_token';
const MAIL_TOKEN_EXPIRY_KEY = 'nu_mail_token_expiry';

export interface GoogleTokenInfo {
  token: string;
  expiry: number;
}

// Save unified Google token (called during SSO login)
export const saveGoogleToken = (token: string, expiresIn: number = 3600): void => {
  if (typeof window === 'undefined') return;

  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem(GOOGLE_TOKEN_KEY, token);
  localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());

  // Also save to Drive and Mail keys for compatibility
  localStorage.setItem(DRIVE_TOKEN_KEY, token);
  localStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, expiryTime.toString());
  localStorage.setItem(MAIL_TOKEN_KEY, token);
  localStorage.setItem(MAIL_TOKEN_EXPIRY_KEY, expiryTime.toString());
};

// Get stored Google token (checks validity with 5 min buffer)
export const getGoogleToken = (): string | null => {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
  const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);

  if (!token || !expiry) return null;

  // Check if token is expired (with 5 min buffer)
  if (Date.now() > parseInt(expiry) - 300000) {
    clearGoogleToken();
    return null;
  }

  return token;
};

// Clear all Google tokens
export const clearGoogleToken = (): void => {
  if (typeof window === 'undefined') return;

  // Clear unified token
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);

  // Clear Drive and Mail tokens
  localStorage.removeItem(DRIVE_TOKEN_KEY);
  localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(MAIL_TOKEN_KEY);
  localStorage.removeItem(MAIL_TOKEN_EXPIRY_KEY);
};

// Check if Google token exists and is valid
export const hasValidGoogleToken = (): boolean => {
  return getGoogleToken() !== null;
};

// Get token expiry time in milliseconds
export const getGoogleTokenExpiry = (): number | null => {
  if (typeof window === 'undefined') return null;

  const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
  if (!expiry) return null;

  return parseInt(expiry);
};

// Combined scopes for SSO login
export const GOOGLE_SSO_SCOPES = [
  // Drive scopes
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  // Gmail scopes
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  // Calendar scopes
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');
