'use client';

import React, {useState} from 'react';
import {Award, Plus, Star, Trash2, Zap} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {PageHeader} from '@/components/ui/PageHeader';
import {QueryState} from '@/components/ui/QueryState';
import {EmptyState} from '@/components/ui/EmptyState';
import {ListPageSkeleton} from '@/components/ui/skeletons';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {Button} from '@/components/ui/Button';
import {Input} from '@/components/ui/Input';
import {Select} from '@/components/ui/Select';
import {ConfirmDialog} from '@/components/ui/ConfirmDialog';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useGetEmployeeSkills,
  useAddOrUpdateSkill,
  useRemoveSkill,
  getGetEmployeeSkillsQueryKey,
} from '@/lib/generated/api/employee-skills/employee-skills';
import type {EmployeeSkill} from '@/lib/generated/api/model';

const CATEGORIES = ['Technical', 'Soft Skills', 'Domain', 'Leadership', 'Tool', 'Language', 'Other'];
const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};
const BREADCRUMBS = [{label: 'My Space', href: '/me/dashboard'}, {label: 'My Skills'}];

const skillSchema = z.object({
  skillName: z.string().refine((v) => v.trim().length > 0, 'Skill name is required'),
  category: z.string().min(1, 'Category is required'),
  proficiencyLevel: z.number().int().min(1).max(5),
});
type SkillFormValues = z.infer<typeof skillSchema>;

const EMPTY_FORM: SkillFormValues = {skillName: '', category: 'Technical', proficiencyLevel: 3};

function ProficiencyStars({level}: {level: number}) {
  return (
    <div className="flex gap-0.5" aria-label={`Proficiency: ${PROFICIENCY_LABELS[level] ?? level}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= level ? 'fill-status-warn-fg text-status-warn-fg' : 'text-border'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function MySkillsPage() {
  const {user, hasHydrated} = useAuth();
  const employeeId = user?.employeeId ?? '';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<EmployeeSkill | null>(null);

  const skillsQuery = useGetEmployeeSkills(employeeId, {query: {enabled: !!employeeId}});

  const {register, handleSubmit, reset, formState: {errors}} = useForm<SkillFormValues>({
    resolver: zodResolver(skillSchema),
    defaultValues: EMPTY_FORM,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: getGetEmployeeSkillsQueryKey(employeeId)});

  const addMut = useAddOrUpdateSkill({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowForm(false);
        reset(EMPTY_FORM);
      },
    },
  });

  const removeMut = useRemoveSkill({
    mutation: {onSuccess: () => {invalidate(); setPendingDelete(null);}},
  });

  const onSubmit = (values: SkillFormValues) => {
    if (!employeeId) return;
    addMut.mutate({employeeId, data: values});
  };

  const closeForm = () => {
    setShowForm(false);
    reset(EMPTY_FORM);
  };

  const skeleton = <ListPageSkeleton rows={4} columns={3} showHeader={false} showFilters={false}/>;

  return (
    <AppLayout activeMenuItem="my-skills">
      <div className="flex flex-col gap-6">
        <PageHeader
          title="My Skills"
          description="Track and showcase your professional skills."
          breadcrumbs={BREADCRUMBS}
          actions={!!employeeId && (
            <Button leftIcon={<Plus className="h-4 w-4" aria-hidden="true"/>} onClick={() => setShowForm((v) => !v)}>
              Add Skill
            </Button>
          )}
        />

        {showForm && (
          <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="skill-form-title">
            <h2 id="skill-form-title" className="mb-4 text-sm font-semibold text-text-1">Add / Update Skill</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                id="skillName"
                label="Skill Name *"
                placeholder="e.g. React, SQL, Leadership"
                error={errors.skillName?.message}
                {...register('skillName')}
              />
              <Select id="category" label="Category *" error={errors.category?.message} {...register('category')}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
              <Select id="proficiency" label="Proficiency (1–5)" {...register('proficiencyLevel', {valueAsNumber: true})}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} – {PROFICIENCY_LABELS[n]}</option>
                ))}
              </Select>
              <div className="flex items-end gap-2">
                <Button type="submit" className="flex-1" isLoading={addMut.isPending} loadingText="Saving…">
                  Save Skill
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        )}

        {!hasHydrated ? (
          skeleton
        ) : !employeeId ? (
          <div className="rounded-lg border border-border bg-card p-4">
            <EmptyState
              icon={<Zap className="h-8 w-8" aria-hidden="true"/>}
              title="No employee profile linked"
              description="Skill tracking will appear here once your account is linked to an employee profile."
            />
          </div>
        ) : (
          <QueryState
            query={skillsQuery}
            skeleton={skeleton}
            errorTitle="Couldn't load skills"
            isEmpty={(skills) => skills.length === 0}
            empty={{
              icon: <Zap className="h-8 w-8" aria-hidden="true"/>,
              title: 'No skills added yet',
              description: 'Add your first skill to build your professional profile and help your manager track your growth.',
              actionLabel: 'Add Skill',
              onAction: () => setShowForm(true),
            }}
          >
            {(skills) => (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {skills.map((skill) => (
                  <article key={skill.id} className="group rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium text-text-1">{skill.skillName}</span>
                          {skill.isVerified && <StatusBadge status="active" label="Verified"/>}
                        </div>
                        <p className="mt-0.5 text-xs text-text-2">{skill.category}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <ProficiencyStars level={skill.proficiencyLevel ?? 1}/>
                          <span className="text-xs text-text-2">{PROFICIENCY_LABELS[skill.proficiencyLevel ?? 1]}</span>
                        </div>
                        {skill.isVerified && skill.verifiedBy && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-text-2">
                            <Award className="h-3 w-3 shrink-0" aria-hidden="true"/>
                            Verified by {skill.verifiedBy}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => skill.id && setPendingDelete(skill)}
                        aria-label={`Remove ${skill.skillName}`}
                        className="hover:text-status-err-fg"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true"/>
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </QueryState>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.id) removeMut.mutate({skillId: pendingDelete.id});
        }}
        title="Remove skill"
        message={`Remove "${pendingDelete?.skillName ?? ''}" from your skills?`}
        confirmText="Remove"
        type="danger"
        loading={removeMut.isPending}
      />
    </AppLayout>
  );
}
