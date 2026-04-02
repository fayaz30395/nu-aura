'use client';

import React from 'react';
import {
    Target,
    ArrowUpRight,
    BookOpen,
    Loader2,
    RefreshCw,
    AlertTriangle
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Badge
} from '@/components/ui';
import { useSkillGaps } from '@/lib/hooks/queries/useLearning';

interface SkillGapAnalysisProps {
    employeeId: string;
}

export const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({ employeeId }) => {
    const { data: report, isLoading, isError, error: _error, refetch } = useSkillGaps(employeeId);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <AlertTriangle className="h-8 w-8 text-warning-500 mx-auto mb-3" />
                    <p className="text-surface-600 dark:text-surface-400 mb-4">
                        Failed to load skill gap analysis.
                    </p>
                    <Button variant="outline" onClick={() => refetch()} className="gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </Button>
                </CardContent>
            </Card>
        );
    }

    if (!report) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-surface-600 dark:text-surface-400">
                    No skill gap data found for this employee.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="row-between">
                <div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-accent-500" />
                        Growth Roadmap: {report.employeeName}
                    </h2>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        {report.department} • Personalized skill gap analysis and recommendations
                    </p>
                </div>
            </div>

            <div className="grid gap-4">
                {report.gaps.map((gap, index) => (
                    <Card key={index} className={`overflow-hidden border-l-4 ${gap.gapLevel === 'CRITICAL' ? 'border-l-danger-500' :
                        gap.gapLevel === 'MODERATE' ? 'border-l-warning-500' : 'border-l-accent-500'
                        }`}>
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-surface-900 dark:text-white">{gap.skillName}</h3>
                                        <Badge variant={
                                            gap.gapLevel === 'CRITICAL' ? 'danger' :
                                                gap.gapLevel === 'MODERATE' ? 'warning' : 'info'
                                        } size="sm">
                                            {gap.gapLevel}
                                        </Badge>
                                    </div>

                                    {/* Skill level indicator */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 bg-surface-100 dark:bg-surface-800 rounded-full h-2.5 max-w-xs relative">
                                            <div
                                                className="bg-accent-500 h-2.5 rounded-full z-10 relative"
                                                style={{ width: `${(gap.currentLevel / 5) * 100}%` }}
                                            />
                                            <div
                                                className="absolute top-0 h-2.5 border-r-2 border-surface-400 dark:border-surface-500 z-20"
                                                style={{ left: `${(gap.requiredLevel / 5) * 100}%`, height: '140%', top: '-20%' }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
                                            Level {gap.currentLevel} / {gap.requiredLevel} target
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 min-w-[250px]">
                                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Recommended Learning</p>
                                    {gap.recommendedCourses.map((course) => (
                                        <div key={course.courseId} className="group row-between p-2 rounded-lg bg-surface-50 dark:bg-surface-900 border border-transparent hover:border-accent-200 transition-all">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-3.5 w-3.5 text-accent-500" />
                                                <span className="text-sm font-medium line-clamp-1">{course.title}</span>
                                            </div>
                                            <Badge variant="outline" size="sm" className="whitespace-nowrap">{course.difficulty}</Badge>
                                        </div>
                                    ))}
                                    {gap.recommendedCourses.length === 0 && (
                                        <p className="text-xs italic text-surface-400">No specific courses found for this skill yet.</p>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="bg-accent-50 dark:bg-accent-900/10 border-accent-100 dark:border-accent-900">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-accent-500 rounded-full p-2">
                        <ArrowUpRight className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-accent-900 dark:text-accent-100">Unlock your potential</h4>
                        <p className="text-sm text-accent-700 dark:text-accent-300">
                            Closing these gaps will prepare you for the <strong>Senior Engineer</strong> role transition.
                        </p>
                    </div>
                    <Button variant="outline" className="ml-auto border-accent-200 text-accent-700" onClick={() => window.location.href = '/training'}>
                        Explore Catalog
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
