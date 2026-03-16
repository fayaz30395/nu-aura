'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Send,
  Star,
  Trash2,
  Tag,
  Search,
  RefreshCw,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  Mail,
  AlertCircle,
  User,
  Calendar,
  FileText,
  MailOpen,
  Reply,
  ReplyAll,
  Forward,
  X,
  Loader2,
  Plus,
  Download,
  Archive,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { AppLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useGoogleLogin } from '@react-oauth/google';
import { getGoogleToken, saveGoogleToken, clearGoogleToken } from '@/lib/utils/googleToken';
import { employeeService } from '@/lib/services/employee.service';
import { Employee } from '@/lib/types/employee';
import { sanitizeEmailHtml } from '@/lib/utils/sanitize';

interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface SendAsAddress {
  sendAsEmail: string;
  displayName?: string;
  signature?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  treatAsAlias?: boolean;
}

interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: string;
  cc?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
  body?: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
}

interface EmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

interface ComposeEmail {
  to: string;
  cc: string;
  subject: string;
  body: string;
  replyToId?: string;
  threadId?: string;
}

interface EmailContact {
  email: string;
  name: string;
  designation?: string;
  department?: string;
}

// Gmail scopes for compose/send
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.settings.basic',
].join(' ');

function MailContent() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [labels, setLabels] = useState<EmailLabel[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>('INBOX');
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [prevPageTokens, setPrevPageTokens] = useState<string[]>([]);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [composeMode, setComposeMode] = useState<'new' | 'reply' | 'replyAll' | 'forward'>('new');
  const [composeEmail, setComposeEmail] = useState<ComposeEmail>({
    to: '',
    cc: '',
    subject: '',
    body: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Auto-complete state
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<EmailContact[]>([]);
  const [activeField, setActiveField] = useState<'to' | 'cc' | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const toInputRef = useRef<HTMLInputElement>(null);
  const ccInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Signature state
  const [emailSignature, setEmailSignature] = useState<string>('');
  const [emailSignatureHtml, setEmailSignatureHtml] = useState<string>('');

  // Save token using unified storage (also saves to Mail-specific keys for compatibility)
  const saveToken = (token: string, expiresIn: number = 3600) => {
    saveGoogleToken(token, expiresIn);
    setAccessToken(token);
  };

  // Clear stored token using unified storage
  const clearToken = () => {
    clearGoogleToken();
    setAccessToken(null);
    setEmails([]);
    setLabels([]);
    setUnreadCount(0);
  };

  // Check if stored token is still valid (uses unified token from SSO login)
  const getStoredToken = (): string | null => {
    return getGoogleToken();
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      saveToken(tokenResponse.access_token, tokenResponse.expires_in);
      setError(null);
      await loadLabels(tokenResponse.access_token);
      await loadEmails(tokenResponse.access_token);
      await loadSignature(tokenResponse.access_token);
    },
    onError: (errorResponse) => {
      console.error('Google login error:', errorResponse);
      setError('Failed to connect to Gmail. Please try again.');
    },
    scope: GMAIL_SCOPES,
  });

  // Load employee contacts from HRMS
  const loadContacts = useCallback(async () => {
    try {
      const response = await employeeService.getAllEmployees(0, 500);
      const employeeContacts: EmailContact[] = response.content
        .filter((emp: Employee) => emp.workEmail)
        .map((emp: Employee) => ({
          email: emp.workEmail,
          name: emp.fullName,
          designation: emp.designation,
          department: emp.departmentName,
        }));
      setContacts(employeeContacts);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  }, []);

  // Load Gmail signature
  const loadSignature = async (token: string) => {
    try {
      // Get send-as settings which contains the signature
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/settings/sendAs',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        // Find the primary send-as address (usually the default)
        const primarySendAs = data.sendAs?.find((s: SendAsAddress) => s.isPrimary) || data.sendAs?.[0];
        if (primarySendAs?.signature) {
          // Clean up the signature HTML
          let cleanedSignature = primarySendAs.signature;
          // Remove problematic non-breaking space patterns that cause Â characters
          cleanedSignature = cleanedSignature.replace(/Â/g, '');
          // Replace multiple &nbsp; with single space
          cleanedSignature = cleanedSignature.replace(/(&nbsp;)+/g, ' ');
          // Store the cleaned HTML signature
          setEmailSignatureHtml(cleanedSignature);
          // Also create plain text version for display reference
          const div = document.createElement('div');
          div.innerHTML = cleanedSignature;
          const plainTextSignature = div.textContent || div.innerText || '';
          setEmailSignature(plainTextSignature);
        }
      }
    } catch (err) {
      console.error('Error loading signature:', err);
      // Signature loading is optional, don't show error to user
    }
  };

  // Check for stored token on mount
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // Load contacts from HRMS
    loadContacts();

    const storedToken = getStoredToken();
    if (storedToken) {
      setAccessToken(storedToken);
      loadLabels(storedToken);
      loadEmails(storedToken);
      loadSignature(storedToken);
    } else {
      setIsLoading(false);
    }
    // loadLabels, loadEmails, loadSignature take a token param and are intentionally
    // omitted: including them without useCallback would cause an infinite re-render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, isAuthenticated, router, loadContacts]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !toInputRef.current?.contains(event.target as Node) &&
        !ccInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter contacts based on input
  const filterContacts = useCallback((value: string, field: 'to' | 'cc') => {
    setActiveField(field);

    // Get the last email being typed (after the last comma)
    const lastValue = value.split(',').pop()?.trim().toLowerCase() || '';

    if (lastValue.length < 1) {
      setShowSuggestions(false);
      return;
    }

    // Get already entered emails to exclude
    const existingEmails = value
      .split(',')
      .slice(0, -1)
      .map(e => e.trim().toLowerCase());

    const filtered = contacts.filter(contact => {
      const isAlreadyAdded = existingEmails.includes(contact.email.toLowerCase());
      const matchesSearch =
        contact.email.toLowerCase().includes(lastValue) ||
        contact.name.toLowerCase().includes(lastValue) ||
        contact.designation?.toLowerCase().includes(lastValue) ||
        contact.department?.toLowerCase().includes(lastValue);

      return !isAlreadyAdded && matchesSearch;
    });

    setFilteredContacts(filtered.slice(0, 8)); // Limit to 8 suggestions
    setShowSuggestions(filtered.length > 0);
  }, [contacts]);

  // Handle contact selection
  const selectContact = (contact: EmailContact, field: 'to' | 'cc') => {
    const currentValue = field === 'to' ? composeEmail.to : composeEmail.cc;
    const parts = currentValue.split(',');
    parts.pop(); // Remove the partial entry
    parts.push(contact.email);

    const newValue = parts.filter(p => p.trim()).join(', ') + ', ';

    setComposeEmail({
      ...composeEmail,
      [field]: newValue,
    });

    setShowSuggestions(false);

    // Focus back on the input
    if (field === 'to') {
      toInputRef.current?.focus();
    } else {
      ccInputRef.current?.focus();
    }
  };

  const loadLabels = async (token: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          clearToken();
          setError('Session expired. Please reconnect to Gmail.');
          return;
        }
        throw new Error('Failed to fetch labels');
      }

      const data = await response.json();
      const systemLabels = ['INBOX', 'SENT', 'STARRED', 'DRAFT', 'TRASH', 'SPAM'];
      const filteredLabels = (data.labels || [])
        .filter((label: EmailLabel) => systemLabels.includes(label.id))
        .sort((a: EmailLabel, b: EmailLabel) => systemLabels.indexOf(a.id) - systemLabels.indexOf(b.id));

      setLabels(filteredLabels);

      // Get unread count for inbox
      const inboxLabel = data.labels?.find((l: EmailLabel) => l.id === 'INBOX');
      if (inboxLabel) {
        const labelResponse = await fetch(
          `https://www.googleapis.com/gmail/v1/users/me/labels/INBOX`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (labelResponse.ok) {
          const labelData = await labelResponse.json();
          setUnreadCount(labelData.messagesUnread || 0);
        }
      }
    } catch (err) {
      console.error('Error loading labels:', err);
    }
  };

  const loadEmails = async (token: string, labelId: string = 'INBOX', nextPageToken?: string) => {
    try {
      setIsLoading(true);
      let url = `https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=20`;
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearToken();
          setError('Session expired. Please reconnect to Gmail.');
          return;
        }
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      setPageToken(data.nextPageToken || null);

      if (!data.messages || data.messages.length === 0) {
        setEmails([]);
        return;
      }

      // Fetch details for each message
      const emailDetails = await Promise.all(
        data.messages.slice(0, 20).map(async (msg: { id: string }) => {
          const msgResponse = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Cc&metadataHeaders=Date`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (!msgResponse.ok) return null;

          const msgData = await msgResponse.json();
          const headers = msgData.payload?.headers || [];

          const getHeader = (name: string) =>
            headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

          const fromHeader = getHeader('From');
          const fromMatch = fromHeader.match(/^([^<]*)<([^>]+)>/) || [null, fromHeader, fromHeader];

          return {
            id: msgData.id,
            threadId: msgData.threadId,
            snippet: msgData.snippet || '',
            subject: getHeader('Subject') || '(No Subject)',
            from: fromMatch[1]?.trim() || fromHeader,
            fromEmail: fromMatch[2] || fromHeader,
            to: getHeader('To'),
            cc: getHeader('Cc'),
            date: getHeader('Date'),
            isRead: !msgData.labelIds?.includes('UNREAD'),
            isStarred: msgData.labelIds?.includes('STARRED'),
            hasAttachments: msgData.payload?.parts?.some((p: { filename: string }) => p.filename) || false,
            labels: msgData.labelIds || [],
          };
        })
      );

      setEmails(emailDetails.filter(Boolean) as EmailMessage[]);
      setError(null);
    } catch (err) {
      console.error('Error loading emails:', err);
      setError('Failed to load emails from Gmail');
    } finally {
      setIsLoading(false);
    }
  };

  // Load full email content when selecting an email
  const loadEmailContent = async (emailId: string) => {
    if (!accessToken) return;

    setIsLoadingEmail(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch email content');
      }

      const data = await response.json();

      // Extract email body
      let bodyText = '';
      let bodyHtml = '';
      const attachments: EmailAttachment[] = [];

      const extractBody = (payload: unknown): void => {
        const p = payload as { body?: { data?: string; size?: number; attachmentId?: string }; mimeType?: string; parts?: unknown[]; filename?: string };
        if (p.body?.data) {
          const decoded = atob(p.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          if (p.mimeType === 'text/html') {
            bodyHtml = decoded;
          } else if (p.mimeType === 'text/plain') {
            bodyText = decoded;
          }
        }

        if (p.parts) {
          for (const part of p.parts) {
            const partData = part as { filename?: string; body?: { attachmentId?: string; size?: number }; mimeType?: string };
            if (partData.filename && partData.body?.attachmentId) {
              attachments.push({
                id: partData.body.attachmentId,
                filename: partData.filename,
                mimeType: partData.mimeType || 'application/octet-stream',
                size: partData.body.size || 0,
              });
            } else {
              extractBody(part);
            }
          }
        }
      };

      extractBody(data.payload);

      // Get headers
      const headers = data.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const fromHeader = getHeader('From');
      const fromMatch = fromHeader.match(/^([^<]*)<([^>]+)>/) || [null, fromHeader, fromHeader];

      const fullEmail: EmailMessage = {
        id: data.id,
        threadId: data.threadId,
        snippet: data.snippet || '',
        subject: getHeader('Subject') || '(No Subject)',
        from: fromMatch[1]?.trim() || fromHeader,
        fromEmail: fromMatch[2] || fromHeader,
        to: getHeader('To'),
        cc: getHeader('Cc'),
        date: getHeader('Date'),
        isRead: !data.labelIds?.includes('UNREAD'),
        isStarred: data.labelIds?.includes('STARRED'),
        hasAttachments: attachments.length > 0,
        labels: data.labelIds || [],
        body: bodyText,
        bodyHtml: bodyHtml,
        attachments: attachments,
      };

      setSelectedEmail(fullEmail);

      // Mark as read if unread
      if (data.labelIds?.includes('UNREAD')) {
        await markAsRead(emailId);
      }
    } catch (err) {
      console.error('Error loading email content:', err);
      setError('Failed to load email content');
    } finally {
      setIsLoadingEmail(false);
    }
  };

  // Mark email as read
  const markAsRead = async (emailId: string) => {
    if (!accessToken) return;

    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            removeLabelIds: ['UNREAD'],
          }),
        }
      );

      // Update local state
      setEmails(emails.map(e =>
        e.id === emailId ? { ...e, isRead: true } : e
      ));

      // Refresh unread count
      if (unreadCount > 0) {
        setUnreadCount(unreadCount - 1);
      }
    } catch (err) {
      console.error('Error marking email as read:', err);
    }
  };

  // Toggle star
  const toggleStar = async (emailId: string, isStarred: boolean) => {
    if (!accessToken) return;

    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            isStarred
              ? { removeLabelIds: ['STARRED'] }
              : { addLabelIds: ['STARRED'] }
          ),
        }
      );

      // Update local state
      setEmails(emails.map(e =>
        e.id === emailId ? { ...e, isStarred: !isStarred } : e
      ));

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, isStarred: !isStarred });
      }
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  // Archive email
  const archiveEmail = async (emailId: string) => {
    if (!accessToken) return;

    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/modify`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            removeLabelIds: ['INBOX'],
          }),
        }
      );

      // Remove from list and go back
      setEmails(emails.filter(e => e.id !== emailId));
      setSelectedEmail(null);
    } catch (err) {
      console.error('Error archiving email:', err);
    }
  };

  // Delete email (move to trash)
  const deleteEmail = async (emailId: string) => {
    if (!accessToken) return;

    try {
      await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${emailId}/trash`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Remove from list and go back
      setEmails(emails.filter(e => e.id !== emailId));
      setSelectedEmail(null);
    } catch (err) {
      console.error('Error deleting email:', err);
    }
  };

  // Download attachment
  const downloadAttachment = async (messageId: string, attachmentId: string, filename: string) => {
    if (!accessToken) return;

    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) throw new Error('Failed to download attachment');

      const data = await response.json();
      const decoded = atob(data.data.replace(/-/g, '+').replace(/_/g, '/'));

      // Create blob and download
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }

      const blob = new Blob([bytes]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading attachment:', err);
      setError('Failed to download attachment');
    }
  };

  // Open compose modal
  const openCompose = (mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new') => {
    setComposeMode(mode);
    setSendError(null);
    setSendSuccess(false);
    setShowSuggestions(false);

    // Don't include signature in textarea body - it will be added as HTML when sending
    // Show a placeholder message to indicate signature will be added
    if (mode === 'new') {
      setComposeEmail({
        to: '',
        cc: '',
        subject: '',
        body: '',
      });
    } else if (selectedEmail) {
      const originalSubject = selectedEmail.subject;
      const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;
      const forwardSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;

      const quotedBody = `\n\n---------- Original Message ----------\nFrom: ${selectedEmail.from} <${selectedEmail.fromEmail}>\nDate: ${selectedEmail.date}\nSubject: ${selectedEmail.subject}\nTo: ${selectedEmail.to}\n\n${selectedEmail.body || selectedEmail.snippet}`;

      if (mode === 'reply') {
        setComposeEmail({
          to: selectedEmail.fromEmail,
          cc: '',
          subject: replySubject,
          body: quotedBody,
          replyToId: selectedEmail.id,
          threadId: selectedEmail.threadId,
        });
      } else if (mode === 'replyAll') {
        // Get all recipients except current user
        const allRecipients = [selectedEmail.fromEmail];
        if (selectedEmail.cc) {
          allRecipients.push(...selectedEmail.cc.split(',').map(e => e.trim()));
        }
        // Filter out current user's email
        const filteredRecipients = allRecipients.filter(e => !e.includes(user?.email || ''));

        setComposeEmail({
          to: filteredRecipients.join(', '),
          cc: '',
          subject: replySubject,
          body: quotedBody,
          replyToId: selectedEmail.id,
          threadId: selectedEmail.threadId,
        });
      } else if (mode === 'forward') {
        setComposeEmail({
          to: '',
          cc: '',
          subject: forwardSubject,
          body: quotedBody,
        });
      }
    }

    setShowCompose(true);
  };

  // Send email
  const sendEmail = async () => {
    if (!accessToken || !composeEmail.to) return;

    setIsSending(true);
    setSendError(null);

    try {
      // Build the email in RFC 2822 format with HTML support
      // Convert plain text body to HTML (preserve line breaks and basic formatting)
      let htmlBody = composeEmail.body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      // Wrap body in div
      htmlBody = `<div>${htmlBody}</div>`;

      // Append HTML signature if available
      if (emailSignatureHtml) {
        htmlBody += `<br><div>--</div>${emailSignatureHtml}`;
      }

      let emailContent = '';
      emailContent += `To: ${composeEmail.to}\r\n`;
      if (composeEmail.cc) {
        emailContent += `Cc: ${composeEmail.cc}\r\n`;
      }
      emailContent += `Subject: ${composeEmail.subject}\r\n`;
      emailContent += `MIME-Version: 1.0\r\n`;
      emailContent += `Content-Type: text/html; charset="UTF-8"\r\n`;
      emailContent += `\r\n`;
      emailContent += htmlBody;

      // Base64 encode the email
      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const url = composeEmail.threadId
        ? `https://www.googleapis.com/gmail/v1/users/me/messages/send?threadId=${composeEmail.threadId}`
        : 'https://www.googleapis.com/gmail/v1/users/me/messages/send';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedEmail,
          threadId: composeEmail.threadId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send email');
      }

      setSendSuccess(true);

      // Close compose after a brief delay
      setTimeout(() => {
        setShowCompose(false);
        setSendSuccess(false);
        // Refresh emails if we're in sent folder or if it was a reply
        if (selectedLabel === 'SENT' || composeEmail.threadId) {
          loadEmails(accessToken, selectedLabel);
        }
      }, 1500);
    } catch (err: unknown) {
      console.error('Error sending email:', err);
      setSendError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleLabelSelect = async (labelId: string) => {
    setSelectedLabel(labelId);
    setSelectedEmail(null);
    setPrevPageTokens([]);
    if (accessToken) {
      await loadEmails(accessToken, labelId);
    }
  };

  const handleNextPage = async () => {
    if (!accessToken || !pageToken) return;
    setPrevPageTokens([...prevPageTokens, pageToken]);
    await loadEmails(accessToken, selectedLabel, pageToken);
  };

  const handlePrevPage = async () => {
    if (!accessToken || prevPageTokens.length === 0) return;
    const newPrevTokens = [...prevPageTokens];
    const prevToken = newPrevTokens.pop();
    setPrevPageTokens(newPrevTokens);
    await loadEmails(accessToken, selectedLabel, prevToken);
  };

  const refreshEmails = async () => {
    if (accessToken) {
      await loadEmails(accessToken, selectedLabel);
      await loadLabels(accessToken);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getLabelIcon = (labelId: string) => {
    switch (labelId) {
      case 'INBOX': return <Inbox className="h-4 w-4" />;
      case 'SENT': return <Send className="h-4 w-4" />;
      case 'STARRED': return <Star className="h-4 w-4" />;
      case 'DRAFT': return <FileText className="h-4 w-4" />;
      case 'TRASH': return <Trash2 className="h-4 w-4" />;
      case 'SPAM': return <AlertCircle className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnectClick = () => {
    googleLogin();
  };

  if (isLoading && !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] font-medium">Loading Nu-Mail...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout
      activeMenuItem="nu-mail"
      breadcrumbs={[{ label: 'Nu-Mail', href: '/nu-mail' }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Mail className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Nu-Mail</h1>
              <p className="text-sm text-[var(--text-muted)]">Your organization&apos;s Gmail inbox</p>
            </div>
          </div>
          {!accessToken ? (
            <Button
              variant="primary"
              onClick={handleConnectClick}
              leftIcon={<Mail className="h-4 w-4" />}
            >
              Connect Gmail
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full text-sm font-medium">
                  {unreadCount} unread
                </span>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={() => openCompose('new')}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Compose
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshEmails}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearToken}
                className="text-[var(--text-muted)] hover:text-red-600"
              >
                Disconnect
              </Button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30">
            <CardContent className="py-4">
              <div className="flex items-center gap-4 text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={handleConnectClick} className="ml-auto">
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!accessToken ? (
          /* Connect Card */
          <Card className="border-2 border-dashed border-[var(--border-main)] dark:border-[var(--border-main)]">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-6">
                  <Mail className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  Connect to Gmail
                </h2>
                <p className="text-[var(--text-muted)] mb-6 max-w-md mx-auto">
                  Access your organization&apos;s Gmail directly within NuLogic.
                  Read, send, and manage your emails all in one place.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConnectClick}
                  leftIcon={<Mail className="h-5 w-5" />}
                >
                  Connect Gmail
                </Button>
                <p className="text-xs text-[var(--text-muted)] mt-4">
                  You&apos;ll be asked to grant access to read and send emails.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar */}
            <Card className="lg:col-span-1">
              <CardContent className="p-2">
                <Button
                  variant="primary"
                  className="w-full mb-3"
                  onClick={() => openCompose('new')}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Compose
                </Button>
                <nav className="space-y-1">
                  {labels.map((label) => (
                    <button
                      key={label.id}
                      onClick={() => handleLabelSelect(label.id)}
                      className={`w-full flex items-center justify-between gap-4 px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedLabel === label.id
                          ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {getLabelIcon(label.id)}
                        <span>{label.name}</span>
                      </div>
                      {label.id === 'INBOX' && unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-full text-xs font-medium">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>

            {/* Email List */}
            <Card className="lg:col-span-3">
              {/* Toolbar */}
              <div className="border-b border-[var(--border-main)] p-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                    <Input
                      placeholder="Search emails..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={prevPageTokens.length === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={!pageToken}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                    <p className="text-[var(--text-muted)]">Loading emails...</p>
                  </div>
                </div>
              ) : selectedEmail ? (
                /* Email Detail View */
                <div className="p-6">
                  {isLoadingEmail ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                        <p className="text-[var(--text-muted)]">Loading email content...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Back button and actions */}
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmail(null)}
                          leftIcon={<ChevronLeft className="h-4 w-4" />}
                        >
                          Back to list
                        </Button>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCompose('reply')}
                            title="Reply"
                          >
                            <Reply className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCompose('replyAll')}
                            title="Reply All"
                          >
                            <ReplyAll className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCompose('forward')}
                            title="Forward"
                          >
                            <Forward className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => archiveEmail(selectedEmail.id)}
                            title="Archive"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEmail(selectedEmail.id)}
                            title="Delete"
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Email header */}
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                            {selectedEmail.subject}
                          </h2>
                          <button
                            onClick={() => toggleStar(selectedEmail.id, selectedEmail.isStarred)}
                            className={selectedEmail.isStarred ? 'text-yellow-500' : 'text-[var(--text-muted)] hover:text-yellow-500'}
                          >
                            <Star className={`h-5 w-5 ${selectedEmail.isStarred ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[var(--text-primary)]">
                                {selectedEmail.from}
                              </span>
                              <span className="text-sm text-[var(--text-muted)]">
                                &lt;{selectedEmail.fromEmail}&gt;
                              </span>
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">to {selectedEmail.to}</p>
                            {selectedEmail.cc && (
                              <p className="text-sm text-[var(--text-muted)]">cc: {selectedEmail.cc}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                            <Calendar className="h-4 w-4" />
                            {new Date(selectedEmail.date).toLocaleString()}
                          </div>
                        </div>

                        {/* Email body */}
                        <div className="border-t border-[var(--border-main)] pt-4">
                          {selectedEmail.bodyHtml ? (
                            <div
                              className="prose dark:prose-invert max-w-none email-content"
                              dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(selectedEmail.bodyHtml) }}
                            />
                          ) : selectedEmail.body ? (
                            <pre className="text-[var(--text-secondary)] whitespace-pre-wrap font-sans text-sm">
                              {selectedEmail.body}
                            </pre>
                          ) : (
                            <p className="text-[var(--text-muted)] italic">
                              {selectedEmail.snippet}
                            </p>
                          )}
                        </div>

                        {/* Attachments */}
                        {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                          <div className="border-t border-[var(--border-main)] pt-4">
                            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
                              <Paperclip className="h-4 w-4" />
                              Attachments ({selectedEmail.attachments.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedEmail.attachments.map((attachment) => (
                                <button
                                  key={attachment.id}
                                  onClick={() => downloadAttachment(selectedEmail.id, attachment.id, attachment.filename)}
                                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                  <FileText className="h-4 w-4 text-[var(--text-muted)]" />
                                  <span className="text-sm text-[var(--text-secondary)]">
                                    {attachment.filename}
                                  </span>
                                  <span className="text-xs text-[var(--text-muted)]">
                                    ({formatFileSize(attachment.size)})
                                  </span>
                                  <Download className="h-3 w-3 text-[var(--text-muted)]" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="border-t border-[var(--border-main)] pt-4 flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => openCompose('reply')}
                            leftIcon={<Reply className="h-4 w-4" />}
                          >
                            Reply
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => openCompose('forward')}
                            leftIcon={<Forward className="h-4 w-4" />}
                          >
                            Forward
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : filteredEmails.length === 0 ? (
                /* Empty State */
                <div className="py-16">
                  <div className="text-center">
                    <MailOpen className="h-16 w-16 text-[var(--text-muted)] dark:text-[var(--text-secondary)] mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
                      {searchQuery ? 'No emails found' : 'No emails here'}
                    </h3>
                    <p className="text-[var(--text-muted)]">
                      {searchQuery
                        ? 'Try adjusting your search query'
                        : `Your ${selectedLabel.toLowerCase()} is empty`}
                    </p>
                  </div>
                </div>
              ) : (
                /* Email List */
                <div className="divide-y divide-surface-100 dark:divide-surface-800">
                  {filteredEmails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => loadEmailContent(email.id)}
                      className={`flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors ${
                        !email.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(email.id, email.isStarred);
                        }}
                        className={`flex-shrink-0 ${
                          email.isStarred
                            ? 'text-yellow-500'
                            : 'text-[var(--text-muted)] dark:text-[var(--text-secondary)] hover:text-yellow-500'
                        }`}
                      >
                        <Star className={`h-5 w-5 ${email.isStarred ? 'fill-current' : ''}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm truncate ${
                            !email.isRead
                              ? 'font-semibold text-[var(--text-primary)]'
                              : 'font-medium text-[var(--text-secondary)]'
                          }`}>
                            {email.from}
                          </span>
                          {email.hasAttachments && (
                            <Paperclip className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${
                            !email.isRead
                              ? 'font-medium text-[var(--text-primary)]'
                              : 'text-[var(--text-secondary)]'
                          }`}>
                            {email.subject}
                          </span>
                          <span className="text-sm text-[var(--text-muted)] truncate hidden sm:inline">
                            - {email.snippet}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-xs text-[var(--text-muted)]">
                        {formatDate(email.date)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Compose Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {composeMode === 'new' ? 'New Message' :
                   composeMode === 'reply' ? 'Reply' :
                   composeMode === 'replyAll' ? 'Reply All' : 'Forward'}
                </h3>
                <button
                  onClick={() => setShowCompose(false)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sendError && (
                  <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{sendError}</span>
                  </div>
                )}

                {sendSuccess && (
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg">
                    <Send className="h-4 w-4" />
                    <span className="text-sm">Email sent successfully!</span>
                  </div>
                )}

                {/* To field with auto-complete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    To
                  </label>
                  <div className="relative">
                    <Input
                      ref={toInputRef}
                      value={composeEmail.to}
                      onChange={(e) => {
                        setComposeEmail({ ...composeEmail, to: e.target.value });
                        filterContacts(e.target.value, 'to');
                      }}
                      onFocus={() => filterContacts(composeEmail.to, 'to')}
                      placeholder="Start typing to search employees..."
                      className="pr-10"
                    />
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  {/* Suggestions dropdown for To */}
                  {showSuggestions && activeField === 'to' && filteredContacts.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {filteredContacts.map((contact, _index) => (
                        <button
                          key={contact.email}
                          onClick={() => selectContact(contact, 'to')}
                          className="w-full px-4 py-2 text-left hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {contact.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              {contact.email}
                              {contact.designation && ` • ${contact.designation}`}
                              {contact.department && ` • ${contact.department}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cc field with auto-complete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Cc
                  </label>
                  <div className="relative">
                    <Input
                      ref={ccInputRef}
                      value={composeEmail.cc}
                      onChange={(e) => {
                        setComposeEmail({ ...composeEmail, cc: e.target.value });
                        filterContacts(e.target.value, 'cc');
                      }}
                      onFocus={() => filterContacts(composeEmail.cc, 'cc')}
                      placeholder="Start typing to search employees..."
                      className="pr-10"
                    />
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                  </div>
                  {/* Suggestions dropdown for Cc */}
                  {showSuggestions && activeField === 'cc' && filteredContacts.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute z-50 w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {filteredContacts.map((contact, _index) => (
                        <button
                          key={contact.email}
                          onClick={() => selectContact(contact, 'cc')}
                          className="w-full px-4 py-2 text-left hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-secondary)] flex items-center gap-4 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {contact.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] truncate">
                              {contact.email}
                              {contact.designation && ` • ${contact.designation}`}
                              {contact.department && ` • ${contact.department}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Subject
                  </label>
                  <Input
                    value={composeEmail.subject}
                    onChange={(e) => setComposeEmail({ ...composeEmail, subject: e.target.value })}
                    placeholder="Email subject"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                    Message
                  </label>
                  <textarea
                    value={composeEmail.body}
                    onChange={(e) => setComposeEmail({ ...composeEmail, body: e.target.value })}
                    placeholder="Write your message..."
                    rows={8}
                    className="w-full px-3 py-2 border border-[var(--border-main)] dark:border-[var(--border-main)] rounded-t-lg bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-surface-400 dark:placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                  {/* Signature Preview */}
                  {emailSignatureHtml && (
                    <div className="border border-t-0 border-[var(--border-main)] dark:border-[var(--border-main)] rounded-b-lg bg-[var(--bg-secondary)] dark:bg-[var(--bg-secondary)]/50 p-4">
                      <p className="text-xs text-[var(--text-muted)] mb-2">-- Signature --</p>
                      <div
                        className="signature-preview text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]"
                        dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(emailSignatureHtml) }}
                      />
                    </div>
                  )}
                  {!emailSignatureHtml && emailSignature && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Your Gmail signature will be added when sending.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)] bg-[var(--bg-secondary)]">
                <Button
                  variant="ghost"
                  onClick={() => setShowCompose(false)}
                >
                  Discard
                </Button>
                <Button
                  variant="primary"
                  onClick={sendEmail}
                  disabled={isSending || !composeEmail.to || sendSuccess}
                  leftIcon={isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                >
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Email content styles */}
      <style jsx global>{`
        .email-content {
          font-size: 14px;
          line-height: 1.6;
        }
        .email-content img {
          max-width: 100%;
          height: auto;
        }
        .email-content a {
          color: #3b82f6;
          text-decoration: underline;
        }
        .email-content blockquote {
          border-left: 3px solid #e5e7eb;
          padding-left: 1rem;
          margin-left: 0;
          color: #6b7280;
        }
        /* Signature preview styles */
        .signature-preview {
          font-size: 13px;
          line-height: 1.5;
        }
        .signature-preview table {
          border-collapse: collapse;
          border-spacing: 0;
        }
        .signature-preview td {
          padding: 0;
          vertical-align: top;
        }
        .signature-preview img {
          max-width: 150px;
          height: auto;
          display: block;
        }
        .signature-preview a {
          color: #3b82f6;
          text-decoration: none;
        }
        .signature-preview a:hover {
          text-decoration: underline;
        }
        .signature-preview br {
          display: block;
          margin: 2px 0;
          content: "";
        }
        .signature-preview p {
          margin: 0;
          padding: 0;
        }
        .signature-preview span {
          display: inline;
        }
        .signature-preview div {
          margin: 0;
          padding: 0;
        }
        .signature-preview font {
          font-family: inherit;
        }
      `}</style>
    </AppLayout>
  );
}

export default function NuMailPage() {
  return <MailContent />;
}
