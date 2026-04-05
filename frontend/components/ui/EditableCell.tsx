'use client';

import React, {useEffect, useRef, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {Loader2, Pencil} from 'lucide-react';
import {NumberInput, Select, TextInput} from '@mantine/core';
import {cn} from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EditableCellProps<T = string | number> {
  /** The current value to display */
  value: T;
  /** Field type: text, number, select, or date */
  type: 'text' | 'number' | 'select' | 'date';
  /** Options for select type */
  options?: Array<{ value: string; label: string }>;
  /** Callback to save the new value. Should throw on error */
  onSave: (newValue: T) => Promise<void>;
  /** Disable editing */
  disabled?: boolean;
  /** Placeholder text for empty inputs */
  placeholder?: string;
  /** Custom validation function. Return error message or null */
  validate?: (value: T) => string | null;
}

// ---------------------------------------------------------------------------
// EditableCell
// ---------------------------------------------------------------------------

function EditableCell<T = string | number>({
                                             value: initialValue,
                                             type,
                                             options,
                                             onSave,
                                             disabled = false,
                                             placeholder,
                                             validate,
                                           }: EditableCellProps<T>) {
  // -----------------------------------------------------------------------
  // State
  // -----------------------------------------------------------------------

  const [isEditing, setIsEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState<T>(initialValue);
  const [editValue, setEditValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
  >(null);

  // -----------------------------------------------------------------------
  // Sync display value when initialValue changes (parent update)
  // -----------------------------------------------------------------------

  useEffect(() => {
    setDisplayValue(initialValue);
    setEditValue(initialValue);
    setError(null);
  }, [initialValue]);

  // -----------------------------------------------------------------------
  // Auto-focus when entering edit mode
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // For text inputs, select all
      if (type === 'text' && 'select' in inputRef.current) {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSave = async () => {
    // Validate
    const validationError = validate ? validate(editValue) : null;
    if (validationError) {
      setError(validationError);
      return;
    }

    // Optimistic update
    setDisplayValue(editValue);
    setIsEditing(false);
    setError(null);
    setIsLoading(true);

    try {
      await onSave(editValue);
    } catch (err) {
      // Revert on error
      setDisplayValue(initialValue);
      setEditValue(initialValue);
      setIsEditing(true);
      setError(
        err instanceof Error ? err.message : 'Failed to save changes'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(initialValue);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  // -----------------------------------------------------------------------
  // Format display value
  // -----------------------------------------------------------------------

  const formatDisplayValue = (): string => {
    if (displayValue === null || displayValue === undefined) {
      return '';
    }
    if (type === 'date' && displayValue instanceof Date) {
      return displayValue.toLocaleDateString();
    }
    if (type === 'select' && options) {
      const option = options.find((o) => o.value === displayValue);
      return option ? option.label : String(displayValue);
    }
    return String(displayValue);
  };

  // -----------------------------------------------------------------------
  // Render display mode
  // -----------------------------------------------------------------------

  if (!isEditing) {
    return (
      <div
        className="group flex items-center gap-2 cursor-pointer px-4 py-2 rounded-md"
        onClick={() => !disabled && setIsEditing(true)}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsEditing(true);
          }
        }}
        aria-label={`Click to edit: ${formatDisplayValue()}`}
      >
        <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
          {formatDisplayValue() || (
            <span className="text-[var(--text-muted)]">{placeholder}</span>
          )}
        </span>

        {/* Pencil icon - subtle, appears on hover */}
        {!disabled && (
          <motion.div
            initial={{opacity: 0, scale: 0.8}}
            whileHover={{opacity: 1, scale: 1}}
            transition={{duration: 0.15}}
            className="hidden group-hover:flex items-center justify-center"
          >
            <Pencil
              className="h-3.5 w-3.5 text-[var(--text-muted)]"
              aria-hidden="true"
            />
          </motion.div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render edit mode
  // -----------------------------------------------------------------------

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="edit-mode"
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
        transition={{duration: 0.1}}
        className="flex items-center gap-2"
      >
        {/* Input field */}
        <div className="flex-1 relative">
          {type === 'text' && (
            <TextInput
              ref={inputRef as React.Ref<HTMLInputElement>}
              value={String(editValue)}
              onChange={(e) => setEditValue(e.target.value as T)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              autoFocus
              className={cn(error && 'border-danger-500')}
              classNames={{
                input: cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'border border-[var(--border-main)]',
                  'bg-[var(--bg-surface)]',
                  'text-[var(--text-primary)]',
                  'focus:border-accent-700 focus:ring-1 focus:ring-accent-700',
                  error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                ),
              }}
              style={{
                height: '32px',
              }}
            />
          )}

          {type === 'number' && (
            <NumberInput
              ref={inputRef as React.Ref<HTMLInputElement>}
              value={Number(editValue)}
              onChange={(val) => setEditValue(val as T)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              autoFocus
              classNames={{
                input: cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'border border-[var(--border-main)]',
                  'bg-[var(--bg-surface)]',
                  'text-[var(--text-primary)]',
                  'focus:border-accent-700 focus:ring-1 focus:ring-accent-700',
                  error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                ),
              }}
              style={{
                height: '32px',
              }}
            />
          )}

          {type === 'select' && options && (
            <Select
              ref={inputRef as React.Ref<HTMLInputElement>}
              value={String(editValue)}
              onChange={(val) => setEditValue((val || '') as T)}
              onKeyDown={handleKeyDown}
              data={options}
              placeholder={placeholder}
              disabled={isLoading}
              searchable
              autoFocus
              classNames={{
                input: cn(
                  'px-3 py-1.5 text-sm rounded-md',
                  'border border-[var(--border-main)]',
                  'bg-[var(--bg-surface)]',
                  'text-[var(--text-primary)]',
                  'focus:border-accent-700 focus:ring-1 focus:ring-accent-700',
                  error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
                ),
              }}
              style={{
                height: '32px',
              }}
            />
          )}

          {type === 'date' && (
            <input
              ref={inputRef as React.Ref<HTMLInputElement>}
              type="date"
              value={
                editValue instanceof Date
                  ? editValue.toISOString().split('T')[0]
                  : String(editValue)
              }
              onChange={(e) => setEditValue(e.target.value as T)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              autoFocus
              className={cn(
                'px-3 py-1.5 text-sm rounded-md',
                'border border-[var(--border-main)]',
                'bg-[var(--bg-surface)]',
                'text-[var(--text-primary)]',
                'focus:border-accent-700 focus:ring-1 focus:ring-accent-700',
                'w-full',
                error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500'
              )}
              style={{
                height: '32px',
              }}
            />
          )}

          {/* Error message */}
          {error && (
            <motion.div
              initial={{opacity: 0, y: -4}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -4}}
              className="absolute top-full left-0 mt-1 text-xs text-danger-600 whitespace-nowrap"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Save button */}
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className={cn(
              'p-1.5 rounded-md transition-colors cursor-pointer',
              'flex items-center justify-center',
              'min-h-[32px] min-w-[32px]',
              isLoading
                ? 'text-[var(--text-muted)] cursor-not-allowed opacity-50'
                : 'text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20'
            )}
            aria-label="Save changes"
            initial={{scale: 0.8, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            transition={{delay: 0.05}}
            whileHover={{scale: 1.1}}
            whileTap={{scale: 0.95}}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin"/>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            )}
          </motion.button>

          {/* Cancel button */}
          <motion.button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className={cn(
              'p-1.5 rounded-md transition-colors cursor-pointer',
              'flex items-center justify-center',
              'min-h-[32px] min-w-[32px]',
              isLoading
                ? 'cursor-not-allowed opacity-50'
                : 'text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20'
            )}
            aria-label="Cancel editing"
            initial={{scale: 0.8, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            transition={{delay: 0.1}}
            whileHover={{scale: 1.1}}
            whileTap={{scale: 0.95}}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export {EditableCell};
export type {EditableCellProps};
