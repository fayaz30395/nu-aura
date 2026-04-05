'use client';

import React from 'react';
import {Award, BookOpen, GraduationCap, PlayCircle} from 'lucide-react';
import {Card, CardContent} from '@/components/ui';

export interface TrainingStats {
  total: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  myEnrolled: number;
  myInProgress: number;
  myCompleted: number;
}

interface TrainingStatsCardsProps {
  stats: TrainingStats;
}

export function TrainingStatsCards({stats}: TrainingStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-accent-100 p-4 dark:bg-accent-900">
              <BookOpen className="h-6 w-6 text-accent-600 dark:text-accent-400"/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">My Enrollments</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myEnrolled}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-warning-100 p-4 dark:bg-warning-900">
              <PlayCircle className="h-6 w-6 text-warning-600 dark:text-warning-400"/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">In Progress</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myInProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-success-100 p-4 dark:bg-success-900">
              <Award className="h-6 w-6 text-success-600 dark:text-success-400"/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">Completed</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myCompleted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-accent-700 p-4 dark:bg-accent-800">
              <GraduationCap className="h-6 w-6 text-white dark:text-accent-200"/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">Available Programs</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
