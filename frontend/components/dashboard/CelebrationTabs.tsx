'use client';

import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {useNewJoinees, useUpcomingAnniversaries, useUpcomingBirthdays} from '@/lib/hooks/queries/useHome';

type TabType = 'birthdays' | 'anniversaries' | 'newJoiners';

function AvatarInitials({name}: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xs font-semibold text-[var(--text-secondary)]  ">
      {initials}
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-2 py-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2.5 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-[var(--bg-surface)]"/>
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-28 rounded bg-[var(--bg-surface)]"/>
            <div className="h-3 w-20 rounded bg-[var(--bg-surface)]"/>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CelebrationTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('birthdays');
  const [isExpanded, setIsExpanded] = useState(true);

  // Use React Query hooks — 14 days for birthdays and anniversaries, 30 for new joiners
  const {data: birthdays = [], isLoading: birthdaysLoading, isError: birthdaysError} = useUpcomingBirthdays(14);
  const {
    data: anniversaries = [],
    isLoading: anniversariesLoading,
    isError: anniversariesError
  } = useUpcomingAnniversaries(14);
  const {data: newJoiners = [], isLoading: newJoinersLoading, isError: newJoinersError} = useNewJoinees(30);

  const isLoading = birthdaysLoading || anniversariesLoading || newJoinersLoading;
  const hasError = birthdaysError || anniversariesError || newJoinersError;

  const birthdayCount = birthdays.length;
  const anniversaryCount = anniversaries.length;
  const newJoinerCount = newJoiners.length;
  const totalCount = birthdayCount + anniversaryCount + newJoinerCount;

  if (totalCount === 0 && !isLoading && !hasError) {
    return (
      <div className="skeuo-card rounded-lg border border-[var(--border-main)] p-4">
        <p className="text-center text-caption">No celebrations this week</p>
      </div>
    );
  }

  const tabItems: { key: TabType; label: string; count: number }[] = [
    {key: 'birthdays', label: 'Birthdays', count: birthdayCount},
    {key: 'anniversaries', label: 'Anniversaries', count: anniversaryCount},
    {key: 'newJoiners', label: 'New Joiners', count: newJoinerCount},
  ];

  return (
    <div className="skeuo-card rounded-lg border border-[var(--border-main)]">
      {/* Tab Navigation */}
      <div className="row-between border-b border-[var(--border-main)]">
        <div className="flex">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded ${
                activeTab === tab.key
                  ? 'border-b-2 border-accent-500 text-[var(--text-primary)]'
                  : 'border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:text-[var(--text-muted)]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-caption">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mr-4 rounded p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2"
          aria-label="Toggle celebration expansion"
        >
          <ChevronDown size={16} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-2">
          {isLoading ? (
            <SkeletonLoader/>
          ) : hasError ? (
            <div className="py-4 flex flex-col items-center gap-2 text-center">
              <p className="text-caption">Failed to load celebrations</p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-accent-500 hover:text-accent-400 font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 rounded"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'birthdays' && birthdayCount > 0 && (
                <div className="space-y-1">
                  {birthdays.map((person) => (
                    <div key={person.employeeId}
                         className="flex items-center gap-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface)]  px-1 transition-colors">
                      <AvatarInitials name={person.employeeName}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{person.employeeName}</p>
                        <p className="text-caption truncate">{person.department}</p>
                      </div>
                      <span
                        className="whitespace-nowrap rounded bg-[var(--bg-surface)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]  dark:text-[var(--text-muted)]">
                        {person.isToday ? 'Today' : `In ${person.daysUntil}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'anniversaries' && anniversaryCount > 0 && (
                <div className="space-y-1">
                  {anniversaries.map((person) => (
                    <div key={person.employeeId}
                         className="flex items-center gap-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface)]  px-1 transition-colors">
                      <AvatarInitials name={person.employeeName}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{person.employeeName}</p>
                        <p className="text-caption truncate">{person.department}</p>
                      </div>
                      <span
                        className="whitespace-nowrap rounded bg-[var(--bg-surface)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]  dark:text-[var(--text-muted)]">
                        {person.isToday ? 'Today' : `In ${person.daysUntil}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'newJoiners' && newJoinerCount > 0 && (
                <div className="space-y-1">
                  {newJoiners.map((person) => (
                    <div key={person.employeeId}
                         className="flex items-center gap-2.5 py-2 rounded-lg hover:bg-[var(--bg-surface)]  px-1 transition-colors">
                      <AvatarInitials name={person.employeeName}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{person.employeeName}</p>
                        <p className="text-caption truncate">{person.department}</p>
                      </div>
                      <span
                        className="whitespace-nowrap rounded bg-[var(--bg-surface)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]  dark:text-[var(--text-muted)]">
                        {person.daysSinceJoining}d ago
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty states */}
              {activeTab === 'birthdays' && birthdayCount === 0 && (
                <div className="py-4 text-center text-caption">No upcoming birthdays</div>
              )}
              {activeTab === 'anniversaries' && anniversaryCount === 0 && (
                <div className="py-4 text-center text-caption">No upcoming anniversaries</div>
              )}
              {activeTab === 'newJoiners' && newJoinerCount === 0 && (
                <div className="py-4 text-center text-caption">No new joiners</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
