'use client';

import React, {useRef} from 'react';
import {AlertCircle, Loader2, Send, User, Users, X,} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Card} from '@/components/ui/Card';
import {sanitizeEmailHtml} from '@/lib/utils/sanitize';
import {ComposeEmail, EmailContact} from './types';

interface ComposeModalProps {
  opened: boolean;
  composeMode: 'new' | 'reply' | 'replyAll' | 'forward';
  composeEmail: ComposeEmail;
  isSending: boolean;
  sendError: string | null;
  sendSuccess: boolean;
  emailSignatureHtml: string;
  emailSignature: string;
  filteredContacts: EmailContact[];
  showSuggestions: boolean;
  activeField: 'to' | 'cc' | null;
  onClose: () => void;
  onSend: () => void;
  onComposeChange: (email: ComposeEmail) => void;
  onFilterContacts: (value: string, field: 'to' | 'cc') => void;
  onSelectContact: (contact: EmailContact, field: 'to' | 'cc') => void;
}

export const ComposeModal = React.memo(function ComposeModal({
                                                               opened,
                                                               composeMode,
                                                               composeEmail,
                                                               isSending,
                                                               sendError,
                                                               sendSuccess,
                                                               emailSignatureHtml,
                                                               emailSignature,
                                                               filteredContacts,
                                                               showSuggestions,
                                                               activeField,
                                                               onClose,
                                                               onSend,
                                                               onComposeChange,
                                                               onFilterContacts,
                                                               onSelectContact,
                                                             }: ComposeModalProps) {
  const toInputRef = useRef<HTMLInputElement>(null);
  const ccInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  if (!opened) return null;

  const modalTitle =
    composeMode === 'new' ? 'New Message' :
      composeMode === 'reply' ? 'Reply' :
        composeMode === 'replyAll' ? 'Reply All' : 'Forward';

  return (
    <div className="fixed inset-0 bg-[var(--bg-overlay)] flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="row-between p-4 border-b border-[var(--border-main)]">
          <h3 className="font-semibold text-[var(--text-primary)]">
            {modalTitle}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sendError && (
            <div className="flex items-center gap-2 p-4 bg-danger-50 text-danger-600 rounded-lg">
              <AlertCircle className="h-4 w-4"/>
              <span className="text-sm">{sendError}</span>
            </div>
          )}

          {sendSuccess && (
            <div className="flex items-center gap-2 p-4 bg-success-50 text-success-600 rounded-lg">
              <Send className="h-4 w-4"/>
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
                  onComposeChange({...composeEmail, to: e.target.value});
                  onFilterContacts(e.target.value, 'to');
                }}
                onFocus={() => onFilterContacts(composeEmail.to, 'to')}
                placeholder="Start typing to search employees..."
                className="pr-10"
              />
              <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
            </div>
            {showSuggestions && activeField === 'to' && filteredContacts.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] max-h-60 overflow-y-auto"
              >
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.email}
                    onClick={() => onSelectContact(contact, 'to')}
                    className="w-full px-4 py-2 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-4 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-accent-700"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {contact.name}
                      </p>
                      <p className="text-caption truncate">
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
                  onComposeChange({...composeEmail, cc: e.target.value});
                  onFilterContacts(e.target.value, 'cc');
                }}
                onFocus={() => onFilterContacts(composeEmail.cc, 'cc')}
                placeholder="Start typing to search employees..."
                className="pr-10"
              />
              <Users className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]"/>
            </div>
            {showSuggestions && activeField === 'cc' && filteredContacts.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg shadow-[var(--shadow-dropdown)] max-h-60 overflow-y-auto"
              >
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.email}
                    onClick={() => onSelectContact(contact, 'cc')}
                    className="w-full px-4 py-2 text-left hover:bg-[var(--bg-secondary)] flex items-center gap-4 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-accent-700"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {contact.name}
                      </p>
                      <p className="text-caption truncate">
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
              onChange={(e) => onComposeChange({...composeEmail, subject: e.target.value})}
              placeholder="Email subject"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Message
            </label>
            <textarea
              value={composeEmail.body}
              onChange={(e) => onComposeChange({...composeEmail, body: e.target.value})}
              placeholder="Write your message..."
              rows={8}
              className="w-full px-4 py-2 border border-[var(--border-main)] rounded-t-lg bg-[var(--bg-input)] text-[var(--text-primary)] placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
            />
            {/* Signature Preview */}
            {emailSignatureHtml && (
              <div className="border border-t-0 border-[var(--border-main)] rounded-b-lg bg-[var(--bg-secondary)] p-4">
                <p className="text-caption mb-2">-- Signature --</p>
                <div
                  className="signature-preview text-body-secondary"
                  dangerouslySetInnerHTML={{__html: sanitizeEmailHtml(emailSignatureHtml)}}
                />
              </div>
            )}
            {!emailSignatureHtml && emailSignature && (
              <p className="text-caption mt-1">
                Your Gmail signature will be added when sending.
              </p>
            )}
          </div>
        </div>

        <div className="row-between p-4 border-t border-[var(--border-main)] bg-[var(--bg-secondary)]">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Discard
          </Button>
          <Button
            variant="primary"
            onClick={onSend}
            disabled={isSending || !composeEmail.to || sendSuccess}
            leftIcon={isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </Card>
    </div>
  );
});
