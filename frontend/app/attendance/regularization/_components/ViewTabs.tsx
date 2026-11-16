'use client';

import {Tabs} from '@mantine/core';

type ActiveTab = 'my-requests' | 'team-requests';

interface ViewTabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  canApprove: boolean;
}

export function ViewTabs({activeTab, onTabChange, canApprove}: ViewTabsProps) {
  return (
    <Tabs value={activeTab} onChange={(v) => v && onTabChange(v as ActiveTab)}>
      <Tabs.List>
        <Tabs.Tab value="my-requests">My Requests</Tabs.Tab>
        {canApprove && <Tabs.Tab value="team-requests">Team Requests</Tabs.Tab>}
      </Tabs.List>
    </Tabs>
  );
}
