'use client';

import React from 'react';
import {MultiSelect} from '@mantine/core';
import {ConnectorCapabilities} from '@/lib/types/core/connector';

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
      <div
        className="p-4 rounded-[var(--r-md)] bg-[var(--warn-bg)] border border-[var(--warn-bd)]"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-[var(--warn-fg)]">
          No events available for this connector.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <span className="block text-sm font-medium text-[var(--text-1)]">
        Subscribe to Events
      </span>
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
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
            color: 'var(--text-1)',
          },
          label: {
            color: 'var(--text-1)',
          },
        }}
      />
      <p className="text-xs text-[var(--text-3)] mt-2 num">
        {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}
