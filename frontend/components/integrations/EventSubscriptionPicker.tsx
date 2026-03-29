'use client';

import React from 'react';
import { MultiSelect } from '@mantine/core';
import { ConnectorCapabilities } from '@/lib/types/connector';

const AVAILABLE_EVENTS = [
  'employee.created',
  'employee.updated',
  'employee.deleted',
  'employee.onboarded',
  'employee.offboarded',
  'leave.requested',
  'leave.approved',
  'leave.rejected',
  'attendance.checked_in',
  'attendance.checked_out',
  'payroll.generated',
  'payroll.processed',
  'document.signed',
  'document.uploaded',
  'contract.created',
  'contract.terminated',
];

interface EventSubscriptionPickerProps {
  capabilities: ConnectorCapabilities;
  selectedEvents: string[];
  onChange: (events: string[]) => void;
  disabled?: boolean;
}

export function EventSubscriptionPicker({
  capabilities,
  selectedEvents,
  onChange,
  disabled,
}: EventSubscriptionPickerProps) {
  // Filter available events to only those supported by this connector
  const supportedEvents = AVAILABLE_EVENTS.filter((event) =>
    capabilities.supportedEvents.some((supported) =>
      event.startsWith(supported.toLowerCase().replace(/\*/g, ''))
    )
  );

  if (supportedEvents.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
        <p className="text-sm text-warning-700 dark:text-warning-300">
          No events available for this connector.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        Subscribe to Events
      </label>
      <MultiSelect
        label="Select events to receive"
        placeholder="Choose events..."
        data={supportedEvents.map((event) => ({
          value: event,
          label: event.charAt(0).toUpperCase() + event.slice(1).replace('.', ' - '),
        }))}
        value={selectedEvents}
        onChange={onChange}
        disabled={disabled}
        searchable
        clearable
        maxDropdownHeight={200}
        styles={{
          input: {
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-main)',
            color: 'var(--text-primary)',
          },
          label: {
            color: 'var(--text-primary)',
          },
        }}
      />
      <p className="text-xs text-[var(--text-secondary)] mt-2">
        {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
