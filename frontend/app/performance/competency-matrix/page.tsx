'use client';

import {useState} from 'react';
import {Tabs} from '@mantine/core';
import {Info, Shield, Target, Users} from 'lucide-react';
import {AppLayout} from '@/components/layout';
import {EmptyState} from '@/components/ui/EmptyState';
import {PageHeader} from '@/components/ui/PageHeader';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {Permissions} from '@/lib/hooks/usePermissions';
import {useAuth} from '@/lib/hooks/useAuth';
import {FrameworkAdminTab} from './_components/FrameworkAdminTab';
import {MyCompetenciesTab} from './_components/MyCompetenciesTab';
import {TeamViewTab} from './_components/TeamViewTab';

function LoginRequired({message}: {message: string}) {
  return <EmptyState icon={<Info className="h-8 w-8"/>} title={message}/>;
}

export default function CompetencyMatrixPage() {
  const {user} = useAuth();
  const employeeId = user?.employeeId || '';
  const [activeTab, setActiveTab] = useState<string | null>('my-competencies');

  return (
    <AppLayout
      activeMenuItem="competency-matrix"
      breadcrumbs={[{label: 'Performance', href: '/performance'}, {label: 'Competency Matrix'}]}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 sm:p-6">
        <PageHeader
          title="Competency Matrix"
          description="Manage competency frameworks, assess skills, and identify gaps"
        />

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="lg">
            <Tabs.Tab value="my-competencies" leftSection={<Target className="h-4 w-4"/>}>
              My Competencies
            </Tabs.Tab>
            <PermissionGate permission={Permissions.REVIEW_VIEW} fallback={null}>
              <Tabs.Tab value="team-view" leftSection={<Users className="h-4 w-4"/>}>
                Team View
              </Tabs.Tab>
            </PermissionGate>
            <PermissionGate permission={Permissions.REVIEW_VIEW} fallback={null}>
              <Tabs.Tab value="framework" leftSection={<Shield className="h-4 w-4"/>}>
                Competency Framework
              </Tabs.Tab>
            </PermissionGate>
          </Tabs.List>

          <Tabs.Panel value="my-competencies">
            {employeeId ? (
              <MyCompetenciesTab employeeId={employeeId}/>
            ) : (
              <LoginRequired message="Please log in to view your competencies."/>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="team-view">
            {employeeId ? (
              <TeamViewTab managerId={employeeId}/>
            ) : (
              <LoginRequired message="Please log in to view team competencies."/>
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
