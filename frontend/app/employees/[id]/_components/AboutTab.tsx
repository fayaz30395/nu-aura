'use client';

import {SegmentedControl} from '@mantine/core';
import {MessageSquare} from 'lucide-react';
import CustomFieldsSection from '@/components/custom-fields/CustomFieldsSection';
import TalentJourneyTab from '@/components/employee/talent-profiles/TalentJourneyTab';
import {EmptyState} from '@/components/ui/EmptyState';
import {EntityType} from '@/lib/types/core/custom-fields';
import type {Employee} from '@/lib/types/hrms/employee';
import {ABOUT_SUB_TABS, type AboutSubTab} from '../_hooks/useEmployeeTabs';
import {formatDate, formatEnumValue, InfoField, InfoGrid, PersonLink, SectionCard} from './DetailPrimitives';
import {EmployeeSkillsCard} from './EmployeeSkillsCard';

const TEAM_PREVIEW = 8;

export function AboutTab({
  employee,
  subordinates,
  subTab,
  onSubTabChange,
}: {
  employee: Employee;
  subordinates: Employee[];
  subTab: AboutSubTab;
  onSubTabChange: (sub: AboutSubTab) => void;
}) {
  const org = employee.departmentName || 'organization';

  return (
    <div className="space-y-4">
      <SegmentedControl
        size="xs"
        value={subTab}
        onChange={(v) => onSubTabChange(v as AboutSubTab)}
        data={ABOUT_SUB_TABS.map((t) => ({value: t.key, label: t.label}))}
        aria-label="About sections"
      />

      {subTab === 'summary' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SectionCard title="About">
            <p className="text-sm leading-relaxed text-text-2">
              {employee.designation
                ? `${employee.fullName} is a ${formatEnumValue(employee.designation)} at the ${org}.`
                : `${employee.fullName} is a member of the ${org}.`}
              {employee.joiningDate && ` Joined on ${formatDate(employee.joiningDate)}.`}
            </p>
          </SectionCard>

          <SectionCard title="Professional Summary">
            <InfoGrid>
              <InfoField label="Job Role" value={formatEnumValue(employee.jobRole)}/>
              <InfoField label="Level" value={formatEnumValue(employee.level)}/>
              <InfoField label="Employment Type" value={formatEnumValue(employee.employmentType)}/>
              <InfoField label="Department" value={employee.departmentName}/>
            </InfoGrid>
          </SectionCard>

          <EmployeeSkillsCard employeeId={employee.id}/>

          <SectionCard title="Reporting Team">
            {subordinates.length > 0 ? (
              <ul className="space-y-3">
                {subordinates.slice(0, TEAM_PREVIEW).map((sub) => (
                  <li key={sub.id}>
                    <PersonLink id={sub.id} name={sub.fullName} subtitle={sub.designation || '-'}/>
                  </li>
                ))}
                {subordinates.length > TEAM_PREVIEW && (
                  <li className="text-xs text-text-3">+{subordinates.length - TEAM_PREVIEW} more</li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-text-3">No direct reports</p>
            )}
          </SectionCard>

          <SectionCard title="Additional Information" className="xl:col-span-2">
            <CustomFieldsSection
              entityType={EntityType.EMPLOYEE}
              entityId={employee.id}
              disabled={true}
              showGroupHeaders={true}
            />
          </SectionCard>

          <SectionCard title="System Information" className="xl:col-span-2">
            <InfoGrid columns={3}>
              <InfoField label="Created At" value={formatDate(employee.createdAt)}/>
              <InfoField label="Last Updated" value={formatDate(employee.updatedAt)}/>
              <InfoField label="Employee ID" value={employee.id}/>
              {employee.userId && <InfoField label="User ID" value={employee.userId}/>}
            </InfoGrid>
          </SectionCard>
        </div>
      )}

      {subTab === 'timeline' && <TalentJourneyTab employeeId={employee.id}/>}

      {subTab === 'wall' && (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={<MessageSquare className="h-full w-full"/>}
            title="Wall Activity"
            description={`Social feed posts, recognitions, and announcements involving ${employee.firstName} will appear here.`}
          />
        </div>
      )}
    </div>
  );
}
