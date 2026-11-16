'use client';

import {Button, Skeleton} from '@mantine/core';
import {useQueryClient} from '@tanstack/react-query';
import {CheckCircle2, Star} from 'lucide-react';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {
  getGetEmployeeSkillsQueryKey,
  useGetEmployeeSkills,
  useVerifySkill,
} from '@/lib/generated/api/employee-skills/employee-skills';
import {Permissions} from '@/lib/hooks/usePermissions';
import {SectionCard} from './DetailPrimitives';

export function EmployeeSkillsCard({employeeId}: {employeeId: string}) {
  const queryClient = useQueryClient();
  const {data: skills = [], isLoading} = useGetEmployeeSkills(employeeId, {
    query: {enabled: !!employeeId},
  });
  const verifySkill = useVerifySkill({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({queryKey: getGetEmployeeSkillsQueryKey(employeeId)}),
    },
  });

  return (
    <SectionCard title="Skills">
      {isLoading ? (
        <div className="space-y-2" aria-hidden="true">
          {[1, 2, 3].map((n) => <Skeleton key={n} height={24} radius="sm"/>)}
        </div>
      ) : skills.length === 0 ? (
        <p className="text-sm text-text-3">No skills on record</p>
      ) : (
        <ul className="divide-y divide-border">
          {skills.map((skill) => (
            <li key={skill.id ?? skill.skillName} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-text-1">{skill.skillName}</span>
                  {skill.isVerified && (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" aria-label="Verified"/>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="flex" aria-label={`Proficiency ${skill.proficiencyLevel ?? 1} of 5`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3 w-3 ${n <= (skill.proficiencyLevel ?? 1) ? 'fill-warning-500 text-warning-500' : 'text-border'}`}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                  {skill.category && <span className="truncate text-xs text-text-2">{skill.category}</span>}
                </div>
              </div>
              {!skill.isVerified && (
                <PermissionGate permission={Permissions.EMPLOYEE_UPDATE}>
                  <Button
                    size="compact-xs"
                    variant="light"
                    onClick={() => skill.id && verifySkill.mutate({skillId: skill.id})}
                    disabled={verifySkill.isPending}
                    aria-label={`Verify ${skill.skillName}`}
                  >
                    Verify
                  </Button>
                </PermissionGate>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
