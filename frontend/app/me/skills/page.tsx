'use client';

import React, {useState} from 'react';
import {Award, Plus, Star, Trash2, Zap} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import {AppLayout} from '@/components/layout';
import {Card, CardContent} from '@/components/ui/Card';
import {EmptyState} from '@/components/ui/EmptyState';
import {SkeletonTable} from '@/components/ui/Skeleton';
import {StatusBadge} from '@/components/ui/StatusBadge';
import {useAuth} from '@/lib/hooks/useAuth';
import {
  useGetEmployeeSkills,
  useAddOrUpdateSkill,
  useRemoveSkill,
  getGetEmployeeSkillsQueryKey,
} from '@/lib/generated/api/employee-skills/employee-skills';
import type {AddSkillRequest} from '@/lib/generated/api/model';

const CATEGORIES = ['Technical', 'Soft Skills', 'Domain', 'Leadership', 'Tool', 'Language', 'Other'];
const PROFICIENCY_LABELS: Record<number, string> = {
  1: 'Beginner',
  2: 'Elementary',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

function ProficiencyStars({level}: {level: number}) {
  return (
    <div className="flex gap-0.5" aria-label={`Proficiency: ${PROFICIENCY_LABELS[level] ?? level}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= level ? 'fill-warning-500 text-warning-500' : 'text-[var(--border)]'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

const EMPTY_FORM: AddSkillRequest = {skillName: '', category: 'Technical', proficiencyLevel: 3};

export default function MySkillsPage() {
  const {user, hasHydrated} = useAuth();
  const employeeId = user?.employeeId ?? '';
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddSkillRequest>(EMPTY_FORM);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const skillsQuery = useGetEmployeeSkills(employeeId, {query: {enabled: !!employeeId}});
  const skills = skillsQuery.data ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: getGetEmployeeSkillsQueryKey(employeeId)});

  const addMut = useAddOrUpdateSkill({
    mutation: {
      onSuccess: () => {
        invalidate();
        setShowForm(false);
        setForm(EMPTY_FORM);
      },
    },
  });

  const removeMut = useRemoveSkill({
    mutation: {onSuccess: () => {invalidate(); setDeletingId(null);}},
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.skillName.trim() || !employeeId) return;
    addMut.mutate({employeeId, data: form});
  };

  const handleDelete = (skillId: string) => {
    setDeletingId(skillId);
    removeMut.mutate({skillId});
  };

  const isLoading = !hasHydrated || skillsQuery.isLoading;

  return (
    <AppLayout activeMenuItem="my-skills">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">My Skills</h1>
            <p className="text-[var(--text-secondary)] mt-1">
              Track and showcase your professional skills.
            </p>
          </div>
          {!!employeeId && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors"
            >
              <Plus className="h-4 w-4" aria-hidden="true"/>
              Add Skill
            </button>
          )}
        </div>

        {showForm && (
          <Card className="card-aura">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Add / Update Skill</h2>
              <form onSubmit={handleAdd} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="skillName" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Skill Name *
                  </label>
                  <input
                    id="skillName"
                    type="text"
                    required
                    value={form.skillName}
                    onChange={(e) => setForm((f) => ({...f, skillName: e.target.value}))}
                    placeholder="e.g. React, SQL, Leadership"
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Category *
                  </label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => setForm((f) => ({...f, category: e.target.value}))}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="proficiency" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Proficiency (1–5)
                  </label>
                  <select
                    id="proficiency"
                    value={form.proficiencyLevel}
                    onChange={(e) => setForm((f) => ({...f, proficiencyLevel: Number(e.target.value)}))}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} – {PROFICIENCY_LABELS[n]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={addMut.isPending}
                    className="flex-1 rounded-md bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors"
                  >
                    {addMut.isPending ? 'Saving…' : 'Save Skill'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {setShowForm(false); setForm(EMPTY_FORM);}}
                    className="rounded-md border border-[var(--border)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <SkeletonTable rows={4} columns={4}/>
        ) : !employeeId ? (
          <Card className="card-aura">
            <CardContent className="py-12">
              <EmptyState
                icon={<Zap className="h-8 w-8" aria-hidden="true"/>}
                title="No employee profile linked"
                description="Skill tracking will appear here once your account is linked to an employee profile."
              />
            </CardContent>
          </Card>
        ) : skills.length === 0 ? (
          <Card className="card-aura">
            <CardContent className="py-12">
              <EmptyState
                icon={<Zap className="h-8 w-8" aria-hidden="true"/>}
                title="No skills added yet"
                description="Add your first skill to build your professional profile and help your manager track your growth."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {skills.map((skill) => (
              <Card key={skill.id} className="card-aura group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-[var(--text-primary)] truncate">
                          {skill.skillName}
                        </span>
                        {skill.isVerified && (
                          <StatusBadge status="active" label="Verified"/>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{skill.category}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <ProficiencyStars level={skill.proficiencyLevel ?? 1}/>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {PROFICIENCY_LABELS[skill.proficiencyLevel ?? 1]}
                        </span>
                      </div>
                      {skill.isVerified && skill.verifiedBy && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                          <Award className="h-3 w-3 flex-shrink-0" aria-hidden="true"/>
                          Verified by {skill.verifiedBy}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => skill.id && handleDelete(skill.id)}
                      disabled={deletingId === skill.id}
                      aria-label={`Remove ${skill.skillName}`}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-md text-[var(--text-secondary)] hover:text-error-600 hover:bg-error-50 disabled:opacity-30 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true"/>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
