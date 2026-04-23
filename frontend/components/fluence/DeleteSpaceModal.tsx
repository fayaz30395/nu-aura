'use client';

import {useState} from 'react';
import {Modal} from '@mantine/core';
import {AnimatePresence, motion} from 'framer-motion';
import {AlertTriangle, ArrowRight, CheckCircle2, FileText, Folder, Shield, Trash2,} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import type {WikiSpace} from '@/lib/types/platform/fluence';

// ─── Props ──────────────────────────────────────────────────────

interface DeleteSpaceModalProps {
  opened: boolean;
  onClose: () => void;
  space: WikiSpace | null;
  allSpaces: WikiSpace[];
  onConfirmDelete: (spaceId: string, migrateToSpaceId: string | null) => void;
  isDeleting?: boolean;
}

// ─── Steps ──────────────────────────────────────────────────────

type Step = 'warning' | 'migrate' | 'confirm';

// ─── Component ──────────────────────────────────────────────────

export function DeleteSpaceModal({
                                   opened,
                                   onClose,
                                   space,
                                   allSpaces,
                                   onConfirmDelete,
                                   isDeleting = false,
                                 }: DeleteSpaceModalProps) {
  const [step, setStep] = useState<Step>('warning');
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  // Reset state when modal opens
  const handleClose = () => {
    setStep('warning');
    setSelectedTargetId(null);
    setConfirmText('');
    onClose();
  };

  if (!space) return null;

  const otherSpaces = allSpaces.filter((s) => s.id !== space.id);
  const pageCount = space.pageCount || 0;
  const confirmMatches = confirmText.toLowerCase() === space.name.toLowerCase();

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <div className="flex items-center gap-2">
          <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-status-danger-bg'>
            <Trash2 className='h-4 w-4 text-status-danger-text'/>
          </div>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            Delete Space
          </span>
        </div>
      }
      size="lg"
      styles={{
        title: {width: '100%'},
      }}
    >
      <AnimatePresence mode="wait">
        {/* ─── Step 1: Warning ──────────────────────────────────── */}
        {step === 'warning' && (
          <motion.div
            key="warning"
            initial={{opacity: 0, x: -8}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: 8}}
            transition={{duration: 0.2}}
            className="space-y-6"
          >
            {/* Danger banner */}
            <div
              className='flex items-start gap-4 p-4 rounded-xl bg-status-danger-bg border border-status-danger-border'>
              <AlertTriangle className='h-6 w-6 text-status-danger-text flex-shrink-0 mt-0.5'/>
              <div>
                <p className='text-sm font-semibold text-status-danger-text mb-1'>
                  You are about to delete &ldquo;{space.name}&rdquo;
                </p>
                <p className='text-sm text-status-danger-text'>
                  This space contains <strong>{pageCount} page{pageCount !== 1 ? 's' : ''}</strong>.
                  All pages must be migrated to another space before deletion.
                  This action requires approval from the space owner.
                </p>
              </div>
            </div>

            {/* Space summary card */}
            <div className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className='flex items-center justify-center w-12 h-12 rounded-xl text-2xl text-inverse'
                  style={{backgroundColor: space.color || 'var(--accent-primary)'}}
                >
                  {space.icon || '📁'}
                </div>
                <div>
                  <p className="text-base font-semibold text-[var(--text-primary)]">
                    {space.name}
                  </p>
                  <p className="text-body-muted">
                    {space.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-2 rounded-lg bg-[var(--bg-card)]">
                  <FileText className="h-4 w-4 text-[var(--text-muted)] mx-auto mb-1"/>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{pageCount}</p>
                  <p className="text-caption">Pages</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--bg-card)]">
                  <Folder className="h-4 w-4 text-[var(--text-muted)] mx-auto mb-1"/>
                  <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                    {space.visibility.toLowerCase()}
                  </p>
                  <p className="text-caption">Visibility</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-[var(--bg-card)]">
                  <Shield className="h-4 w-4 text-[var(--text-muted)] mx-auto mb-1"/>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {space.ownerName || 'Unknown'}
                  </p>
                  <p className="text-caption">Owner</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {pageCount > 0 ? (
                <Button
                  variant="danger"
                  className="flex-1 gap-2"
                  onClick={() => setStep('migrate')}
                >
                  Migrate Pages & Delete
                  <ArrowRight className="h-4 w-4"/>
                </Button>
              ) : (
                <Button
                  variant="danger"
                  className="flex-1 gap-2"
                  onClick={() => setStep('confirm')}
                >
                  Continue to Delete
                  <ArrowRight className="h-4 w-4"/>
                </Button>
              )}
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 2: Migrate Docs ────────────────────────────── */}
        {step === 'migrate' && (
          <motion.div
            key="migrate"
            initial={{opacity: 0, x: 8}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -8}}
            transition={{duration: 0.2}}
            className="space-y-6"
          >
            <div
              className='flex items-start gap-4 p-4 rounded-xl bg-status-warning-bg border border-status-warning-border'>
              <ArrowRight className='h-5 w-5 text-status-warning-text flex-shrink-0 mt-0.5'/>
              <div>
                <p className='text-sm font-semibold text-status-warning-text mb-1'>
                  Where should the {pageCount} page{pageCount !== 1 ? 's' : ''} go?
                </p>
                <p className='text-sm text-status-warning-text'>
                  Select a destination space. All pages and their comments, likes, and
                  revision history will be preserved.
                </p>
              </div>
            </div>

            {/* Space selector */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {otherSpaces.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-8 w-8 text-[var(--text-muted)] mx-auto mb-2"/>
                  <p className="text-body-muted">
                    No other spaces available. Create a new space first.
                  </p>
                </div>
              ) : (
                otherSpaces.map((s) => (
                  <motion.button
                    key={s.id}
                    type="button"
                    whileTap={{scale: 0.98}}
                    onClick={() => setSelectedTargetId(s.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                      selectedTargetId === s.id
                        ? 'border-[var(--accent-700)] bg-[var(--accent-700)]/5 ring-1 ring-[var(--accent-700)]/30'
                        : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <div
                      className='flex items-center justify-center w-10 h-10 rounded-lg text-lg text-inverse flex-shrink-0'
                      style={{backgroundColor: s.color || 'var(--accent-primary)'}}
                    >
                      {s.icon || '📁'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {s.name}
                      </p>
                      <p className="text-caption truncate">
                        {s.pageCount || 0} pages · {s.visibility.toLowerCase()}
                      </p>
                    </div>
                    {selectedTargetId === s.id && (
                      <CheckCircle2 className="h-5 w-5 text-[var(--accent-700)] flex-shrink-0"/>
                    )}
                  </motion.button>
                ))
              )}
            </div>

            {/* Migration preview */}
            {selectedTargetId && (
              <motion.div
                initial={{opacity: 0, height: 0}}
                animate={{opacity: 1, height: 'auto'}}
                className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]"
              >
                <div
                  className='flex items-center justify-center w-8 h-8 rounded-lg text-sm text-inverse'
                  style={{backgroundColor: space.color || 'var(--accent-primary)'}}
                >
                  {space.icon || '📁'}
                </div>
                <div className="flex items-center gap-2 text-body-muted">
                  <span className="font-medium text-[var(--text-primary)]">
                    {pageCount} pages
                  </span>
                  <ArrowRight className="h-4 w-4"/>
                </div>
                <div
                  className='flex items-center justify-center w-8 h-8 rounded-lg text-sm text-inverse'
                  style={{
                    backgroundColor:
                      otherSpaces.find((s) => s.id === selectedTargetId)?.color || 'var(--accent-primary)',
                  }}
                >
                  {otherSpaces.find((s) => s.id === selectedTargetId)?.icon || '📁'}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {otherSpaces.find((s) => s.id === selectedTargetId)?.name}
                </span>
              </motion.div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="danger"
                className="flex-1 gap-2"
                onClick={() => setStep('confirm')}
                disabled={!selectedTargetId && otherSpaces.length > 0}
              >
                Continue
                <ArrowRight className="h-4 w-4"/>
              </Button>
              <Button variant="outline" onClick={() => setStep('warning')}>
                Back
              </Button>
            </div>
          </motion.div>
        )}

        {/* ─── Step 3: Final Confirm ───────────────────────────── */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{opacity: 0, x: 8}}
            animate={{opacity: 1, x: 0}}
            exit={{opacity: 0, x: -8}}
            transition={{duration: 0.2}}
            className="space-y-6"
          >
            {/* Approval notice */}
            <div
              className='flex items-start gap-4 p-4 rounded-xl bg-accent-subtle border border-[var(--accent-primary)]'>
              <Shield className='h-5 w-5 text-accent flex-shrink-0 mt-0.5'/>
              <div>
                <p className='text-sm font-semibold text-accent mb-1'>
                  Approval Required
                </p>
                <p className='text-sm text-accent'>
                  An approval request will be sent to <strong>{space.ownerName || 'the space owner'}</strong>.
                  The space will be marked for deletion and removed once approved.
                  {pageCount > 0 && selectedTargetId && (
                    <> All {pageCount} pages will be migrated before deletion.</>
                  )}
                </p>
              </div>
            </div>

            {/* Type to confirm */}
            <div>
              <label className="text-sm font-medium text-[var(--text-secondary)] mb-2 block">
                Type <strong className="text-[var(--text-primary)]">{space.name}</strong> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={space.name}
                className="input-aura w-full"
                autoFocus
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="danger"
                className="flex-1 gap-2"
                onClick={() => onConfirmDelete(space.id, selectedTargetId)}
                disabled={!confirmMatches || isDeleting}
              >
                {isDeleting ? (
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : (
                  <Trash2 className="h-4 w-4"/>
                )}
                {isDeleting ? 'Deleting...' : 'Delete Space'}
              </Button>
              <Button variant="outline" onClick={() => setStep('migrate')}>
                Back
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
