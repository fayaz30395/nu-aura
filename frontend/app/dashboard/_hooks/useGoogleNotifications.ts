'use client';

import {useCallback, useState} from 'react';
import {getGoogleToken} from '@/lib/utils/googleToken';
import {createLogger} from '@/lib/utils/logger';
import type {GoogleNotification} from '../_types';

const log = createLogger('DashboardPage');

interface EmailHeader {
  name: string;
  value: string;
}

/** Google Gmail / Drive / Calendar notifications plus the preview-modal selection state. */
export function useGoogleNotifications() {
  const [notifications, setNotifications] = useState<GoogleNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [hasGoogleToken, setHasGoogleToken] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<GoogleNotification | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<GoogleNotification | null>(null);
  const [selectedFile, setSelectedFile] = useState<GoogleNotification | null>(null);
  const [emailContent, setEmailContent] = useState<string>('');
  const [emailLoading, setEmailLoading] = useState(false);

  const loadGoogleNotifications = useCallback(async () => {
    const token = getGoogleToken();
    if (!token) {
      setHasGoogleToken(false);
      return;
    }

    setHasGoogleToken(true);
    setNotificationsLoading(true);

    const allNotifications: GoogleNotification[] = [];

    await Promise.all([
      (async () => {
    try {
      // Load unread emails from Gmail
      const emailResponse = await fetch(
        'https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread',
        {headers: {Authorization: `Bearer ${token}`}}
      );

      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.messages) {
          const emailDetails = await Promise.all(
            emailData.messages.slice(0, 3).map(async (msg: { id: string; threadId: string }) => {
              const detailResponse = await fetch(
                `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
                {headers: {Authorization: `Bearer ${token}`}}
              );
              if (!detailResponse.ok) return null;
              const detail = await detailResponse.json();
              const fromHeader = detail.payload?.headers?.find((h: EmailHeader) => h.name === 'From');
              const subjectHeader = detail.payload?.headers?.find((h: EmailHeader) => h.name === 'Subject');
              return {
                id: `email-${msg.id}`,
                type: 'email' as const,
                title: subjectHeader?.value || 'No Subject',
                subtitle: fromHeader?.value?.split('<')[0]?.trim() || 'Unknown Sender',
                timestamp: new Date(parseInt(detail.internalDate)),
                isUnread: true,
                emailData: {
                  id: msg.id,
                  threadId: msg.threadId,
                  from: fromHeader?.value || '',
                  subject: subjectHeader?.value || 'No Subject',
                  snippet: detail.snippet,
                },
              };
            })
          );
          for (const notif of emailDetails) {
            if (notif) allNotifications.push(notif);
          }
        }
      }
    } catch (err) {
      log.error('Error loading emails:', err);
    }
      })(),
      (async () => {
    try {
      // Load shared files from Drive (files shared with me, modified in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const driveResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=sharedWithMe=true and modifiedTime>'${sevenDaysAgo.toISOString()}'` +
        `&fields=files(id,name,mimeType,modifiedTime,sharingUser,webViewLink)` +
        `&orderBy=modifiedTime desc&pageSize=5`,
        {headers: {Authorization: `Bearer ${token}`}}
      );

      if (driveResponse.ok) {
        const driveData = await driveResponse.json();
        if (driveData.files) {
          for (const file of driveData.files.slice(0, 3)) {
            allNotifications.push({
              id: `drive-${file.id}`,
              type: 'drive',
              title: file.name,
              subtitle: file.sharingUser?.displayName
                ? `Shared by ${file.sharingUser.displayName}`
                : 'Shared with you',
              timestamp: new Date(file.modifiedTime),
              link: file.webViewLink,
              driveFile: {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                webViewLink: file.webViewLink,
              },
            });
          }
        }
      }
    } catch (err) {
      log.error('Error loading drive files:', err);
    }
      })(),
      (async () => {
    try {
      // Load upcoming calendar events (next 24 hours)
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const calendarResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${now.toISOString()}&timeMax=${tomorrow.toISOString()}` +
        `&singleEvents=true&orderBy=startTime&maxResults=5`,
        {headers: {Authorization: `Bearer ${token}`}}
      );

      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json();
        if (calendarData.items) {
          for (const event of calendarData.items.slice(0, 3)) {
            const startTime = event.start?.dateTime || event.start?.date;
            allNotifications.push({
              id: `calendar-${event.id}`,
              type: 'calendar',
              title: event.summary || 'Untitled Event',
              subtitle: startTime
                ? new Date(startTime).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})
                : 'All day',
              timestamp: startTime ? new Date(startTime) : new Date(),
              link: event.htmlLink,
              hasVideo: !!event.hangoutLink,
              calendarEvent: {
                id: event.id,
                summary: event.summary || 'Untitled Event',
                description: event.description,
                start: event.start,
                end: event.end,
                location: event.location,
                hangoutLink: event.hangoutLink,
                htmlLink: event.htmlLink,
                attendees: event.attendees,
                organizer: event.organizer,
              },
            });
          }
        }
      }
    } catch (err) {
      log.error('Error loading calendar events:', err);
    }
      })(),
    ]);

    allNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setNotifications(allNotifications.slice(0, 8));
    setNotificationsLoading(false);
  }, []);

  const loadEmailContent = async (messageId: string) => {
    const token = getGoogleToken();
    if (!token) return;

    setEmailLoading(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {headers: {Authorization: `Bearer ${token}`}}
      );
      if (response.ok) {
        const data = await response.json();
        // Try to get HTML or plain text content
        let content = '';
        const parts = data.payload?.parts || [data.payload];
        for (const part of parts) {
          if (part.mimeType === 'text/html' || part.mimeType === 'text/plain') {
            const body = part.body?.data;
            if (body) {
              content = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
              break;
            }
          }
        }
        setEmailContent(content || data.snippet || 'No content available');
      }
    } catch (err) {
      log.error('Error loading email content:', err);
      setEmailContent('Failed to load email content');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleNotificationClick = (notification: GoogleNotification) => {
    if (notification.type === 'email') {
      setSelectedEmail(notification);
      if (notification.emailData?.id) {
        loadEmailContent(notification.emailData.id);
      }
    } else if (notification.type === 'drive') {
      setSelectedFile(notification);
    } else if (notification.type === 'calendar') {
      setSelectedEvent(notification);
    }
  };

  return {
    notifications,
    notificationsLoading,
    hasGoogleToken,
    loadGoogleNotifications,
    handleNotificationClick,
    selectedEvent,
    selectedEmail,
    selectedFile,
    emailContent,
    emailLoading,
    closeEvent: () => setSelectedEvent(null),
    closeEmail: () => {
      setSelectedEmail(null);
      setEmailContent('');
    },
    closeFile: () => setSelectedFile(null),
  };
}
