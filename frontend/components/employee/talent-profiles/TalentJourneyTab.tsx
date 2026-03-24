'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Award,
    Briefcase,
    Calendar,
    CheckCircle2,
    Star,
    TrendingUp,
    MessageSquare,
    Zap,
    Target,
    Sparkles
} from 'lucide-react';
import { TalentProfile } from '@/lib/types/employee';
import { employeeService } from '@/lib/services/employee.service';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/utils/logger';

interface TalentJourneyTabProps {
    employeeId: string;
}

export default function TalentJourneyTab({ employeeId }: TalentJourneyTabProps) {
    const [profile, setProfile] = useState<TalentProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTalentProfile();
        // loadTalentProfile is defined below; omitted to prevent infinite-loop.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);

    const loadTalentProfile = async () => {
        try {
            setLoading(true);
            const data = await employeeService.getTalentProfile(employeeId);
            setProfile(data);
        } catch (err) {
            logger.error('Failed to load talent profile:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <TalentJourneySkeleton />;
    if (!profile) return <div>Failed to load profile details.</div>;

    return (
        <div className="space-y-8 py-4">
            {/* Skills Radar / Cloud */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-bold">Verified Skills</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                        <motion.div
                            key={skill.name}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`px-4 py-2 rounded-2xl border flex items-center gap-2 shadow-sm ${skill.verified ? 'bg-sky-50 border-sky-100 dark:bg-sky-950/20 dark:border-sky-900/50' : 'bg-surface-50 border-surface-200 dark:bg-surface-800 dark:border-surface-700'
                                }`}
                        >
                            <span className="font-semibold text-sm">{skill.name}</span>
                            <div className="flex gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 w-1.5 rounded-full ${i < skill.level ? 'bg-sky-500' : 'bg-surface-200 dark:bg-surface-700'}`}
                                    />
                                ))}
                            </div>
                            {skill.verified && <CheckCircle2 className="h-3 w-3 text-sky-500" />}
                        </motion.div>
                    ))}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Career Timeline */}
                <div className="lg:col-span-7">
                    <div className="flex items-center gap-2 mb-6">
                        <Target className="h-5 w-5 text-indigo-500" />
                        <h3 className="text-lg font-bold">Career Timeline</h3>
                    </div>
                    <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-200 dark:before:bg-surface-700">
                        {profile.timeline.map((milestone, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -10 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="relative"
                            >
                                <div className={`absolute -left-[30px] p-1.5 rounded-full border-2 bg-[var(--bg-card)] z-10 ${milestone.status === 'COMPLETED' ? 'border-green-500' : 'border-sky-500 border-dashed animate-pulse'
                                    }`}>
                                    {getMilestoneIcon(milestone.type)}
                                </div>
                                <Card className="border-none shadow-sm dark:bg-surface-800/50">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-surface-900 dark:text-surface-50">{milestone.title}</h4>
                                            <span className="text-xs font-medium text-surface-500 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded uppercase">
                                                {milestone.date}
                                            </span>
                                        </div>
                                        <p className="text-xs text-surface-500">Status: {milestone.status}</p>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Side Panel: Achievements & Feedback */}
                <div className="lg:col-span-5 space-y-8">
                    {/* Achievements */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Award className="h-5 w-5 text-sky-500" />
                                <h3 className="text-lg font-bold">Achievements</h3>
                            </div>
                            <Button variant="ghost" size="sm" className="text-xs text-sky-700">View All</Button>
                        </div>
                        <div className="space-y-4">
                            {profile.achievements.map((achievement, idx) => (
                                <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    className="p-4 bg-gradient-to-r from-surface-50 to-white dark:from-surface-800 dark:to-surface-900 rounded-2xl border border-surface-100 dark:border-surface-700 flex gap-4"
                                >
                                    <div className="h-12 w-12 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center text-sky-700">
                                        <Sparkles className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{achievement.title}</h4>
                                        <p className="text-xs text-surface-500 mt-1 line-clamp-2">{achievement.description}</p>
                                        <span className="text-xs text-sky-500 font-semibold mt-2 block uppercase">{achievement.date}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Feedback */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="h-5 w-5 text-purple-500" />
                            <h3 className="text-lg font-bold">Recognition Wall</h3>
                        </div>
                        <div className="space-y-4">
                            {profile.recentFeedback.map((feedback, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-surface-50 dark:bg-surface-800/50 border border-transparent hover:border-purple-200 dark:hover:border-purple-900/30 transition-all">
                                    <p className="text-sm italic hover:text-surface-900 dark:text-surface-300">&quot;{feedback.comment}&quot;</p>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-xs flex items-center justify-center font-bold text-purple-700">
                                                {feedback.fromName.charAt(0)}
                                            </div>
                                            <span className="text-xs font-semibold">{feedback.fromName}</span>
                                        </div>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-3 w-3 ${i < feedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-surface-200 dark:text-surface-700'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="outline" className="w-full mt-4 border-dashed border-purple-200 dark:border-purple-900/50 text-purple-600">
                            Give Feedback
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function getMilestoneIcon(type: string) {
    switch (type) {
        case 'JOINED': return <Calendar className="h-4 w-4 text-green-500" />;
        case 'PROMOTION': return <TrendingUp className="h-4 w-4 text-sky-500" />;
        case 'PROJECT': return <Briefcase className="h-4 w-4 text-indigo-500" />;
        default: return <Star className="h-4 w-4 text-yellow-500" />;
    }
}

function TalentJourneySkeleton() {
    return (
        <div className="space-y-8 py-4 animate-pulse">
            <div className="h-6 w-32 bg-surface-200 dark:bg-surface-800 rounded mb-4" />
            <div className="flex flex-wrap gap-2">
                <div className="h-10 w-24 bg-surface-100 dark:bg-surface-800 rounded-full" />
                <div className="h-10 w-32 bg-surface-100 dark:bg-surface-800 rounded-full" />
                <div className="h-10 w-28 bg-surface-100 dark:bg-surface-800 rounded-full" />
            </div>
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-1 border-l-2 border-surface-200 dark:border-surface-800 pl-8 space-y-6">
                    <div className="h-24 bg-surface-100 dark:bg-surface-800 rounded-xl" />
                    <div className="h-24 bg-surface-100 dark:bg-surface-800 rounded-xl" />
                </div>
                <div className="col-span-11 h-64 bg-surface-100 dark:bg-surface-800 rounded-xl" />
            </div>
        </div>
    );
}
