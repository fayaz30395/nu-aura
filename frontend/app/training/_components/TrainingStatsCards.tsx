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
            <div className='rounded-lg bg-accent-subtle p-4'>
              <BookOpen className='h-6 w-6 text-accent'/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">My Enrollments</p>
              <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myEnrolled}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className='rounded-lg bg-status-warning-bg p-4'>
              <PlayCircle className='h-6 w-6 text-status-warning-text'/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">In Progress</p>
              <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myInProgress}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className='rounded-lg bg-status-success-bg p-4'>
              <Award className='h-6 w-6 text-status-success-text'/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">Completed</p>
              <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.myCompleted}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="skeuo-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className='rounded-lg bg-accent p-4'>
              <GraduationCap className='h-6 w-6 text-inverse'/>
            </div>
            <div>
              <p className="text-body-secondary skeuo-deboss">Available Programs</p>
              <p className="text-xl font-bold text-[var(--text-primary)] skeuo-emboss">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
