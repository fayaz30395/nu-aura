'use client';

import React from 'react';
import { BookOpen, GraduationCap, Edit, Target } from 'lucide-react';

export type TabType = 'my-trainings' | 'catalog' | 'growth-roadmap' | 'manage';

interface TrainingTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TrainingTabs({ activeTab, onTabChange }: TrainingTabsProps) {
  const activeClass =
    'text-accent-700 dark:text-accent-400 border-b-2 border-accent-500';
  const inactiveClass =
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)]';

  return (
    <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm">
      <div className="flex border-b border-[var(--border-main)]">
        <button
          onClick={() => onTabChange('my-trainings')}
          className={`px-6 py-4 font-medium transition-colors ${activeTab === 'my-trainings' ? activeClass : inactiveClass}`}
        >
          <BookOpen className="h-4 w-4 inline-block mr-2" />
          My Trainings
        </button>
        <button
          onClick={() => onTabChange('catalog')}
          className={`px-6 py-4 font-medium transition-colors ${activeTab === 'catalog' ? activeClass : inactiveClass}`}
        >
          <GraduationCap className="h-4 w-4 inline-block mr-2" />
          Course Catalog
        </button>
        <button
          onClick={() => onTabChange('manage')}
          className={`px-6 py-4 font-medium transition-colors ${activeTab === 'manage' ? activeClass : inactiveClass}`}
        >
          <Edit className="h-4 w-4 inline-block mr-2" />
          Manage Programs
        </button>
        <button
          onClick={() => onTabChange('growth-roadmap')}
          className={`px-6 py-4 font-medium transition-colors ${activeTab === 'growth-roadmap' ? activeClass : inactiveClass}`}
        >
          <Target className="h-4 w-4 inline-block mr-2" />
          Growth Roadmap
        </button>
      </div>
    </div>
  );
}
