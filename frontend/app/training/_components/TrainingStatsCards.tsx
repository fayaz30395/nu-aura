'use client';

import React from 'react';
import {Award, BookOpen, GraduationCap, PlayCircle} from 'lucide-react';
import {Card, CardContent} from '@/components/ui';
import {Stat} from '@/components/ui/Stat';

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
          <Stat
            label="My Enrollments"
            value={stats.myEnrolled}
            tone="accent"
            icon={<BookOpen className="h-3.5 w-3.5"/>}
          />
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <Stat
            label="In Progress"
            value={stats.myInProgress}
            tone="warning"
            icon={<PlayCircle className="h-3.5 w-3.5"/>}
          />
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <Stat
            label="Completed"
            value={stats.myCompleted}
            tone="success"
            icon={<Award className="h-3.5 w-3.5"/>}
          />
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <Stat
            label="Available Programs"
            value={stats.total}
            tone="default"
            icon={<GraduationCap className="h-3.5 w-3.5"/>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
