'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { usePermissions, Permissions } from '@/lib/hooks/usePermissions';
import { AppLayout } from '@/components/layout';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@mantine/core';
import dynamic from 'next/dynamic';
import { useGoogleLogin } from '@react-oauth/google';
import { getGoogleToken, saveGoogleToken, clearGoogleToken } from '@/lib/utils/googleToken';
import { employeeService } from '@/lib/services/hrms/employee.service';
import { Employee } from '@/lib/types/hrms/employee';
import { createLogger } from '@/lib/utils/logger';

import {
  MailSidebar,
  EmailList,
  EmailViewer,
  OAuthPanel,
  EmailMessage,
  EmailLabel,
  ComposeEmail,
  EmailContact,
  SendAsAddress,
  EmailAttachment,
} from './_components';

// Dynamic import — ComposeModal is a rich editor only needed when the user opens compose
const ComposeModal = dynamic(
  () => import('./_components/ComposeModal').then((m) => ({ default: m.ComposeModal })),
  { loading: () => <Skeleton height={500} radius="md" />, ssr: false }
);

const log = createLogger('NuMailPage');

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
  const { hasAnyPermission, isReady } = usePermissions();

  const hasAccess = hasAnyPermission(Permissions.EMAIL_VIEW, Permissions.EMAIL_SEND);
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
      log.error('Google login error:', errorResponse);
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
      log.error('Error loading contacts:', err);
    }
  }, []);

  // Load Gmail signature
  const loadSignature = async (token: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/settings/sendAs',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const primarySendAs = data.sendAs?.find((s: SendAsAddress) => s.isPrimary) || data.sendAs?.[0];
        if (primarySendAs?.signature) {
          let cleanedSignature = primarySendAs.signature;
          cleanedSignature = cleanedSignature.replace(/Â/g, '');
          cleanedSignature = cleanedSignature.replace(/(&nbsp;)+/g, ' ');
          setEmailSignatureHtml(cleanedSignature);
          const div = document.createElement('div');
          div.innerHTML = cleanedSignature;
          const plainTextSignature = div.textContent || div.innerText || '';
          setEmailSignature(plainTextSignature);
        }
      }
    } catch (err) {
      log.error('Error loading signature:', err);
    }
  };

  // Check for stored token on mount
  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!hasAccess) {
      router.replace('/me/dashboard');
      return;
    }

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
  }, [hasHydrated, isAuthenticated, isReady, hasAccess, router, loadContacts]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter contacts based on input
  const filterContacts = useCallback((value: string, field: 'to' | 'cc') => {
    setActiveField(field);

    const lastValue = value.split(',').pop()?.trim().toLowerCase() || '';

    if (lastValue.length < 1) {
      setShowSuggestions(false);
      return;
    }

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

    setFilteredContacts(filtered.slice(0, 8));
    setShowSuggestions(filtered.length > 0);
  }, [contacts]);

  // Handle contact selection
  const selectContact = (contact: EmailContact, field: 'to' | 'cc') => {
    const currentValue = field === 'to' ? composeEmail.to : composeEmail.cc;
    const parts = currentValue.split(',');
    parts.pop();
    parts.push(contact.email);

    const newValue = parts.filter(p => p.trim()).join(', ') + ', ';

    setComposeEmail({
      ...composeEmail,
      [field]: newValue,
    });

    setShowSuggestions(false);
  };

  const loadLabels = async (token: string) => {
    try {
      const response = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/labels',
        { headers: { Authorization: `Bearer ${token}` } }
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
      log.error('Error loading labels:', err);
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
      log.error('Error loading emails:', err);
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

      if (data.labelIds?.includes('UNREAD')) {
        await markAsRead(emailId);
      }
    } catch (err) {
      log.error('Error loading email content:', err);
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
          body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
        }
      );

      setEmails(emails.map(e =>
        e.id === emailId ? { ...e, isRead: true } : e
      ));

      if (unreadCount > 0) {
        setUnreadCount(unreadCount - 1);
      }
    } catch (err) {
      log.error('Error marking email as read:', err);
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

      setEmails(emails.map(e =>
        e.id === emailId ? { ...e, isStarred: !isStarred } : e
      ));

      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, isStarred: !isStarred });
      }
    } catch (err) {
      log.error('Error toggling star:', err);
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
          body: JSON.stringify({ removeLabelIds: ['INBOX'] }),
        }
      );

      setEmails(emails.filter(e => e.id !== emailId));
      setSelectedEmail(null);
    } catch (err) {
      log.error('Error archiving email:', err);
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
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      setEmails(emails.filter(e => e.id !== emailId));
      setSelectedEmail(null);
    } catch (err) {
      log.error('Error deleting email:', err);
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
      log.error('Error downloading attachment:', err);
      setError('Failed to download attachment');
    }
  };

  // Open compose modal
  const openCompose = (mode: 'new' | 'reply' | 'replyAll' | 'forward' = 'new') => {
    setComposeMode(mode);
    setSendError(null);
    setSendSuccess(false);
    setShowSuggestions(false);

    if (mode === 'new') {
      setComposeEmail({ to: '', cc: '', subject: '', body: '' });
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
        const allRecipients = [selectedEmail.fromEmail];
        if (selectedEmail.cc) {
          allRecipients.push(...selectedEmail.cc.split(',').map(e => e.trim()));
        }
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
      let htmlBody = composeEmail.body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

      htmlBody = `<div>${htmlBody}</div>`;

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

      setTimeout(() => {
        setShowCompose(false);
        setSendSuccess(false);
        if (selectedLabel === 'SENT' || composeEmail.threadId) {
          loadEmails(accessToken, selectedLabel);
        }
      }, 1500);
    } catch (err: unknown) {
      log.error('Error sending email:', err);
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

  const filteredEmails = emails.filter(email =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading && !accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-secondary)] dark:bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-200 border-t-accent-500 rounded-full animate-spin" />
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
        {/* Header + OAuth Panel */}
        <OAuthPanel
          isConnected={!!accessToken}
          unreadCount={unreadCount}
          error={error}
          onConnect={() => googleLogin()}
          onCompose={() => openCompose('new')}
          onRefresh={refreshEmails}
          onDisconnect={clearToken}
        />

        {accessToken && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Sidebar */}
            <MailSidebar
              labels={labels}
              selectedLabel={selectedLabel}
              unreadCount={unreadCount}
              onLabelSelect={handleLabelSelect}
              onCompose={() => openCompose('new')}
            />

            {/* Email List / Viewer */}
            <Card className="skeuo-card lg:col-span-3">
              {selectedEmail ? (
                <EmailViewer
                  email={selectedEmail}
                  isLoadingEmail={isLoadingEmail}
                  onBack={() => setSelectedEmail(null)}
                  onReply={() => openCompose('reply')}
                  onReplyAll={() => openCompose('replyAll')}
                  onForward={() => openCompose('forward')}
                  onArchive={archiveEmail}
                  onDelete={deleteEmail}
                  onToggleStar={toggleStar}
                  onDownloadAttachment={downloadAttachment}
                  formatFileSize={formatFileSize}
                />
              ) : (
                <EmailList
                  emails={filteredEmails}
                  searchQuery={searchQuery}
                  isLoading={isLoading}
                  selectedLabel={selectedLabel}
                  pageToken={pageToken}
                  prevPageTokens={prevPageTokens}
                  onSearchChange={setSearchQuery}
                  onEmailClick={loadEmailContent}
                  onToggleStar={toggleStar}
                  onNextPage={handleNextPage}
                  onPrevPage={handlePrevPage}
                  formatDate={formatDate}
                />
              )}
            </Card>
          </div>
        )}

        {/* Compose Modal */}
        <ComposeModal
          opened={showCompose}
          composeMode={composeMode}
          composeEmail={composeEmail}
          isSending={isSending}
          sendError={sendError}
          sendSuccess={sendSuccess}
          emailSignatureHtml={emailSignatureHtml}
          emailSignature={emailSignature}
          filteredContacts={filteredContacts}
          showSuggestions={showSuggestions}
          activeField={activeField}
          onClose={() => setShowCompose(false)}
          onSend={sendEmail}
          onComposeChange={setComposeEmail}
          onFilterContacts={filterContacts}
          onSelectContact={selectContact}
        />
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
          color: var(--accent-primary);
          text-decoration: underline;
        }
        .email-content blockquote {
          border-left: 3px solid var(--border-subtle);
          padding-left: 1rem;
          margin-left: 0;
          color: var(--text-muted);
        }
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
          color: var(--accent-primary);
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
