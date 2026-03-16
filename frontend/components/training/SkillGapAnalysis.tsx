'use client';

import React, { useState, useEffect } from 'react';
import {
    Target,
    ArrowUpRight,
    BookOpen,
    Loader2
} from 'lucide-react';
import {
    Card,
    CardContent,
    Button,
    Badge
} from '@/components/ui';
import { lmsService, SkillGapReport } from '@/lib/services/lms.service';

interface SkillGapAnalysisProps {
    employeeId: string;
}

export const SkillGapAnalysis: React.FC<SkillGapAnalysisProps> = ({ employeeId }) => {
    const [report, setReport] = useState<SkillGapReport | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGaps = async () => {
            setLoading(true);
            try {
                const data = await lmsService.getSkillGaps(employeeId);
                setReport(data);
            } catch (err) {
                console.error('Error fetching skill gaps:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchGaps();
    }, [employeeId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary-500" />
                        Growth Roadmap: {report.employeeName}
                    </h2>
                    <p className="text-sm text-surface-600 dark:text-surface-400">
                        {report.department} • Personalized skill gap analysis and recommendations
                    </p>
                </div>
            </div>

            <div className="grid gap-4">
                {report.gaps.map((gap, index) => (
                    <Card key={index} className={`overflow-hidden border-l-4 ${gap.gapLevel === 'CRITICAL' ? 'border-l-red-500' :
                        gap.gapLevel === 'MODERATE' ? 'border-l-amber-500' : 'border-l-blue-500'
                        }`}>
                        <CardContent className="p-5">
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
                                                className="bg-primary-500 h-2.5 rounded-full z-10 relative"
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
                                        <div key={course.courseId} className="group flex items-center justify-between p-2 rounded-lg bg-surface-50 dark:bg-surface-900 border border-transparent hover:border-primary-200 transition-all">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-3.5 w-3.5 text-primary-500" />
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

            <Card className="bg-primary-50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-900">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-primary-500 rounded-full p-2">
                        <ArrowUpRight className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-primary-900 dark:text-primary-100">Unlock your potential</h4>
                        <p className="text-sm text-primary-700 dark:text-primary-300">
                            Closing these gaps will prepare you for the <strong>Senior Engineer</strong> role transition.
                        </p>
                    </div>
                    <Button variant="outline" className="ml-auto border-primary-200 text-primary-700" onClick={() => window.location.href = '/training'}>
                        Explore Catalog
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
