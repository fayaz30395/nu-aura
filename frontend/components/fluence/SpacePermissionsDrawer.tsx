'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Shield, Globe, Users, Lock, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUpdateWikiSpace } from '@/lib/hooks/queries/useFluence';
import { Button } from '@/components/ui/Button';
import { typography, input as dsInput, card } from '@/lib/design-system';
import type { WikiSpace, WikiVisibility } from '@/lib/types/platform/fluence';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const permissionsSchema = z.object({
  visibility: z.enum(['PUBLIC', 'ORGANIZATION', 'DEPARTMENT', 'PRIVATE', 'RESTRICTED']),
  description: z.string().optional(),
  icon: z.string().optional(),
});

type PermissionsFormValues = z.infer<typeof permissionsSchema>;

// ─── Visibility options ───────────────────────────────────────────────────────

interface VisibilityOption {
  value: WikiVisibility;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone in the organization can view',
    icon: Globe,
  },
  {
    value: 'ORGANIZATION',
    label: 'Organization',
    description: 'All employees can view',
    icon: Users,
  },
  {
    value: 'DEPARTMENT',
    label: 'Department',
    description: 'Only your department can view',
    icon: Users,
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you and invited members can view',
    icon: Lock,
  },
  {
    value: 'RESTRICTED',
    label: 'Restricted',
    description: 'Explicitly allowed users only',
    icon: Eye,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface SpacePermissionsDrawerProps {
  space: WikiSpace | null;
  opened: boolean;
  onClose: () => void;
}

export function SpacePermissionsDrawer({
  space,
  opened,
  onClose,
}: SpacePermissionsDrawerProps) {
  const { mutate: updateSpace, isPending } = useUpdateWikiSpace();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      visibility: 'ORGANIZATION',
      description: '',
      icon: '',
    },
  });

  const currentVisibility = watch('visibility');

  // Populate form when space changes
  useEffect(() => {
    if (space) {
      reset({
        visibility: space.visibility,
        description: space.description || '',
        icon: space.icon || '',
      });
    }
  }, [space, reset]);

  const onSubmit = (values: PermissionsFormValues) => {
    if (!space) return;

    updateSpace(
      {
        id: space.id,
        data: {
          visibility: values.visibility,
          description: values.description || undefined,
          icon: values.icon || undefined,
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Permissions updated',
            message: `Space visibility changed to ${values.visibility.toLowerCase()}.`,
            color: 'green',
          });
          onClose();
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to update space permissions. Please try again.',
            color: 'red',
          });
        },
      }
    );
  };

  const selectedVisibilityOption = VISIBILITY_OPTIONS.find(
    (opt) => opt.value === currentVisibility
  );

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--accent-700)]" />
          <span className={typography.cardTitle}>Space Permissions</span>
        </div>
      }
      position="right"
      size="md"
      styles={{
        header: { borderBottom: '1px solid var(--border-main)', paddingBottom: '1rem' },
        body: { padding: '1.5rem' },
      }}
    >
      {space && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Space info header */}
            <div className={`${card.base} p-4`}>
              <p className={typography.caption}>Editing permissions for</p>
              <p className={`${typography.cardTitle} mt-2`}>{space.name}</p>
              {space.ownerName && (
                <p className={`${typography.caption} mt-2`}>Owner: {space.ownerName}</p>
              )}
            </div>

            {/* Visibility selector */}
            <div>
              <label className={dsInput.label}>Visibility</label>
              <Select
                value={currentVisibility}
                onChange={(val) => val && setValue('visibility', val as WikiVisibility)}
                data={VISIBILITY_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                styles={{
                  input: {
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-main)',
                    color: 'var(--text-primary)',
                  },
                }}
              />
              {selectedVisibilityOption && (
                <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-secondary)]">
                  {(() => {
                    const Icon = selectedVisibilityOption.icon;
                    return <Icon className="h-4 w-4 text-[var(--text-muted)]" />;
                  })()}
                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedVisibilityOption.description}
                  </p>
                </div>
              )}
              {errors.visibility && (
                <p className={`${dsInput.error} ${dsInput.errorColor}`}>
                  {errors.visibility.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className={dsInput.label}>Description</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Describe this space..."
                className={`${dsInput.base} w-full resize-none`}
              />
              {errors.description && (
                <p className={`${dsInput.error} ${dsInput.errorColor}`}>
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Icon */}
            <div>
              <label className={dsInput.label}>Icon (emoji or symbol)</label>
              <input
                {...register('icon')}
                type="text"
                placeholder="e.g. 📚 or ⚡"
                maxLength={4}
                className={`${dsInput.base} w-32`}
              />
              {errors.icon && (
                <p className={`${dsInput.error} ${dsInput.errorColor}`}>
                  {errors.icon.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-2 border-t border-[var(--border-main)]">
              <Button
                type="submit"
                variant="primary"
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? 'Saving...' : 'Save Permissions'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </motion.div>
      )}
    </Drawer>
  );
}
