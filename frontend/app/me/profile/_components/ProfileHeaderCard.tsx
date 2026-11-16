'use client';

import {useState} from 'react';
import Image from 'next/image';
import {Briefcase, Building2, Mail} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {getInitials} from '@/lib/utils';

interface ProfileHeaderCardProps {
  displayName: string;
  designation?: string;
  photoUrl?: string;
  workEmail?: string;
  employeeCode?: string;
  departmentName?: string;
}

export function ProfileHeaderCard({
  displayName,
  designation,
  photoUrl,
  workEmail,
  employeeCode,
  departmentName,
}: ProfileHeaderCardProps) {
  const [photoLoadError, setPhotoLoadError] = useState(false);

  return (
    <Card padding="sm">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          {photoUrl && !photoLoadError ? (
            <Image
              src={photoUrl}
              alt={displayName}
              width={80}
              height={80}
              className="h-20 w-20 rounded-full border border-border bg-card object-cover"
              onError={() => setPhotoLoadError(true)}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-accent-subtle text-2xl font-bold text-accent">
              {getInitials(displayName)}
            </div>
          )}
          <span
            className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card bg-status-ok-fg"
            aria-hidden="true"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-text-1">{displayName}</h2>
          {designation && <p className="mt-1 text-sm text-text-2">{designation}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-text-2">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-text-3" aria-hidden="true"/>
              {workEmail}
            </span>
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-text-3" aria-hidden="true"/>
              {employeeCode}
            </span>
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-text-3" aria-hidden="true"/>
              {departmentName || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
