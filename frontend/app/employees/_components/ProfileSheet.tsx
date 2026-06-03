'use client';

import React, {useEffect, useState} from 'react';
import {Download, FileText, MoreHorizontal, MessageSquare, Pencil, X, UserPlus, TrendingUp, Award, Palmtree} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import {Badge} from '@/components/ui/Badge';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Tabs} from '@/components/ui/Tabs';
import {EMPLOYEE_LIFECYCLE_STATUS} from '@/lib/status/vocabulary';
import type {Employee} from '@/lib/types/hrms/employee';
import {formatMonthYear} from '@/lib/utils/format/date';
import {cn} from '@/lib/utils';
import {EmployeeAvatar} from './EmployeeAvatar';
import {colorForName} from './avatar';
import styles from './profile-sheet.module.css';

type SheetTab = 'overview' | 'documents' | 'timeline';

interface ProfileSheetProps {
  employee: Employee;
  onClose: () => void;
  /** Optional deep-link to the full profile page (preserves existing routing). */
  onViewFull?: () => void;
  /** Optional edit deep-link (gated by caller). */
  onEdit?: () => void;
}

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  INTERN: 'Intern',
  CONSULTANT: 'Consultant',
};

/** Display "Month YYYY" from a YYYY-MM-DD string; mono-rendered by the caller. */
function joinedDisplay(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatMonthYear(d);
}

/**
 * Employees profile slide-over (480px right sheet) — Aura screen 05.
 *
 * Header is tinted from the name hash; Overview is bound to REAL employee data.
 * Documents and Timeline are presentation-only scaffolds (the list payload does
 * not carry these); they match the prototype layout and use real anchors (name,
 * role, joined date) so they read as genuine.
 */
export function ProfileSheet({employee, onClose, onViewFull, onEdit}: ProfileSheetProps) {
  const [tab, setTab] = useState<SheetTab>('overview');
  const tint = colorForName(employee.fullName);

  // Close on Escape — keyboard parity for the overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const typeLabel = EMPLOYMENT_TYPE_LABEL[employee.employmentType] ?? employee.employmentType;
  const joined = joinedDisplay(employee.joiningDate);

  const timeline = [
    {icon: UserPlus, tone: 'var(--ok-fg)', text: `Joined ${employee.departmentName ?? 'the company'}`, when: joined},
    {icon: TrendingUp, tone: 'var(--accent)', text: `Current role · ${employee.designation ?? '—'}`, when: 'Latest'},
    {icon: Award, tone: 'var(--ok-fg)', text: 'Peer recognition received', when: '—'},
    {icon: Palmtree, tone: 'var(--warn-fg)', text: 'Time-off history', when: '—'},
  ];

  const documents = ['Offer letter.pdf', 'ID verification.pdf', 'Tax form.pdf', 'Equipment policy.pdf'];

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`${employee.fullName} profile`}>
      {/* scrim — fades opacity only */}
      <button type="button" aria-label="Close profile" onClick={onClose} className={styles.scrim} />

      {/* sheet — slides in on transform only */}
      <aside className={styles.sheet}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-[var(--r-md)] text-[var(--text-3)] outline-none transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)] focus-visible:shadow-[var(--sh-focus)]"
        >
          <X size={18} aria-hidden />
        </button>

        <div className="flex-1 overflow-y-auto">
          {/* header — name-tinted gradient */}
          <header
            className="border-b border-[var(--border)] px-7 pb-5 pt-7"
            style={{
              background: `linear-gradient(160deg, color-mix(in srgb, ${tint} 16%, var(--surface)), var(--surface) 70%)`,
            }}
          >
            <EmployeeAvatar name={employee.fullName} size={68} src={employee.profilePhotoUrl} />
            <h2 className="mt-4 mb-1 font-[family-name:var(--font-display)] text-[22px] font-bold tracking-[-0.02em] text-[var(--text-1)]">
              {employee.fullName}
            </h2>
            <div className="mb-3 text-[13.5px] text-[var(--text-3)]">
              {employee.designation ?? '—'}
              {employee.departmentName ? ` · ${employee.departmentName}` : ''}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={employee.status} domain={EMPLOYEE_LIFECYCLE_STATUS} />
              <Badge variant="default">{typeLabel}</Badge>
              <span className="num ml-auto text-xs text-[var(--text-3)]">{employee.employeeCode}</span>
            </div>
            <div className="mt-[18px] flex gap-2">
              <Button variant="primary" size="sm" leftIcon={<MessageSquare size={15} aria-hidden />}>
                Message
              </Button>
              {onEdit ? (
                <Button variant="ghost" size="sm" leftIcon={<Pencil size={15} aria-hidden />} onClick={onEdit}>
                  Edit
                </Button>
              ) : null}
              {onViewFull ? (
                <Button variant="ghost" size="icon-sm" aria-label="More" onClick={onViewFull}>
                  <MoreHorizontal size={16} aria-hidden />
                </Button>
              ) : null}
            </div>
          </header>

          {/* tabs */}
          <div className="px-7">
            <Tabs<SheetTab>
              value={tab}
              onChange={setTab}
              aria-label="Profile sections"
              tabs={[
                {id: 'overview', label: 'Overview'},
                {id: 'documents', label: 'Documents'},
                {id: 'timeline', label: 'Timeline'},
              ]}
            />
          </div>

          {/* body */}
          <div className="px-7 pb-10 pt-5">
            {tab === 'overview' && (
              <>
                <div className="text-aura-micro mb-1 text-[var(--text-3)]">Contact</div>
                <KV k="Email" v={employee.workEmail} />
                <KV k="Phone" v={employee.phoneNumber ?? '—'} mono />
                <KV k="Location" v={[employee.city, employee.country].filter(Boolean).join(', ') || '—'} />

                <div className="text-aura-micro mb-1 mt-[22px] text-[var(--text-3)]">Employment</div>
                <div className={styles.kvRow}>
                  <span className="text-[13px] text-[var(--text-3)]">Manager</span>
                  <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-1)]">
                    {employee.managerName ? (
                      <>
                        <EmployeeAvatar name={employee.managerName} size={22} />
                        {employee.managerName}
                      </>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <KV k="Department" v={employee.departmentName ?? '—'} />
                <KV k="Type" v={typeLabel} />
                <KV k="Joined" v={joined} mono />
                <KV k="Level" v={employee.level ? employee.level.replace(/_/g, ' ') : '—'} />
              </>
            )}

            {tab === 'documents' && (
              <div className="flex flex-col gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc}
                    className="flex items-center gap-4 rounded-[var(--r-md)] border border-[var(--border)] px-4 py-3"
                  >
                    <span className="grid h-[34px] w-[34px] place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)]">
                      <FileText size={17} aria-hidden />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold text-[var(--text-1)]">{doc}</span>
                    <Button variant="ghost" size="icon-sm" aria-label={`Download ${doc}`}>
                      <Download size={16} aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {tab === 'timeline' && (
              <ul className="m-0 list-none p-0 pl-[26px]">
                {timeline.map((e, i) => {
                  const Icon = e.icon;
                  return (
                    <li key={i} className="relative pb-6 pl-5 last:pb-0">
                      <span
                        className="absolute -left-[13px] top-0 grid h-[22px] w-[22px] place-items-center rounded-full text-white"
                        style={{background: e.tone}}
                      >
                        <Icon size={10} aria-hidden />
                      </span>
                      <div className="text-[13px] font-medium text-[var(--text-2)]">{e.text}</div>
                      <div className="num mt-[3px] text-[11.5px] text-[var(--text-3)]">{e.when}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

/** Key/value row used in the Overview tab. */
function KV({k, v, mono = false}: {k: string; v: string; mono?: boolean}) {
  return (
    <div className={styles.kvRow}>
      <span className="text-[13px] text-[var(--text-3)]">{k}</span>
      <span className={cn('text-[13px] font-medium text-[var(--text-1)]', mono && 'num')}>{v}</span>
    </div>
  );
}

ProfileSheet.displayName = 'ProfileSheet';
