'use client';

import {useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Drawer, Select} from '@mantine/core';
import {notifications} from '@mantine/notifications';
import {
  Shield,
  Globe,
  Users,
  Lock,
  Eye,
  UserPlus,
  X,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {motion} from 'framer-motion';
import {
  useUpdateWikiSpace,
  useSpaceMembers,
  useAddSpaceMemberMutation,
  useUpdateSpaceMemberRoleMutation,
  useRemoveSpaceMemberMutation,
} from '@/lib/hooks/queries/useFluence';
import {Button} from '@/components/ui/Button';
import {EmployeeSearchAutocomplete} from '@/components/ui/EmployeeSearchAutocomplete';
import {typography, input as dsInput, card} from '@/lib/design-system';
import {getInitials} from '@/lib/utils';
import type {WikiSpace, WikiVisibility, SpaceMemberRole, SpaceMember} from '@/lib/types/platform/fluence';

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

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: SpaceMemberRole; label: string }[] = [
  {value: 'ADMIN', label: 'Admin'},
  {value: 'EDITOR', label: 'Editor'},
  {value: 'VIEWER', label: 'Viewer'},
];

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type DrawerTab = 'visibility' | 'members';

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
  const [activeTab, setActiveTab] = useState<DrawerTab>('visibility');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: string; name: string } | null>(null);
  const [newMemberRole, setNewMemberRole] = useState<SpaceMemberRole>('VIEWER');

  const {mutate: updateSpace, isPending} = useUpdateWikiSpace();

  // ─── Member queries & mutations ──────────────────────────────────────────
  const {data: members = [], isLoading: membersLoading} = useSpaceMembers(
    space?.id ?? '',
    opened && !!space?.id
  );
  const {mutate: addMember, isPending: isAdding} = useAddSpaceMemberMutation();
  const {mutate: updateRole, isPending: isUpdatingRole} = useUpdateSpaceMemberRoleMutation();
  const {mutate: removeMember} = useRemoveSpaceMemberMutation();

  const existingMemberUserIds = members.map((m) => m.userId);

  // ─── Permissions form ────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: {errors},
  } = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsSchema),
    defaultValues: {
      visibility: 'ORGANIZATION',
      description: '',
      icon: '',
    },
  });

  const currentVisibility = watch('visibility');

  useEffect(() => {
    if (space) {
      reset({
        visibility: space.visibility,
        description: space.description || '',
        icon: space.icon || '',
      });
    }
  }, [space, reset]);

  // Reset tab and add-member state when drawer closes
  useEffect(() => {
    if (!opened) {
      setActiveTab('visibility');
      setSelectedEmployee(null);
      setNewMemberRole('VIEWER');
    }
  }, [opened]);

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

  const handleAddMember = () => {
    if (!space || !selectedEmployee) return;

    addMember(
      {spaceId: space.id, userId: selectedEmployee.id, role: newMemberRole},
      {
        onSuccess: () => {
          notifications.show({
            title: 'Member added',
            message: `${selectedEmployee.name} added as ${newMemberRole.toLowerCase()}.`,
            color: 'green',
          });
          setSelectedEmployee(null);
          setNewMemberRole('VIEWER');
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to add member. They may already be a member.',
            color: 'red',
          });
        },
      }
    );
  };

  const handleRoleChange = (member: SpaceMember, role: SpaceMemberRole) => {
    if (!space || role === member.role) return;

    updateRole(
      {spaceId: space.id, userId: member.userId, role},
      {
        onSuccess: () => {
          notifications.show({
            title: 'Role updated',
            message: `${member.userName ?? 'Member'} is now ${role.toLowerCase()}.`,
            color: 'green',
          });
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to update role. Please try again.',
            color: 'red',
          });
        },
      }
    );
  };

  const handleRemoveMember = (member: SpaceMember) => {
    if (!space) return;

    removeMember(
      {spaceId: space.id, userId: member.userId},
      {
        onSuccess: () => {
          notifications.show({
            title: 'Member removed',
            message: `${member.userName ?? 'Member'} has been removed from this space.`,
            color: 'green',
          });
        },
        onError: () => {
          notifications.show({
            title: 'Error',
            message: 'Failed to remove member. Please try again.',
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
          <Shield className="h-5 w-5 text-[var(--accent-700)]"/>
          <span className={typography.cardTitle}>Space Permissions</span>
        </div>
      }
      position="right"
      size="md"
      styles={{
        header: {borderBottom: '1px solid var(--border-main)', paddingBottom: '1rem'},
        body: {padding: '1.5rem'},
      }}
    >
      {space && (
        <motion.div
          initial={{opacity: 0, x: 8}}
          animate={{opacity: 1, x: 0}}
          transition={{duration: 0.25}}
        >
          {/* Space info header */}
          <div className={`${card.base} p-4 mb-4`}>
            <p className={typography.caption}>Editing permissions for</p>
            <p className={`${typography.cardTitle} mt-2`}>{space.name}</p>
            {space.ownerName && (
              <p className={`${typography.caption} mt-2`}>Owner: {space.ownerName}</p>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-secondary)] mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('visibility')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'visibility'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Globe className="h-4 w-4"/>
              Visibility
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Users className="h-4 w-4"/>
              Members
              {members.length > 0 && (
                <span
                  className="ml-1 px-1.5 py-0.5 text-xs rounded-md bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)]">
                  {members.length}
                </span>
              )}
            </button>
          </div>

          {/* ─── Visibility Tab ──────────────────────────────────────────── */}
          {activeTab === 'visibility' && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      return <Icon className="h-4 w-4 text-[var(--text-muted)]"/>;
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
                  placeholder="e.g. books or lightning"
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
                  size="sm"
                  disabled={isPending}
                  className="flex-1"
                >
                  {isPending ? 'Saving...' : 'Save Permissions'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* ─── Members Tab ─────────────────────────────────────────────── */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Add Member section */}
              <div className={`${card.base} p-4`}>
                <p className={`${typography.body} font-medium mb-4`}>
                  <UserPlus className="h-4 w-4 inline-block mr-2 align-text-bottom"/>
                  Add Member
                </p>
                <div className="space-y-4">
                  <EmployeeSearchAutocomplete
                    value={selectedEmployee}
                    onChange={setSelectedEmployee}
                    placeholder="Search by name or employee code..."
                    excludeIds={existingMemberUserIds}
                  />
                  <div className="flex items-center gap-4">
                    <Select
                      value={newMemberRole}
                      onChange={(val) => val && setNewMemberRole(val as SpaceMemberRole)}
                      data={ROLE_OPTIONS}
                      size="sm"
                      className="flex-1"
                      styles={{
                        input: {
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-main)',
                          color: 'var(--text-primary)',
                        },
                      }}
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={!selectedEmployee || isAdding}
                      onClick={handleAddMember}
                    >
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin"/>
                      ) : (
                        'Add'
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Current members list */}
              <div>
                <p className={`${typography.microLabel} mb-2`}>
                  Current Members ({members.length})
                </p>

                {membersLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]"/>
                  </div>
                )}

                {!membersLoading && members.length === 0 && (
                  <div className="flex flex-col items-center py-8">
                    <UserCheck className="h-8 w-8 text-[var(--text-muted)] mb-2"/>
                    <p className="text-sm text-[var(--text-muted)]">No members yet</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      Add members using the form above
                    </p>
                  </div>
                )}

                {!membersLoading && members.length > 0 && (
                  <div className="space-y-1">
                    {members.map((member) => {
                      return (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-[var(--bg-card-hover)] transition-colors group"
                        >
                          {/* Avatar */}
                          <div
                            className="w-8 h-8 rounded-full bg-[var(--accent-primary-subtle)] flex items-center justify-center text-xs font-medium text-[var(--accent-primary)] flex-shrink-0">
                            {getInitials(member.userName ?? '')}
                          </div>
                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {member.userName ?? `User ${member.userId.slice(0, 8)}`}
                            </p>
                            {member.addedAt && (
                              <p className="text-xs text-[var(--text-muted)] truncate">
                                Added {new Date(member.addedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {/* Role badge / selector */}
                          <Select
                            value={member.role}
                            onChange={(val) =>
                              val && handleRoleChange(member, val as SpaceMemberRole)
                            }
                            data={ROLE_OPTIONS}
                            size="xs"
                            className="w-28 flex-shrink-0"
                            disabled={isUpdatingRole}
                            styles={{
                              input: {
                                backgroundColor: 'var(--bg-secondary)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                minHeight: '28px',
                                height: '28px',
                              },
                            }}
                          />
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member)}
                            className='p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--status-danger-text)] hover:bg-status-danger-bg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)]'
                            aria-label={`Remove ${member.userName ?? 'member'}`}
                          >
                            <X className="h-4 w-4"/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </Drawer>
  );
}
