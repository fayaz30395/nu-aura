'use client';

import Image from 'next/image';
import {Clock, ExternalLink, HardDrive, Loader2, Mail, MapPin, Users as UsersIcon, Video} from 'lucide-react';
import {format} from 'date-fns';
import {Modal, ModalBody, ModalFooter, ModalHeader} from '@/components/ui/Modal';
import {Button} from '@/components/ui/Button';
import {sanitizeEmailHtml} from '@/lib/utils/sanitize';
import {safeWindowOpen} from '@/lib/utils/url';
import type {GoogleNotification} from '../_types';
import {formatRelativeTime, getPreviewUrl} from '../_utils';

interface DashboardModalsProps {
  selectedEvent: GoogleNotification | null;
  selectedEmail: GoogleNotification | null;
  selectedFile: GoogleNotification | null;
  emailContent: string;
  emailLoading: boolean;
  onCloseEvent: () => void;
  onCloseEmail: () => void;
  onCloseFile: () => void;
  onOpenMail: () => void;
  onOpenDrive: () => void;
}

/**
 * The dashboard's three Google preview modals (Calendar event · Email · Drive file),
 * extracted verbatim from `page.tsx` to shrink the operator page. Pure presentation —
 * driven entirely by the `selected*` props + close/open callbacks; no data fetching,
 * no query, no state of its own. Render output is identical to the inline version.
 */
export function DashboardModals({
  selectedEvent,
  selectedEmail,
  selectedFile,
  emailContent,
  emailLoading,
  onCloseEvent,
  onCloseEmail,
  onCloseFile,
  onOpenMail,
  onOpenDrive,
}: DashboardModalsProps) {
  return (
    <>
      {/* Calendar Event Modal */}
      {selectedEvent && selectedEvent.calendarEvent && (
        <Modal isOpen={!!(selectedEvent && selectedEvent.calendarEvent)} onClose={onCloseEvent} size="md">
          <ModalHeader onClose={onCloseEvent}>Event Details</ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                {selectedEvent.calendarEvent.summary}
              </h3>
              {selectedEvent.calendarEvent.organizer && (
                <p className="text-body-secondary mt-1">
                  Organized
                  by {selectedEvent.calendarEvent.organizer.displayName || selectedEvent.calendarEvent.organizer.email}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4 text-[var(--text-secondary)]">
              <Clock className="h-5 w-5 flex-shrink-0"/>
              <div>
                <p className="font-medium">
                  {selectedEvent.calendarEvent.start.dateTime
                    ? format(new Date(selectedEvent.calendarEvent.start.dateTime), 'EEEE, MMMM d')
                    : format(new Date(selectedEvent.calendarEvent.start.date!), 'EEEE, MMMM d')}
                </p>
                {selectedEvent.calendarEvent.start.dateTime && (
                  <p className="text-sm">
                    {new Date(selectedEvent.calendarEvent.start.dateTime).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {selectedEvent.calendarEvent.end?.dateTime && (
                      <>
                        {' - '}
                        {new Date(selectedEvent.calendarEvent.end.dateTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {selectedEvent.calendarEvent.location && (
              <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                <MapPin className="h-5 w-5 flex-shrink-0"/>
                <p>{selectedEvent.calendarEvent.location}</p>
              </div>
            )}

            {selectedEvent.calendarEvent.hangoutLink && (
              <div className="flex items-center gap-4 text-[var(--accent-primary)]">
                <Video className="h-5 w-5 flex-shrink-0"/>
                <a
                  href={selectedEvent.calendarEvent.hangoutLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Google Meet video call
                </a>
              </div>
            )}

            {selectedEvent.calendarEvent.attendees && selectedEvent.calendarEvent.attendees.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <UsersIcon className="h-5 w-5 flex-shrink-0"/>
                  <span className="font-medium">{selectedEvent.calendarEvent.attendees.length} Attendees</span>
                </div>
                <div className="ml-7 space-y-1">
                  {selectedEvent.calendarEvent.attendees.slice(0, 5).map((attendee, idx) => (
                    <p key={idx} className="text-body-secondary">
                      {attendee.displayName || attendee.email}
                      {attendee.responseStatus && (
                        <span className={`ml-2 text-xs ${
                          attendee.responseStatus === 'accepted' ? 'text-[var(--status-success-text)]' :
                            attendee.responseStatus === 'declined' ? 'text-[var(--status-danger-text)]' :
                              'text-[var(--status-warning-text)]'
                        }`}>
                          ({attendee.responseStatus})
                        </span>
                      )}
                    </p>
                  ))}
                  {selectedEvent.calendarEvent.attendees.length > 5 && (
                    <p className="text-body-muted">
                      +{selectedEvent.calendarEvent.attendees.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {selectedEvent.calendarEvent.description && (
              <div className="pt-4 border-t border-[var(--border-main)]">
                <p className="text-body-secondary whitespace-pre-wrap">
                  {selectedEvent.calendarEvent.description}
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter className="gap-4">
            {selectedEvent.calendarEvent.hangoutLink && (
              <Button
                variant="primary"
                className="flex-1"
                leftIcon={<Video className="h-4 w-4"/>}
                onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.hangoutLink, '_blank')}
              >
                Join Meeting
              </Button>
            )}
            <Button
              variant="outline"
              className={selectedEvent.calendarEvent.hangoutLink ? '' : 'flex-1'}
              leftIcon={<ExternalLink className="h-4 w-4"/>}
              onClick={() => safeWindowOpen(selectedEvent.calendarEvent!.htmlLink, '_blank')}
            >
              Open in Calendar
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Email Preview Modal */}
      {selectedEmail && (
        <Modal isOpen={!!selectedEmail} onClose={onCloseEmail} size="lg">
          <ModalHeader onClose={onCloseEmail}>
            {selectedEmail.title}
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-aura-lg flex items-center justify-center bg-[var(--err-bg)] text-[var(--err-fg)]">
                <Mail className="h-5 w-5"/>
              </div>
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  {selectedEmail.emailData?.from?.split('<')[0]?.trim() || 'Unknown Sender'}
                </p>
                <p className="text-body-secondary">
                  {formatRelativeTime(selectedEmail.timestamp)}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border-main)] pt-4">
              {emailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--accent-primary)]"/>
                </div>
              ) : (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{__html: sanitizeEmailHtml(emailContent)}}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter className="gap-4">
            <Button
              variant="primary"
              className="flex-1"
              leftIcon={<ExternalLink className="h-4 w-4"/>}
              onClick={onOpenMail}
            >
              Open in NU-Mail
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Drive File Preview Modal */}
      {selectedFile && selectedFile.driveFile && (
        <Modal isOpen={!!(selectedFile && selectedFile.driveFile)} onClose={onCloseFile} size="xl">
          <ModalHeader onClose={onCloseFile}>
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 rounded-aura-lg flex items-center justify-center flex-shrink-0 bg-[var(--warn-bg)] text-[var(--warn-fg)]">
                <HardDrive className="h-5 w-5"/>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-[var(--text-primary)] truncate">
                  {selectedFile.driveFile.name}
                </h2>
                <p className="text-body-secondary">{selectedFile.subtitle}</p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="p-0">
            <div className="relative h-[60vh] bg-[var(--bg-elevated)]">
              {selectedFile.driveFile.mimeType?.startsWith('image/') ? (
                <Image
                  src={`https://drive.google.com/uc?id=${selectedFile.driveFile.id}`}
                  alt={selectedFile.driveFile.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-contain"
                />
              ) : (
                <iframe
                  src={getPreviewUrl(selectedFile.driveFile) || ''}
                  className="w-full h-full border-0"
                  title={selectedFile.driveFile.name}
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter className="gap-4">
            <Button
              variant="primary"
              className="flex-1"
              leftIcon={<ExternalLink className="h-4 w-4"/>}
              onClick={onOpenDrive}
            >
              Open in NU-Drive
            </Button>
            {selectedFile.driveFile.webViewLink && (
              <Button
                variant="outline"
                leftIcon={<ExternalLink className="h-4 w-4"/>}
                onClick={() => safeWindowOpen(selectedFile.driveFile!.webViewLink, '_blank')}
              >
                Open in Drive
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}

DashboardModals.displayName = 'DashboardModals';
