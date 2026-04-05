'use client';

import {useCallback, useMemo, useState} from 'react';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Filter,
  Info,
  Plus,
  Search,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {AppLayout} from '@/components/layout';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {PageErrorFallback} from '@/components/errors/PageErrorFallback';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useAddEmployeeSkill,
  useEmployeeSkills,
  useRemoveSkill,
  useSkillGapAnalysis,
  useVerifySkill,
} from '@/lib/hooks/useCompetency';
import type {CompetencyCategory, EmployeeSkill, ProficiencyLevel, SkillGapDetail,} from '@/lib/types/grow/competency';
import {
  COMPETENCY_CATEGORY_COLORS,
  COMPETENCY_CATEGORY_LABELS,
  GAP_LEVEL_COLORS,
  PROFICIENCY_LEVEL_LABELS,
} from '@/lib/types/grow/competency';

// Recharts uses browser-only SVG/ResizeObserver APIs — lazy-load chart components.
// Both chart files live in CompetencyCharts.tsx so the entire recharts bundle is
// excluded from the initial page JS.
const ChartSkeleton = () => (
  <div className="w-full h-[280px] animate-pulse bg-[var(--bg-secondary)] rounded-lg"/>
);
const GapAnalysisRadarChart = dynamic(
  () => import('./CompetencyCharts').then(m => ({default: m.GapAnalysisRadarChart})),
  {ssr: false, loading: ChartSkeleton}
);
const CompetencyHeatmapChart = dynamic(
  () => import('./CompetencyCharts').then(m => ({default: m.CompetencyHeatmapChart})),
  {ssr: false, loading: ChartSkeleton}
);

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const addSkillSchema = z.object({
  skillName: z.string().min(1, 'Skill name is required').max(100),
  category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'LEADERSHIP', 'DOMAIN', 'PROBLEM_SOLVING']),
  proficiencyLevel: z.number().min(1).max(5),
  source: z.enum(['SELF', 'MANAGER', 'COURSE_COMPLETION']),
});

type AddSkillFormValues = z.infer<typeof addSkillSchema>;

// ─── Competency Framework Definitions (admin-managed, static for now) ────

const FRAMEWORK_COMPETENCIES: Array<{
  name: string;
  category: CompetencyCategory;
  description: string;
  requiredLevel: ProficiencyLevel;
  department: string;
}> = [
  {
    name: 'System Design',
    category: 'TECHNICAL',
    description: 'Ability to design scalable distributed systems',
    requiredLevel: 4,
    department: 'Engineering'
  },
  {
    name: 'Java',
    category: 'TECHNICAL',
    description: 'Proficiency in Java programming language',
    requiredLevel: 4,
    department: 'Engineering'
  },
  {
    name: 'Cloud Architecture',
    category: 'TECHNICAL',
    description: 'AWS/GCP/Azure cloud infrastructure design',
    requiredLevel: 3,
    department: 'Engineering'
  },
  {
    name: 'API Development',
    category: 'TECHNICAL',
    description: 'REST/GraphQL API design and implementation',
    requiredLevel: 4,
    department: 'Engineering'
  },
  {
    name: 'Database Design',
    category: 'TECHNICAL',
    description: 'Relational and NoSQL database modeling',
    requiredLevel: 3,
    department: 'Engineering'
  },
  {
    name: 'Leadership',
    category: 'LEADERSHIP',
    description: 'Guiding teams and making strategic decisions',
    requiredLevel: 4,
    department: 'Management'
  },
  {
    name: 'Communication',
    category: 'BEHAVIORAL',
    description: 'Clear and effective written and verbal communication',
    requiredLevel: 5,
    department: 'All'
  },
  {
    name: 'Strategic Planning',
    category: 'LEADERSHIP',
    description: 'Long-term planning and vision alignment',
    requiredLevel: 4,
    department: 'Management'
  },
  {
    name: 'Team Management',
    category: 'LEADERSHIP',
    description: 'Managing and developing team members',
    requiredLevel: 4,
    department: 'Management'
  },
  {
    name: 'Problem Solving',
    category: 'PROBLEM_SOLVING',
    description: 'Analytical thinking and creative solutions',
    requiredLevel: 3,
    department: 'All'
  },
  {
    name: 'Product Strategy',
    category: 'DOMAIN',
    description: 'Product vision, roadmap, and market analysis',
    requiredLevel: 4,
    department: 'Product'
  },
  {
    name: 'User Research',
    category: 'DOMAIN',
    description: 'Conducting user interviews and usability testing',
    requiredLevel: 3,
    department: 'Product'
  },
  {
    name: 'Data Analysis',
    category: 'TECHNICAL',
    description: 'Statistical analysis and data interpretation',
    requiredLevel: 3,
    department: 'Product'
  },
  {
    name: 'Stakeholder Management',
    category: 'BEHAVIORAL',
    description: 'Managing relationships with key stakeholders',
    requiredLevel: 4,
    department: 'Product'
  },
  {
    name: 'Collaboration',
    category: 'BEHAVIORAL',
    description: 'Working effectively within and across teams',
    requiredLevel: 3,
    department: 'All'
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

const proficiencyOptions = [
  {value: '1', label: '1 - Beginner'},
  {value: '2', label: '2 - Basic'},
  {value: '3', label: '3 - Intermediate'},
  {value: '4', label: '4 - Advanced'},
  {value: '5', label: '5 - Expert'},
];

const categoryOptions = Object.entries(COMPETENCY_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const sourceOptions = [
  {value: 'SELF', label: 'Self Assessment'},
  {value: 'MANAGER', label: 'Manager Assessment'},
  {value: 'COURSE_COMPLETION', label: 'Course Completion'},
];

const departmentOptions = [
  {value: 'All', label: 'All Departments'},
  {value: 'Engineering', label: 'Engineering'},
  {value: 'Management', label: 'Management'},
  {value: 'Product', label: 'Product'},
];

const HEATMAP_COLORS = [
  'bg-danger-100 text-danger-800 dark:bg-danger-900/40 dark:text-danger-300',
  'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300',
  'bg-warning-100 text-warning-800 dark:bg-warning-900/40 dark:text-warning-300',
  'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300',
  'bg-success-100 text-success-800 dark:bg-success-900/40 dark:text-success-300',
];

function getHeatmapClass(level: number): string {
  if (level <= 0) return 'bg-[var(--bg-secondary)] text-[var(--text-muted)]';
  return HEATMAP_COLORS[Math.min(level - 1, 4)];
}

// ─── Framework Admin Tab ─────────────────────────────────────────────────

function FrameworkAdminTab() {
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = useMemo(() => {
    return FRAMEWORK_COMPETENCIES.filter((c) => {
      if (filterCategory && c.category !== filterCategory) return false;
      if (filterDepartment && filterDepartment !== 'All' && c.department !== filterDepartment && c.department !== 'All') return false;
      if (searchTerm && !c.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [filterCategory, filterDepartment, searchTerm]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    FRAMEWORK_COMPETENCIES.forEach((c) => {
      stats[c.category] = (stats[c.category] || 0) + 1;
    });
    return Object.entries(stats).map(([category, count]) => ({
      category,
      label: COMPETENCY_CATEGORY_LABELS[category as CompetencyCategory],
      count,
      color: COMPETENCY_CATEGORY_COLORS[category as CompetencyCategory],
    }));
  }, []);

  return (
    <div className="space-y-6">
      {/* Category Stats */}
      <SimpleGrid cols={{base: 2, sm: 3, md: 5}}>
        {categoryStats.map((stat) => (
          <Paper
            key={stat.category}
            className="p-4 border border-[var(--border-main)] skeuo-card cursor-pointer hover:shadow-[var(--shadow-elevated)] transition-shadow"
            onClick={() => setFilterCategory(filterCategory === stat.category ? null : stat.category)}
          >
            <div className="row-between">
              <div>
                <Text size="xs" c="dimmed">{stat.label}</Text>
                <Text size="xl" fw={700} className="text-[var(--text-primary)]">{stat.count}</Text>
              </div>
              <div className={`w-3 h-3 rounded-full bg-${stat.color}-500`}/>
            </div>
            {filterCategory === stat.category && (
              <Badge size="xs" color="indigo" mt={4}>Active Filter</Badge>
            )}
          </Paper>
        ))}
      </SimpleGrid>

      {/* Filters */}
      <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Filter className="h-4 w-4"/>
            <Text size="sm" fw={500}>Filters:</Text>
          </div>
          <TextInput
            placeholder="Search competencies..."
            size="sm"
            leftSection={<Search className="h-3.5 w-3.5"/>}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.currentTarget.value)}
            className="flex-1 min-w-[200px]"
          />
          <Select
            placeholder="Category"
            size="sm"
            data={categoryOptions}
            value={filterCategory}
            onChange={setFilterCategory}
            clearable
            className="min-w-[160px]"
          />
          <Select
            placeholder="Department"
            size="sm"
            data={departmentOptions}
            value={filterDepartment}
            onChange={setFilterDepartment}
            clearable
            className="min-w-[160px]"
          />
        </div>
      </Paper>

      {/* Competency Table */}
      <Paper className="border border-[var(--border-main)] skeuo-card overflow-hidden">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Competency</Table.Th>
              <Table.Th>Category</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Required Level</Table.Th>
              <Table.Th>Description</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((comp, idx) => (
              <Table.Tr key={`${comp.name}-${idx}`}>
                <Table.Td>
                  <Text fw={500} size="sm">{comp.name}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge
                    size="sm"
                    variant="light"
                    color={COMPETENCY_CATEGORY_COLORS[comp.category]}
                  >
                    {COMPETENCY_CATEGORY_LABELS[comp.category]}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">{comp.department}</Text>
                </Table.Td>
                <Table.Td>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(comp.requiredLevel / 5) * 100}
                      color="indigo"
                      size="sm"
                      className="w-16"
                    />
                    <Text size="xs" fw={500}>
                      {comp.requiredLevel}/5 - {PROFICIENCY_LEVEL_LABELS[comp.requiredLevel]}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed" lineClamp={1}>{comp.description}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="xl">No competencies match your filters.</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </div>
  );
}

// ─── My Competencies Tab ─────────────────────────────────────────────────

function MyCompetenciesTab({employeeId}: { employeeId: string }) {
  const [addModalOpened, {open: openAddModal, close: closeAddModal}] = useDisclosure(false);

  const skillsQuery = useEmployeeSkills(employeeId);
  const gapQuery = useSkillGapAnalysis(employeeId);
  const addSkillMutation = useAddEmployeeSkill(employeeId);
  const removeSkillMutation = useRemoveSkill(employeeId);

  const form = useForm<AddSkillFormValues>({
    resolver: zodResolver(addSkillSchema),
    defaultValues: {
      skillName: '',
      category: 'TECHNICAL',
      proficiencyLevel: 3,
      source: 'SELF',
    },
  });

  const handleAddSkill = useCallback(
    (values: AddSkillFormValues) => {
      addSkillMutation.mutate(values as Parameters<typeof addSkillMutation.mutate>[0], {
        onSuccess: () => {
          closeAddModal();
          form.reset();
        },
      });
    },
    [addSkillMutation, closeAddModal, form]
  );

  const skills = useMemo(() => skillsQuery.data || [], [skillsQuery.data]);
  const gapReport = gapQuery.data;

  // Build radar chart data: current vs required
  const radarData = useMemo(() => {
    if (!gapReport?.gaps) return [];
    return gapReport.gaps.map((gap) => ({
      skill: gap.skillName,
      current: gap.currentLevel,
      required: gap.requiredLevel,
      fullMark: 5,
    }));
  }, [gapReport]);

  // Group skills by category for the matrix grid
  const skillsByCategory = useMemo(() => {
    const grouped: Record<string, EmployeeSkill[]> = {};
    skills.forEach((s) => {
      const cat = s.category || 'UNCATEGORIZED';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    return grouped;
  }, [skills]);

  if (skillsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader color="indigo" size="lg"/>
      </div>
    );
  }

  if (skillsQuery.isError) {
    return (
      <PageErrorFallback
        title="Failed to load skills"
        error={new Error('Unable to fetch your competency data.')}
        onReset={() => skillsQuery.refetch()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="row-between">
        <div>
          <Text size="sm" c="dimmed">
            {skills.length} skill{skills.length !== 1 ? 's' : ''} recorded
            {gapReport?.gaps?.length ? ` | ${gapReport.gaps.length} gap${gapReport.gaps.length !== 1 ? 's' : ''} identified` : ''}
          </Text>
        </div>
        <Button
          leftSection={<Plus className="h-4 w-4"/>}
          size="sm"
          className="bg-accent-700 hover:bg-accent-800"
          onClick={openAddModal}
        >
          Add Skill
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency Matrix Grid */}
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <Title order={4} mb="md" className="text-[var(--text-primary)]">
            Skills Matrix
          </Title>
          {Object.keys(skillsByCategory).length === 0 ? (
            <div className="text-center py-10">
              <Target className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-4"/>
              <Text c="dimmed">No skills recorded yet. Add your first skill to get started.</Text>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(skillsByCategory).map(([category, catSkills]) => (
                <div key={category}>
                  <Badge
                    size="sm"
                    variant="light"
                    color={COMPETENCY_CATEGORY_COLORS[category as CompetencyCategory] || 'gray'}
                    mb="xs"
                  >
                    {COMPETENCY_CATEGORY_LABELS[category as CompetencyCategory] || category}
                  </Badge>
                  <div className="space-y-2">
                    {catSkills.map((skill) => (
                      <div
                        key={skill.id}
                        className="row-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)]"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Text size="sm" fw={500} truncate="end">
                                {skill.skillName}
                              </Text>
                              {skill.isVerified && (
                                <Tooltip label="Verified by manager">
                                  <CheckCircle className="h-3.5 w-3.5 text-success-500 shrink-0"/>
                                </Tooltip>
                              )}
                            </div>
                            <Text size="xs" c="dimmed">
                              {PROFICIENCY_LEVEL_LABELS[skill.proficiencyLevel as ProficiencyLevel]}
                              {skill.source === 'SELF' ? ' (Self)' : skill.source === 'MANAGER' ? ' (Manager)' : ' (Course)'}
                            </Text>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-2xs font-bold ${
                                  level <= skill.proficiencyLevel
                                    ? getHeatmapClass(level)
                                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                                }`}
                              >
                                {level}
                              </div>
                            ))}
                          </div>
                        </div>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          ml="xs"
                          onClick={() => removeSkillMutation.mutate(skill.id)}
                          loading={removeSkillMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5"/>
                        </ActionIcon>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Paper>

        {/* Gap Analysis Radar Chart */}
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <Title order={4} mb="md" className="text-[var(--text-primary)]">
            Gap Analysis
          </Title>
          {gapQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader color="indigo" size="md"/>
            </div>
          ) : radarData.length === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-4"/>
              <Text c="dimmed">No gap analysis data available.</Text>
            </div>
          ) : (
            <>
              <GapAnalysisRadarChart data={radarData}/>

              {/* Gap Details */}
              <div className="mt-4 space-y-2">
                {gapReport?.gaps?.map((gap: SkillGapDetail) => (
                  <div
                    key={gap.skillName}
                    className="row-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)]"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        className={`h-4 w-4 ${
                          gap.gapLevel === 'CRITICAL'
                            ? 'text-danger-500'
                            : gap.gapLevel === 'MODERATE'
                              ? 'text-warning-500'
                              : 'text-warning-500'
                        }`}
                      />
                      <Text size="sm" fw={500}>{gap.skillName}</Text>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        size="xs"
                        color={GAP_LEVEL_COLORS[gap.gapLevel]}
                        variant="light"
                      >
                        {gap.gapLevel}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {gap.currentLevel} / {gap.requiredLevel}
                      </Text>
                      {gap.recommendedCourses.length > 0 && (
                        <Tooltip label={`${gap.recommendedCourses.length} course(s) recommended`}>
                          <BookOpen className="h-3.5 w-3.5 text-accent-600"/>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Paper>
      </div>

      {/* Add Skill Modal */}
      <Modal
        opened={addModalOpened}
        onClose={closeAddModal}
        title="Add Self-Assessment Skill"
        size="md"
      >
        <form onSubmit={form.handleSubmit(handleAddSkill)}>
          <Stack gap="md">
            <Controller
              name="skillName"
              control={form.control}
              render={({field, fieldState}) => (
                <TextInput
                  label="Skill Name"
                  placeholder="e.g., Java, Leadership, Data Analysis"
                  required
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="category"
              control={form.control}
              render={({field, fieldState}) => (
                <Select
                  label="Category"
                  data={categoryOptions}
                  required
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
            <Controller
              name="proficiencyLevel"
              control={form.control}
              render={({field, fieldState}) => (
                <Select
                  label="Proficiency Level"
                  data={proficiencyOptions}
                  required
                  error={fieldState.error?.message}
                  value={String(field.value)}
                  onChange={(val) => field.onChange(val ? Number(val) : 1)}
                />
              )}
            />
            <Controller
              name="source"
              control={form.control}
              render={({field, fieldState}) => (
                <Select
                  label="Assessment Source"
                  data={sourceOptions}
                  required
                  error={fieldState.error?.message}
                  {...field}
                />
              )}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeAddModal}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-accent-700 hover:bg-accent-800"
                loading={addSkillMutation.isPending}
              >
                Save Skill
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </div>
  );
}

// ─── Team View Tab ───────────────────────────────────────────────────────

function TeamViewTab({managerId}: { managerId: string }) {
  const [_selectedCategory, _setSelectedCategory] = useState<string | null>(null);
  const verifySkillMutation = useVerifySkill();

  // In a production system, this would call a team skills endpoint.
  // For now, we show the manager's own gap analysis as a representative view.
  const gapQuery = useSkillGapAnalysis(managerId);
  const skillsQuery = useEmployeeSkills(managerId);

  const skills = useMemo(() => skillsQuery.data || [], [skillsQuery.data]);
  const gapReport = gapQuery.data;

  // Build heatmap bar chart data
  const heatmapData = useMemo(() => {
    if (!skills.length) return [];
    const grouped: Record<string, { total: number; count: number }> = {};
    skills.forEach((s) => {
      const cat = s.category || 'Other';
      if (!grouped[cat]) grouped[cat] = {total: 0, count: 0};
      grouped[cat].total += s.proficiencyLevel;
      grouped[cat].count += 1;
    });
    return Object.entries(grouped).map(([category, data]) => ({
      category: COMPETENCY_CATEGORY_LABELS[category as CompetencyCategory] || category,
      avgLevel: Math.round((data.total / data.count) * 10) / 10,
      count: data.count,
    }));
  }, [skills]);


  if (skillsQuery.isLoading || gapQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader color="indigo" size="lg"/>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Stats */}
      <SimpleGrid cols={{base: 1, sm: 2, md: 4}}>
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <div className="flex items-start justify-between">
            <div>
              <Text size="xs" c="dimmed">Total Skills</Text>
              <Text size="xl" fw={700}>{skills.length}</Text>
            </div>
            <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/40">
              <Target className="h-5 w-5 text-accent-700 dark:text-accent-400"/>
            </div>
          </div>
        </Paper>
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <div className="flex items-start justify-between">
            <div>
              <Text size="xs" c="dimmed">Verified Skills</Text>
              <Text size="xl" fw={700}>{skills.filter((s) => s.isVerified).length}</Text>
            </div>
            <div className="p-2 rounded-lg bg-success-100 dark:bg-success-900/40">
              <CheckCircle className="h-5 w-5 text-success-600 dark:text-success-400"/>
            </div>
          </div>
        </Paper>
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <div className="flex items-start justify-between">
            <div>
              <Text size="xs" c="dimmed">Skill Gaps</Text>
              <Text size="xl" fw={700}>{gapReport?.gaps?.length || 0}</Text>
            </div>
            <div className="p-2 rounded-lg bg-warning-100 dark:bg-warning-900/40">
              <AlertTriangle className="h-5 w-5 text-warning-600 dark:text-warning-400"/>
            </div>
          </div>
        </Paper>
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <div className="flex items-start justify-between">
            <div>
              <Text size="xs" c="dimmed">Avg Proficiency</Text>
              <Text size="xl" fw={700}>
                {skills.length > 0
                  ? (skills.reduce((sum, s) => sum + s.proficiencyLevel, 0) / skills.length).toFixed(1)
                  : 'N/A'}
              </Text>
            </div>
            <div className="p-2 rounded-lg bg-accent-300 dark:bg-accent-900/40">
              <TrendingUp className="h-5 w-5 text-accent-800 dark:text-accent-600"/>
            </div>
          </div>
        </Paper>
      </SimpleGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Heatmap Bar Chart */}
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <Title order={4} mb="md" className="text-[var(--text-primary)]">
            Team Competency Heatmap
          </Title>
          {heatmapData.length === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-4"/>
              <Text c="dimmed">No team skills data available.</Text>
            </div>
          ) : (
            <CompetencyHeatmapChart data={heatmapData}/>
          )}
        </Paper>

        {/* Skills needing verification */}
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <Title order={4} mb="md" className="text-[var(--text-primary)]">
            Skills Pending Verification
          </Title>
          {skills.filter((s) => !s.isVerified).length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="h-10 w-10 mx-auto text-success-500 mb-4"/>
              <Text c="dimmed">All skills are verified.</Text>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {skills
                .filter((s) => !s.isVerified)
                .map((skill) => (
                  <div
                    key={skill.id}
                    className="row-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)]"
                  >
                    <div>
                      <Text size="sm" fw={500}>{skill.skillName}</Text>
                      <Text size="xs" c="dimmed">
                        Level {skill.proficiencyLevel} - {PROFICIENCY_LEVEL_LABELS[skill.proficiencyLevel as ProficiencyLevel]}
                      </Text>
                    </div>
                    <Button
                      size="xs"
                      variant="light"
                      color="green"
                      leftSection={<CheckCircle className="h-3.5 w-3.5"/>}
                      onClick={() => verifySkillMutation.mutate(skill.id)}
                      loading={verifySkillMutation.isPending}
                    >
                      Verify
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </Paper>
      </div>

      {/* Training Recommendations */}
      {gapReport?.gaps && gapReport.gaps.length > 0 && (
        <Paper className="p-4 border border-[var(--border-main)] skeuo-card">
          <Title order={4} mb="md" className="text-[var(--text-primary)]">
            Training Recommendations
          </Title>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gapReport.gaps
              .filter((gap) => gap.recommendedCourses.length > 0)
              .map((gap) => (
                <div
                  key={gap.skillName}
                  className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-accent-600"/>
                    <Text size="sm" fw={600}>{gap.skillName}</Text>
                    <Badge size="xs" color={GAP_LEVEL_COLORS[gap.gapLevel]} variant="light">
                      {gap.gapLevel}
                    </Badge>
                  </div>
                  <Text size="xs" c="dimmed" mb="xs">
                    Current: {gap.currentLevel} / Required: {gap.requiredLevel}
                  </Text>
                  <div className="space-y-1">
                    {gap.recommendedCourses.map((course) => (
                      <div
                        key={course.courseId}
                        className="flex items-center gap-2 text-xs text-accent-700 dark:text-accent-400"
                      >
                        <ChevronRight className="h-3 w-3"/>
                        <span>{course.title}</span>
                        <Badge size="xs" variant="outline" color="gray">
                          {course.difficulty}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            {gapReport.gaps.filter((g) => g.recommendedCourses.length > 0).length === 0 && (
              <Text c="dimmed" size="sm">No specific course recommendations at this time.</Text>
            )}
          </div>
        </Paper>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function CompetencyMatrixPage() {
  const {user} = useAuth();
  const employeeId = user?.employeeId || '';
  const [activeTab, setActiveTab] = useState<string | null>('my-competencies');

  return (
    <AppLayout activeMenuItem="competency-matrix">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-1">
            <div className="p-2 rounded-lg bg-accent-100 dark:bg-accent-900/40">
              <BarChart3 className="h-5 w-5 text-accent-700 dark:text-accent-400"/>
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-secondary)] skeuo-emboss">
                Competency Matrix
              </h1>
              <p className="text-body-muted skeuo-deboss">
                Manage competency frameworks, assess skills, and identify gaps
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="lg">
            <Tabs.Tab
              value="my-competencies"
              leftSection={<Target className="h-4 w-4"/>}
            >
              My Competencies
            </Tabs.Tab>
            <PermissionGate permission={Permissions.REVIEW_VIEW} fallback={null}>
              <Tabs.Tab
                value="team-view"
                leftSection={<Users className="h-4 w-4"/>}
              >
                Team View
              </Tabs.Tab>
            </PermissionGate>
            <PermissionGate permission={Permissions.REVIEW_VIEW} fallback={null}>
              <Tabs.Tab
                value="framework"
                leftSection={<Shield className="h-4 w-4"/>}
              >
                Competency Framework
              </Tabs.Tab>
            </PermissionGate>
          </Tabs.List>

          <Tabs.Panel value="my-competencies">
            {employeeId ? (
              <MyCompetenciesTab employeeId={employeeId}/>
            ) : (
              <div className="text-center py-10">
                <Info className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-4"/>
                <Text c="dimmed">Please log in to view your competencies.</Text>
              </div>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="team-view">
            {employeeId ? (
              <TeamViewTab managerId={employeeId}/>
            ) : (
              <div className="text-center py-10">
                <Info className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-4"/>
                <Text c="dimmed">Please log in to view team competencies.</Text>
              </div>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="framework">
            <FrameworkAdminTab/>
          </Tabs.Panel>
        </Tabs>
      </div>
    </AppLayout>
  );
}
