'use client';

import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {
  Badge,
  Button,
  Card,
  Group,
  Modal,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {Filter, Plus, Search, ToggleLeft} from 'lucide-react';
import {useFeatureFlags, useSetFeatureFlag, useToggleFeatureFlag} from '@/lib/hooks/queries/useFeatureFlags';
import {Roles, usePermissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {SkeletonCard} from '@/components/ui/Skeleton';
import type {FeatureFlag} from '@/lib/types/core/feature-flag';

const ADMIN_ACCESS_ROLES = [Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.HR_ADMIN, Roles.HR_MANAGER];

const CATEGORIES = [
  {value: '', label: 'All Categories'},
  {value: 'HRMS', label: 'HRMS'},
  {value: 'PROJECTS', label: 'Projects'},
  {value: 'INTEGRATION', label: 'Integration'},
];

const CATEGORY_COLORS: Record<string, string> = {
  HRMS: 'blue',
  PROJECTS: 'green',
  INTEGRATION: 'orange',
};

export default function FeatureFlagsPage() {
  const router = useRouter();
  const {isAdmin, hasAnyRole, isReady} = usePermissions();
  const {hasHydrated, isAuthenticated} = useAuth();
  const {data: flags, isLoading} = useFeatureFlags();

  // DEF-51: RBAC gate — redirect non-admin users
  useEffect(() => {
    if (!hasHydrated || !isReady) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }
    if (!hasAnyRole(...ADMIN_ACCESS_ROLES)) {
      router.replace('/me/dashboard');
    }
  }, [hasHydrated, isReady, isAuthenticated, router, hasAnyRole]);
  const {mutate: toggleFlag, isPending: isToggling} = useToggleFeatureFlag();
  const {mutate: setFlag, isPending: isSetting} = useSetFeatureFlag();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [newFlag, setNewFlag] = useState({
    featureKey: '',
    name: '',
    description: '',
    category: 'HRMS',
    enabled: false,
  });

  // L-5: use isAdmin from usePermissions instead of direct hasRole calls

  const filteredFlags = (flags ?? []).filter((flag: FeatureFlag) => {
    const matchesSearch =
      !search ||
      flag.featureName.toLowerCase().includes(search.toLowerCase()) ||
      flag.featureKey.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || flag.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const enabledCount = (flags ?? []).filter((f: FeatureFlag) => f.enabled).length;
  const totalCount = (flags ?? []).length;

  const handleCreate = () => {
    setFlag({
      featureKey: newFlag.featureKey,
      enabled: newFlag.enabled,
      name: newFlag.name,
      description: newFlag.description,
      category: newFlag.category,
    });
    setCreateOpen(false);
    setNewFlag({featureKey: '', name: '', description: '', category: 'HRMS', enabled: false});
  };

  if (isLoading) return <div className="space-y-4 p-6">{Array.from({length: 4}).map((_, i) => <SkeletonCard
    key={i}/>)}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Group justify="space-between">
        <div>
          <Title order={2} className="skeuo-emboss">Feature Flags</Title>
          <Text size="sm" c="dimmed" className="skeuo-deboss">
            {enabledCount} of {totalCount} features enabled for your organization
          </Text>
        </div>
        {isAdmin && (
          <Button leftSection={<Plus size={16}/>} onClick={() => setCreateOpen(true)}>
            Add Feature Flag
          </Button>
        )}
      </Group>
      {/* Filters */}
      <Group>
        <TextInput
          placeholder="Search features..."
          leftSection={<Search size={16}/>}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          className="flex-1"
        />
        <Select
          placeholder="Category"
          leftSection={<Filter size={16}/>}
          data={CATEGORIES}
          value={categoryFilter}
          onChange={(val) => setCategoryFilter(val ?? '')}
          clearable
          w={200}
        />
      </Group>
      {/* Feature Flag Cards */}
      <Stack gap="sm">
        {filteredFlags.map((flag: FeatureFlag) => (
          <Card key={flag.id} withBorder padding="md" radius="md" className="skeuo-card">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="md" wrap="nowrap" style={{flex: 1}}>
                <ToggleLeft
                  size={24}
                  className={flag.enabled ? 'text-status-success-text' : 'text-[var(--text-muted)]'}
                />
                <div style={{flex: 1}}>
                  <Group gap="xs">
                    <Text fw={600} size="sm">
                      {flag.featureName}
                    </Text>
                    {flag.category && (
                      <Badge
                        size="xs"
                        variant="light"
                        color={CATEGORY_COLORS[flag.category] ?? 'gray'}
                      >
                        {flag.category}
                      </Badge>
                    )}
                    <Badge size="xs" variant="dot" color={flag.enabled ? 'green' : 'gray'}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Group>
                  {flag.description && (
                    <Text size="xs" c="dimmed" mt={2}>
                      {flag.description}
                    </Text>
                  )}
                  <Text size="xs" c="dimmed" mt={2} ff="monospace">
                    {flag.featureKey}
                  </Text>
                </div>
              </Group>

              <Group gap="xs" wrap="nowrap">
                {flag.percentageRollout !== null && flag.percentageRollout !== undefined && (
                  <Tooltip label={`${flag.percentageRollout}% rollout`}>
                    <Badge size="sm" variant="outline" color="blue">
                      {flag.percentageRollout}%
                    </Badge>
                  </Tooltip>
                )}
                {isAdmin && (
                  <Switch
                    checked={flag.enabled}
                    onChange={() => toggleFlag(flag.featureKey)}
                    disabled={isToggling}
                    size="md"
                  />
                )}
              </Group>
            </Group>
          </Card>
        ))}

        {filteredFlags.length === 0 && (
          <Card withBorder padding="xl" radius="md" className="skeuo-card">
            <Stack align="center" gap="sm">
              <ToggleLeft size={48} className="text-[var(--text-muted)]"/>
              <Text size="sm" c="dimmed">
                {search || categoryFilter
                  ? 'No feature flags match your filters'
                  : 'No feature flags configured'}
              </Text>
            </Stack>
          </Card>
        )}
      </Stack>
      {/* Create Modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Feature Flag"
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Feature Key"
            placeholder="enable_new_feature"
            description="Unique identifier (snake_case)"
            value={newFlag.featureKey}
            onChange={(e) => setNewFlag({...newFlag, featureKey: e.currentTarget.value})}
            required
          />
          <TextInput
            label="Display Name"
            placeholder="New Feature"
            value={newFlag.name}
            onChange={(e) => setNewFlag({...newFlag, name: e.currentTarget.value})}
            required
          />
          <Textarea
            label="Description"
            placeholder="What this feature flag controls..."
            value={newFlag.description}
            onChange={(e) => setNewFlag({...newFlag, description: e.currentTarget.value})}
          />
          <Select
            label="Category"
            data={CATEGORIES.filter((c) => c.value !== '')}
            value={newFlag.category}
            onChange={(val) => setNewFlag({...newFlag, category: val ?? 'HRMS'})}
          />
          <Switch
            label="Enable immediately"
            checked={newFlag.enabled}
            onChange={(e) => setNewFlag({...newFlag, enabled: e.currentTarget.checked})}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newFlag.featureKey || !newFlag.name || isSetting}
              loading={isSetting}
            >
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
