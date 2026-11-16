'use client';

import {useEffect, useState} from 'react';
import {NumberInput} from '@mantine/core';

interface KeyResultProgressInputProps {
  title: string;
  value: number;
  min: number;
  max: number;
  disabled?: boolean;
  /** Resolves false when the save failed, so the draft reverts to the saved value. */
  onCommit: (value: number) => Promise<boolean>;
}

/** Keeps edits local and saves only on blur or Enter, never per keystroke. */
export function KeyResultProgressInput({title, value, min, max, disabled, onCommit}: KeyResultProgressInputProps) {
  const [draft, setDraft] = useState<number | string>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = async () => {
    const next = typeof draft === 'number' ? draft : parseFloat(draft);
    if (!Number.isFinite(next)) {
      setDraft(value);
      return;
    }
    if (next === value) return;
    const saved = await onCommit(next);
    if (!saved) setDraft(value);
  };

  return (
    <NumberInput
      aria-label={`Current value for ${title}`}
      size="sm"
      w={96}
      min={min}
      max={max}
      value={draft}
      onChange={setDraft}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          void commit();
        }
      }}
      disabled={disabled}
      hideControls
    />
  );
}
