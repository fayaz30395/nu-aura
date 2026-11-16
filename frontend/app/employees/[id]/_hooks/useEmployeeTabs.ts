'use client';

import {useState} from 'react';
import {useSearchParams} from 'next/navigation';

export type MainTab = 'about' | 'profile' | 'job' | 'documents' | 'assets';
export type AboutSubTab = 'summary' | 'timeline' | 'wall';
export type AssetSubTab = 'assigned' | 'requests' | 'damages';

export const MAIN_TABS: {key: MainTab; label: string}[] = [
  {key: 'about', label: 'About'},
  {key: 'profile', label: 'Profile'},
  {key: 'job', label: 'Job'},
  {key: 'documents', label: 'Documents'},
  {key: 'assets', label: 'Assets'},
];

export const ABOUT_SUB_TABS: {key: AboutSubTab; label: string}[] = [
  {key: 'summary', label: 'Summary'},
  {key: 'timeline', label: 'Timeline'},
  {key: 'wall', label: 'Wall Activity'},
];

export const ASSET_SUB_TABS: {key: AssetSubTab; label: string}[] = [
  {key: 'assigned', label: 'Assigned Assets'},
  {key: 'requests', label: 'Asset Requests'},
  {key: 'damages', label: 'Damage Charges'},
];

function pick<T extends string>(value: string | null, options: {key: T}[], fallback: T): T {
  return options.some((o) => o.key === value) ? (value as T) : fallback;
}

// replaceState (not router.replace) keeps tab switches out of history and avoids a route re-render.
function syncUrl(tab: MainTab, sub?: string) {
  const url = new URL(window.location.href);
  url.searchParams.set('tab', tab);
  if (sub) url.searchParams.set('sub', sub);
  else url.searchParams.delete('sub');
  window.history.replaceState({}, '', url.toString());
}

export function useEmployeeTabs() {
  const searchParams = useSearchParams();
  const initialSub = searchParams.get('sub');
  const [currentTab, setCurrentTab] = useState<MainTab>(() => pick(searchParams.get('tab'), MAIN_TABS, 'about'));
  const [aboutSubTab, setAboutSubTab] = useState<AboutSubTab>(() => pick(initialSub, ABOUT_SUB_TABS, 'summary'));
  const [assetSubTab, setAssetSubTab] = useState<AssetSubTab>(() => pick(initialSub, ASSET_SUB_TABS, 'assigned'));

  return {
    currentTab,
    aboutSubTab,
    assetSubTab,
    selectMainTab: (tab: MainTab) => {
      setCurrentTab(tab);
      syncUrl(tab);
    },
    selectAboutSubTab: (sub: AboutSubTab) => {
      setAboutSubTab(sub);
      syncUrl('about', sub);
    },
    selectAssetSubTab: (sub: AssetSubTab) => {
      setAssetSubTab(sub);
      syncUrl('assets', sub);
    },
  };
}
