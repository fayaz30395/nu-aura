'use client';

import {useState} from 'react';
import {DateInput} from '@mantine/dates';

const COMPLETE_ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface CycleDateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Typeable YYYY-MM-DD date input whose calendar closes once a date is chosen.
 * Mantine's DateInput keeps the calendar open while typing, which left it
 * covering the dialog's submit button after the last field was filled.
 */
export function CycleDateField({id, label, value, onChange, error}: CycleDateFieldProps) {
  const [opened, setOpened] = useState(false);

  return (
    <DateInput
      id={id}
      label={label}
      value={value || null}
      onChange={(d) => onChange(d ?? '')}
      valueFormat="YYYY-MM-DD"
      placeholder="YYYY-MM-DD"
      clearable
      error={error}
      popoverProps={{opened}}
      onFocus={() => setOpened(true)}
      onClick={() => setOpened(true)}
      onBlur={() => setOpened(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Enter' || event.key === 'Tab') setOpened(false);
      }}
      onInput={(event) => setOpened(!COMPLETE_ISO_DATE.test(event.currentTarget.value.trim()))}
      getDayProps={() => ({onClick: () => setOpened(false)})}
    />
  );
}
