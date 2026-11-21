import React from 'react';
import {Card} from '@/components/ui/Card';
import {cn} from '@/lib/utils';

interface ProfileSectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function ProfileSection({icon, title, description, action, className, bodyClassName, children}: ProfileSectionProps) {
  return (
    <Card padding="sm" className={className}>
      <div className="mb-4 flex items-start justify-between gap-4 border-b border-border pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-1">
            <span className="text-accent" aria-hidden="true">{icon}</span>
            {title}
          </h2>
          <p className="mt-1 text-xs text-text-3">{description}</p>
        </div>
        {action}
      </div>
      <div className={cn('flex flex-col gap-4', bodyClassName)}>{children}</div>
    </Card>
  );
}

interface ProfileValueProps {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export function ProfileValue({label, value, mono}: ProfileValueProps) {
  return (
    <div>
      <span className="block text-xs font-medium uppercase tracking-wide text-text-3">{label}</span>
      <p className={cn('mt-1 text-sm font-medium text-text-1', mono && 'font-mono')}>{value}</p>
    </div>
  );
}
