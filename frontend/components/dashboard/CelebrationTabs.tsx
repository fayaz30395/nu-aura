'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { homeService, BirthdayResponse, WorkAnniversaryResponse, NewJoineeResponse } from '@/lib/services/home.service';

type TabType = 'birthdays' | 'anniversaries' | 'newJoiners';

interface TabState {
  birthdays: BirthdayResponse[];
  anniversaries: WorkAnniversaryResponse[];
  newJoiners: NewJoineeResponse[];
  isLoading: boolean;
  error: string | null;
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      {initials}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-2 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-28 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CelebrationTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('birthdays');
  const [isExpanded, setIsExpanded] = useState(true);
  const [state, setState] = useState<TabState>({
    birthdays: [], anniversaries: [], newJoiners: [], isLoading: true, error: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const [birthdays, anniversaries, newJoiners] = await Promise.all([
          homeService.getUpcomingBirthdays(14),
          homeService.getUpcomingAnniversaries(14),
          homeService.getNewJoinees(30),
        ]);
        setState({ birthdays: birthdays || [], anniversaries: anniversaries || [], newJoiners: newJoiners || [], isLoading: false, error: null });
      } catch {
        setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load celebrations' }));
      }
    };
    fetchData();
  }, []);

  const birthdayCount = state.birthdays.length;
  const anniversaryCount = state.anniversaries.length;
  const newJoinerCount = state.newJoiners.length;
  const totalCount = birthdayCount + anniversaryCount + newJoinerCount;

  if (totalCount === 0 && !state.isLoading && !state.error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-center text-xs text-gray-400">No celebrations this week</p>
      </div>
    );
  }

  const tabItems: { key: TabType; label: string; count: number }[] = [
    { key: 'birthdays', label: 'Birthdays', count: birthdayCount },
    { key: 'anniversaries', label: 'Anniversaries', count: anniversaryCount },
    { key: 'newJoiners', label: 'New Joiners', count: newJoinerCount },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-gray-900 text-gray-900 dark:border-white dark:text-white'
                  : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-gray-400">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mr-3 rounded p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-2">
          {state.isLoading ? (
            <SkeletonLoader />
          ) : state.error ? (
            <div className="py-4 text-center text-xs text-gray-400">{state.error}</div>
          ) : (
            <>
              {activeTab === 'birthdays' && birthdayCount > 0 && (
                <div className="space-y-1">
                  {state.birthdays.map((person) => (
                    <div key={person.employeeId} className="flex items-center gap-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 px-1 transition-colors">
                      <AvatarInitials name={person.employeeName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{person.employeeName}</p>
                        <p className="text-xs text-gray-400 truncate">{person.department}</p>
                      </div>
                      <span className="whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {person.isToday ? 'Today' : `In ${person.daysUntil}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'anniversaries' && anniversaryCount > 0 && (
                <div className="space-y-1">
                  {state.anniversaries.map((person) => (
                    <div key={person.employeeId} className="flex items-center gap-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 px-1 transition-colors">
                      <AvatarInitials name={person.employeeName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{person.employeeName}</p>
                        <p className="text-xs text-gray-400 truncate">{person.department}</p>
                      </div>
                      <span className="whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {person.isToday ? 'Today' : `In ${person.daysUntil}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'newJoiners' && newJoinerCount > 0 && (
                <div className="space-y-1">
                  {state.newJoiners.map((person) => (
                    <div key={person.employeeId} className="flex items-center gap-2.5 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 px-1 transition-colors">
                      <AvatarInitials name={person.employeeName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate">{person.employeeName}</p>
                        <p className="text-xs text-gray-400 truncate">{person.department}</p>
                      </div>
                      <span className="whitespace-nowrap rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {person.daysSinceJoining}d ago
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty states */}
              {activeTab === 'birthdays' && birthdayCount === 0 && (
                <div className="py-4 text-center text-xs text-gray-400">No upcoming birthdays</div>
              )}
              {activeTab === 'anniversaries' && anniversaryCount === 0 && (
                <div className="py-4 text-center text-xs text-gray-400">No upcoming anniversaries</div>
              )}
              {activeTab === 'newJoiners' && newJoinerCount === 0 && (
                <div className="py-4 text-center text-xs text-gray-400">No new joiners</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
