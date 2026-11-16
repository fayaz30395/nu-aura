'use client';

import {useMemo, useState} from 'react';
import {Badge, Progress, Select, Text, TextInput} from '@mantine/core';
import {Filter, Search, Shield} from 'lucide-react';
import {Card} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {QueryState} from '@/components/ui/QueryState';
import ResponsiveTable, {type Column} from '@/components/ui/ResponsiveTable';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {useCompetencyFrameworks} from '@/lib/hooks/useCompetency';
import type {CompetencyFramework, CompetencyRequirement, ProficiencyLevel} from '@/lib/types/grow/competency';
import {PROFICIENCY_LEVEL_LABELS} from '@/lib/types/grow/competency';

type RequirementRow = CompetencyRequirement & {frameworkName: string; roleFamily: string};

const COLUMNS: Column<RequirementRow>[] = [
  {
    key: 'skill',
    header: 'Skill',
    mobilePriority: 'primary',
    accessor: (row) => <Text fw={500} size="sm">{row.skillName}</Text>,
  },
  {
    key: 'framework',
    header: 'Framework',
    accessor: (row) => <Text size="sm" c="dimmed">{row.frameworkName}</Text>,
  },
  {
    key: 'roleFamily',
    header: 'Role Family',
    accessor: (row) => <Badge size="sm" variant="light" color="indigo">{row.roleFamily}</Badge>,
  },
  {
    key: 'requiredLevel',
    header: 'Required Level',
    accessor: (row) => (
      <div className="flex items-center gap-2">
        <Progress value={(row.requiredLevel / 5) * 100} color="indigo" size="sm" className="w-16"/>
        <Text size="xs" fw={500}>
          {row.requiredLevel}/5 - {PROFICIENCY_LEVEL_LABELS[row.requiredLevel as ProficiencyLevel]}
        </Text>
      </div>
    ),
  },
];

function FrameworkRequirements({frameworks}: {frameworks: CompetencyFramework[]}) {
  const [filterFramework, setFilterFramework] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const frameworkOptions = useMemo(
    () => frameworks.map((f) => ({value: f.id, label: f.name})),
    [frameworks]
  );

  // Flatten framework -> requirement rows for the table, filtered by framework + skill search.
  const rows = useMemo<RequirementRow[]>(() => {
    return frameworks
      .filter((f) => !filterFramework || f.id === filterFramework)
      .flatMap((f) =>
        f.requirements
          .filter((r) => !searchTerm || r.skillName.toLowerCase().includes(searchTerm.toLowerCase()))
          .map((r) => ({...r, frameworkName: f.name, roleFamily: f.roleFamily}))
      );
  }, [frameworks, filterFramework, searchTerm]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {frameworks.map((f) => {
          const active = filterFramework === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterFramework(active ? null : f.id)}
              className="card-aura flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-surface-aura-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
            >
              <span className="text-xs text-text-2">{f.name}</span>
              <span className="text-xl font-semibold tabular-nums text-text-1">{f.requirements.length}</span>
              {active && <Badge size="xs" color="indigo">Active Filter</Badge>}
            </button>
          );
        })}
      </div>

      <Card as="section" className="flex flex-wrap items-center gap-4 p-4">
        <div className="flex items-center gap-2 text-text-3">
          <Filter className="h-4 w-4" aria-hidden/>
          <Text size="sm" fw={500}>Filters:</Text>
        </div>
        <TextInput
          aria-label="Search skills"
          placeholder="Search skills..."
          leftSection={<Search className="h-4 w-4" aria-hidden/>}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          className="w-full flex-1 sm:w-auto"
        />
        <Select
          aria-label="Framework"
          placeholder="Framework"
          data={frameworkOptions}
          value={filterFramework}
          onChange={setFilterFramework}
          clearable
          className="w-full sm:w-56"
        />
      </Card>

      <ResponsiveTable
        columns={COLUMNS}
        data={rows}
        keyExtractor={(row) => row.id}
        emptyState={
          <EmptyState
            icon={<Search className="h-full w-full"/>}
            title="No matching requirements"
            description="No skill requirements match your filters."
            size="compact"
          />
        }
      />
    </div>
  );
}

export function FrameworkAdminTab() {
  const frameworksQuery = useCompetencyFrameworks();

  return (
    <QueryState
      query={frameworksQuery}
      skeleton={<ListPageSkeleton showHeader={false} rows={6} columns={4}/>}
      isEmpty={(data) => data.length === 0}
      empty={{
        icon: <Shield className="h-8 w-8"/>,
        title: 'No competency frameworks',
        description: 'Competency frameworks will appear here once they are defined.',
      }}
      errorTitle="Couldn't load competency frameworks"
      errorMessage="Something went wrong loading the framework data. Please try again."
    >
      {(frameworks) => <FrameworkRequirements frameworks={frameworks}/>}
    </QueryState>
  );
}
