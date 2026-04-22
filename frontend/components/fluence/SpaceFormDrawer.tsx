'use client';

import {useEffect} from 'react';
import {Drawer} from '@mantine/core';
import {Controller, useForm} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {motion} from 'framer-motion';
import {AlignLeft, Eye, Palette, Plus, Save, Smile, Type,} from 'lucide-react';
import {Button} from '@/components/ui/Button';
import type {WikiSpace, WikiVisibility} from '@/lib/types/platform/fluence';

// ─── Validation Schema ──────────────────────────────────────────

const spaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(64, 'Name must be under 64 characters'),
  description: z
    .string()
    .max(256, 'Description must be under 256 characters')
    .optional()
    .or(z.literal('')),
  icon: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  visibility: z.enum(['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED']),
});

type SpaceFormData = z.infer<typeof spaceSchema>;

// ─── Props ──────────────────────────────────────────────────────

export type SpaceFormValues = SpaceFormData;

interface SpaceFormDrawerProps {
  opened: boolean;
  onClose: () => void;
  onSubmit: (data: SpaceFormData) => void;
  editingSpace?: WikiSpace | null;
  isSubmitting?: boolean;
}

// ─── Preset Colors ──────────────────────────────────────────────

const PRESET_COLORS = [
  {value: '#3e63dd', label: 'Indigo'},
  {value: '#e5484d', label: 'Red'},
  {value: '#46a758', label: 'Green'},
  {value: '#f76b15', label: 'Orange'},
  {value: '#6e56cf', label: 'Violet'},
  {value: '#0091ff', label: 'Blue'},
  {value: '#d6409f', label: 'Pink'},
  {value: '#30a46c', label: 'Teal'},
];

// ─── Preset Icons (emojis) ──────────────────────────────────────

const PRESET_ICONS = [
  '📁', '⚙️', '🚀', '📋', '💡', '🎯', '📊', '🔒',
  '🏗️', '📝', '🧪', '🎨', '📐', '🔧', '🌐', '📦',
];

// ─── Visibility Options ─────────────────────────────────────────

const VISIBILITY_OPTIONS: { value: WikiVisibility; label: string; description: string }[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Visible to everyone, including external users',
  },
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    description: 'All employees in the organization',
  },
  {
    value: 'DEPARTMENT',
    label: 'Department',
    description: 'Only members of specific departments',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you and invited collaborators',
  },
];

// ─── Component ──────────────────────────────────────────────────

export function SpaceFormDrawer({
                                  opened,
                                  onClose,
                                  onSubmit,
                                  editingSpace,
                                  isSubmitting = false,
                                }: SpaceFormDrawerProps) {
  const isEdit = !!editingSpace;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: {errors},
  } = useForm<SpaceFormData>({
    resolver: zodResolver(spaceSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '📁',
      color: '#3e63dd',
      visibility: 'ORGANIZATION',
    },
  });

  // Reset form when drawer opens / editing changes
  useEffect(() => {
    if (opened) {
      if (editingSpace) {
        reset({
          name: editingSpace.name,
          description: editingSpace.description || '',
          icon: editingSpace.icon || '📁',
          color: editingSpace.color || '#3e63dd',
          visibility: editingSpace.visibility,
        });
      } else {
        reset({
          name: '',
          description: '',
          icon: '📁',
          color: '#3e63dd',
          visibility: 'ORGANIZATION',
        });
      }
    }
  }, [opened, editingSpace, reset]);

  const selectedColor = watch('color');
  const selectedIcon = watch('icon');

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <div
            className='flex items-center justify-center w-8 h-8 rounded-lg text-inverse text-sm'
            style={{backgroundColor: selectedColor || '#3e63dd'}}
          >
            {selectedIcon || '📁'}
          </div>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {isEdit ? 'Edit Space' : 'Create Space'}
          </span>
        </div>
      }
      position="right"
      size="md"
      styles={{
        title: {width: '100%'},
        body: {padding: '0 24px 24px'},
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Name */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
            <Type className="h-4 w-4"/>
            Space Name <span className='text-status-danger-text'>*</span>
          </label>
          <input
            {...register('name')}
            placeholder="e.g., Engineering, Product, HR Operations"
            className="input-aura w-full"
            autoFocus
          />
          {errors.name && (
            <p className='text-xs text-status-danger-text mt-1'>{errors.name.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
            <AlignLeft className="h-4 w-4"/>
            Description
          </label>
          <textarea
            {...register('description')}
            placeholder="What is this space about?"
            rows={3}
            className="input-aura w-full resize-none"
          />
          {errors.description && (
            <p className='text-xs text-status-danger-text mt-1'>{errors.description.message}</p>
          )}
        </div>

        {/* Icon Picker */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
            <Smile className="h-4 w-4"/>
            Icon
          </label>
          <Controller
            name="icon"
            control={control}
            render={({field}) => (
              <div className="flex flex-wrap gap-2">
                {PRESET_ICONS.map((emoji) => (
                  <motion.button
                    key={emoji}
                    type="button"
                    whileHover={{scale: 1.15}}
                    whileTap={{scale: 0.9}}
                    onClick={() => field.onChange(emoji)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all duration-150 border cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                      field.value === emoji
                        ? 'border-[var(--accent-700)] bg-[var(--accent-700)]/10 ring-2 ring-[var(--accent-700)]/30'
                        : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            )}
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
            <Palette className="h-4 w-4"/>
            Color
          </label>
          <Controller
            name="color"
            control={control}
            render={({field}) => (
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <motion.button
                    key={c.value}
                    type="button"
                    whileHover={{scale: 1.15}}
                    whileTap={{scale: 0.9}}
                    onClick={() => field.onChange(c.value)}
                    className={`w-10 h-10 rounded-lg transition-all duration-150 border-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                      field.value === c.value
                        ? 'border-[var(--text-primary)] ring-2 ring-offset-2 ring-offset-[var(--bg-card)]'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: c.value,
                      ...(field.value === c.value
                        ? {ringColor: c.value}
                        : {}),
                    }}
                    title={c.label}
                    aria-label={`Select ${c.label} color`}
                  />
                ))}
              </div>
            )}
          />
        </div>

        {/* Visibility */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)] mb-2">
            <Eye className="h-4 w-4"/>
            Visibility <span className='text-status-danger-text'>*</span>
          </label>
          <Controller
            name="visibility"
            control={control}
            render={({field}) => (
              <div className="space-y-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileTap={{scale: 0.98}}
                    onClick={() => field.onChange(opt.value)}
                    className={`w-full text-left px-4 py-4 rounded-lg border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 ${
                      field.value === opt.value
                        ? 'border-[var(--accent-700)] bg-[var(--accent-700)]/5 ring-1 ring-[var(--accent-700)]/30'
                        : 'border-[var(--border-main)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {opt.label}
                    </p>
                    <p className="text-caption mt-0.5">
                      {opt.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            )}
          />
          {errors.visibility && (
            <p className='text-xs text-status-danger-text mt-1'>{errors.visibility.message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-main)]">
          <Button
            type="submit"
            variant="primary"
            className="flex-1 gap-2"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <RefreshIcon/>
            ) : isEdit ? (
              <Save className="h-4 w-4"/>
            ) : (
              <Plus className="h-4 w-4"/>
            )}
            {isSubmitting
              ? 'Saving...'
              : isEdit
                ? 'Save Changes'
                : 'Create Space'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function RefreshIcon() {
  return (
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
  );
}
