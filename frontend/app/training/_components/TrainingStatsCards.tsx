'use client';

import React from 'react';
import { BookOpen, PlayCircle, Award, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';

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

export function TrainingStatsCards({ stats }: TrainingStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-blue-100 p-4 dark:bg-blue-900">
              <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">My Enrollments</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myEnrolled}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-amber-100 p-4 dark:bg-amber-900">
              <PlayCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">In Progress</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myInProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-green-100 p-4 dark:bg-green-900">
              <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Completed</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myCompleted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-purple-100 p-4 dark:bg-purple-900">
              <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)] skeuo-deboss">Available Programs</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
