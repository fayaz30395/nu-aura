'use client';

import React from 'react';
import {Badge, Card, CardContent} from '@/components/ui';
import {HrmsProject, ProjectStatus, ProjectType} from '@/lib/types/hrms/hrms-project';
import {formatCurrency} from '@/lib/utils';

interface OverviewTabProps {
  project: HrmsProject;
}

const STATUS_BADGE: Record<ProjectStatus, {
  label: string;
  variant: 'success' | 'warning' | 'secondary' | 'danger' | 'primary'
}> = {
  DRAFT: {label: 'Draft', variant: 'secondary'},
  PLANNED: {label: 'Planned', variant: 'secondary'},
  IN_PROGRESS: {label: 'In Progress', variant: 'primary'},
  ON_HOLD: {label: 'On Hold', variant: 'warning'},
  COMPLETED: {label: 'Completed', variant: 'success'},
  CANCELLED: {label: 'Cancelled', variant: 'danger'},
};

const TYPE_BADGE: Record<ProjectType, { label: string; variant: 'primary' | 'outline' }> = {
  CLIENT: {label: 'Client', variant: 'primary'},
  INTERNAL: {label: 'Internal', variant: 'outline'},
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', year: 'numeric'});
};


const getStatusBadge = (status?: ProjectStatus | null) => {
  if (status && STATUS_BADGE[status]) {
    return STATUS_BADGE[status];
  }
  return {label: status ?? 'Unknown', variant: 'secondary' as const};
};

const getTypeBadge = (type?: ProjectType | null) => {
  if (type && TYPE_BADGE[type]) {
    return TYPE_BADGE[type];
  }
  return {label: type ?? 'Unknown', variant: 'outline' as const};
};

export function OverviewTab({project}: OverviewTabProps) {
  if (!project) return null;

  const statusBadge = getStatusBadge(project.status);
  const typeBadge = getTypeBadge(project.type);

  return (
    <div className="space-y-6">
      {/* Key Info Grid */}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-caption">Project Manager</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {project.projectManagerName || '—'}
            </p>
          </div>
          <div>
            <p className="text-caption">Start Date</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {formatDate(project.startDate)}
            </p>
          </div>
          <div>
            <p className="text-caption">Expected End Date</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {formatDate(project.expectedEndDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Client & Budget */}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-caption">Client</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {project.clientName || '—'}
            </p>
          </div>
          <div>
            <p className="text-caption">Budget</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {formatCurrency(project.budget)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Status & Type */}
      <Card>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-caption">Status</p>
            <div className="mt-2">
              <Badge variant={statusBadge.variant} size="sm">
                {statusBadge.label}
              </Badge>
            </div>
          </div>
          <div>
            <p className="text-caption">Type</p>
            <div className="mt-2">
              <Badge variant={typeBadge.variant} size="sm">
                {typeBadge.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billable Badge */}
      <Card>
        <CardContent className="flex items-center gap-4">
          <div>
            <p className="text-caption">Billable</p>
            <div className="mt-2">
              {project.isBillable ? (
                <Badge variant="success" size="sm">
                  Yes
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm">
                  No
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      {project.description && (
        <Card>
          <CardContent className="space-y-2">
            <p className="text-caption">Description</p>
            <p className="text-body-secondary leading-relaxed">
              {project.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
