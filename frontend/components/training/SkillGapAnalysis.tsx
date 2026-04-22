'use client';

import React from 'react';
import {AlertTriangle, ArrowUpRight, BookOpen, Loader2, RefreshCw, Target} from 'lucide-react';
import {Badge, Button, Card, CardContent} from '@/components/ui';
import {useSkillGaps} from '@/lib/hooks/queries/useLearning';

interface SkillGapAnalysisProps {
  employeeId: string;
}

export const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({employeeId}) => {
  const {data: report, isLoading, isError, error: _error, refetch} = useSkillGaps(employeeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className='h-8 w-8 animate-spin text-accent'/>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className='h-8 w-8 text-status-warning-text mx-auto mb-4'/>
          <p className='text-secondary mb-4'>
            Failed to load skill gap analysis.
          </p>
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4"/>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className='p-8 text-center text-secondary'>
          No skill gap data found for this employee.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="row-between">
        <div>
          <h2 className='text-xl font-bold text-primary flex items-center gap-2'>
            <Target className='h-5 w-5 text-accent'/>
            Growth Roadmap: {report.employeeName}
          </h2>
          <p className='text-sm text-secondary'>
            {report.department} • Personalized skill gap analysis and recommendations
          </p>
        </div>
      </div>
      <div className="grid gap-4">
        {report.gaps.map((gap, index) => (
          <Card key={index}
                className={`overflow-hidden border-l-4 ${gap.gapLevel === 'CRITICAL' ? 'border-l-danger-500' :
                  gap.gapLevel === 'MODERATE' ? 'border-l-warning-500' : 'border-l-accent-500'
                }`}>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className='font-bold text-primary'>{gap.skillName}</h3>
                    <Badge variant={
                      gap.gapLevel === 'CRITICAL' ? 'danger' :
                        gap.gapLevel === 'MODERATE' ? 'warning' : 'info'
                    } size="sm">
                      {gap.gapLevel}
                    </Badge>
                  </div>

                  {/* Skill level indicator */}
                  <div className="flex items-center gap-4">
                    <div className='flex-1 bg-surface rounded-full h-2.5 max-w-xs relative'>
                      <div
                        className='bg-accent h-2.5 rounded-full z-10 relative'
                        style={{width: `${(gap.currentLevel / 5) * 100}%`}}
                      />
                      <div
                        className='absolute top-0 h-2.5 border-r-2 border-default z-20'
                        style={{left: `${(gap.requiredLevel / 5) * 100}%`, height: '140%', top: '-20%'}}
                      />
                    </div>
                    <span className='text-xs font-medium text-secondary'>
                                            Level {gap.currentLevel} / {gap.requiredLevel} target
                                        </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[250px]">
                  <p className='text-xs font-semibold text-muted uppercase tracking-wider'>Recommended
                    Learning</p>
                  {gap.recommendedCourses.map((course) => (
                    <div key={course.courseId}
                         className='group row-between p-2 rounded-lg bg-base border border-transparent hover:border-[var(--accent-primary)] transition-all'>
                      <div className="flex items-center gap-2">
                        <BookOpen className='h-3.5 w-3.5 text-accent'/>
                        <span className="text-sm font-medium line-clamp-1">{course.title}</span>
                      </div>
                      <Badge variant="outline" size="sm" className="whitespace-nowrap">{course.difficulty}</Badge>
                    </div>
                  ))}
                  {gap.recommendedCourses.length === 0 && (
                    <p className='text-xs italic text-muted'>No specific courses found for this skill yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className='bg-accent-subtle border-[var(--accent-primary)]'>
        <CardContent className="p-4 flex items-center gap-4">
          <div className='bg-accent rounded-full p-2'>
            <ArrowUpRight className='h-5 w-5 text-inverse'/>
          </div>
          <div>
            <h4 className='font-semibold text-accent'>Unlock your potential</h4>
            <p className='text-sm text-accent'>
              Closing these gaps will prepare you for the <strong>Senior Engineer</strong> role transition.
            </p>
          </div>
          <Button variant="outline" className='ml-auto border-[var(--accent-primary)] text-accent'
                  onClick={() => window.location.href = '/training'}>
            Explore Catalog
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
