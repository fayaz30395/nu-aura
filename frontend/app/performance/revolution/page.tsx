'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Target,
    GitBranch,
    Hexagon,
    Zap,
    TrendingUp,
    MessageSquare,
    Users,
    Award,
    Search,
    Filter,
    RefreshCw,
    Share2,
    ChevronRight,
    Star
} from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useOKRGraph, usePerformanceSpider } from '@/lib/hooks/queries/usePerformance';
import { OKRGraphResponse, PerformanceSpiderResponse } from '@/lib/types/performance';

export default function PerformanceRevolutionPage() {
    const [currentUserId] = useState('me');
    const okrGraphQuery = useOKRGraph();
    const performanceSpiderQuery = usePerformanceSpider(currentUserId);

    const loading = okrGraphQuery.isLoading || performanceSpiderQuery.isLoading;
    const graphData = okrGraphQuery.data || null;
    const spiderData = performanceSpiderQuery.data || null;

    return (
        <AppLayout activeMenuItem="performance">
            <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400">
                            Performance Revolution
                        </h1>
                        <p className="text-surface-600 dark:text-surface-400 mt-1">Advanced OKR visualization and 360° performance insights</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => { okrGraphQuery.refetch(); performanceSpiderQuery.refetch(); }} leftIcon={<RefreshCw className="h-4 w-4" />}>
                            Refresh
                        </Button>
                        <Button variant="primary" size="sm" leftIcon={<Share2 className="h-4 w-4" />}>
                            Share Progress
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* OKR Progress Galaxy - Placeholder for d3/custom SVG */}
                    <Card className="lg:col-span-8 overflow-hidden bg-surface-900 border-none text-white relative h-[600px]">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]" />
                        <CardHeader className="relative z-10 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-white flex items-center gap-2">
                                        <Target className="h-5 w-5 text-primary-400" /> OKR Alignment Galaxy
                                    </CardTitle>
                                    <CardDescription className="text-surface-400">Visual mapping of objectives from Company to Individual</CardDescription>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary-500" /> Company</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Team</div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-surface-500" /> Personal</div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="h-full relative flex items-center justify-center">
                            {/* Mock Galaxy Visualization */}
                            <div className="relative w-full h-full">
                                {graphData?.nodes.slice(0, 10).map((node, i) => (
                                    <motion.div
                                        key={node.id}
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{
                                            scale: 1,
                                            opacity: 1,
                                            x: Math.cos(i * (360 / 10) * Math.PI / 180) * 200,
                                            y: Math.sin(i * (360 / 10) * Math.PI / 180) * 150
                                        }}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform transition-all cursor-pointer group"
                                    >
                                        <div className={`
                       relative w-16 h-16 rounded-full flex items-center justify-center border-2 
                       ${node.type === 'COMPANY' ? 'bg-primary-600/20 border-primary-500 h-24 w-24 shadow-[0_0_20px_rgba(59,130,246,0.5)]' :
                                                node.type === 'TEAM' ? 'bg-indigo-600/20 border-indigo-500' : 'bg-surface-800 border-surface-600'}
                     `}>
                                            <div className="text-center">
                                                <div className="text-[10px] font-black">{Math.round(node.progress)}%</div>
                                                <div className="w-8 h-1 bg-white/10 rounded-full mt-1 overflow-hidden mx-auto">
                                                    <div className="h-full bg-primary-400" style={{ width: `${node.progress}%` }} />
                                                </div>
                                            </div>
                                            {/* Tooltip on hover */}
                                            <div className="absolute invisible group-hover:visible bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white text-surface-900 p-2 rounded text-[10px] whitespace-nowrap z-50 shadow-xl">
                                                <p className="font-bold">{node.title}</p>
                                                <p className="text-surface-500">{node.ownerName}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                                {/* Center Node */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 opacity-20">
                                    <Hexagon className="h-96 w-96 text-primary-500 animate-pulse" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 360 Insight Spider */}
                    <Card className="lg:col-span-4 bg-[var(--bg-card)]">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-500" /> 360° Competency Radar
                            </CardTitle>
                            <CardDescription>Multi-source feedback comparison</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart data={spiderData?.metrics}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 600 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Tooltip />
                                        <Radar
                                            name="Self"
                                            dataKey="self"
                                            stroke="#10b981"
                                            fill="#10b981"
                                            fillOpacity={0.2}
                                        />
                                        <Radar
                                            name="Peers"
                                            dataKey="peer"
                                            stroke="#8b5cf6"
                                            fill="#8b5cf6"
                                            fillOpacity={0.2}
                                        />
                                        <Radar
                                            name="Manager"
                                            dataKey="manager"
                                            stroke="#3b82f6"
                                            fill="#3b82f6"
                                            fillOpacity={0.4}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 mt-6">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-green-500" /> <span className="text-[10px]">Self</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-purple-500" /> <span className="text-[10px]">Peers</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-3 h-1.5 rounded-full bg-primary-500" /> <span className="text-[10px]">Manager</span></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recognition Feed */}
                    <Card className="md:col-span-1 bg-[var(--bg-card)] border-t-4 border-yellow-400">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500" /> Recognition Pulse
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex gap-3 group cursor-pointer">
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-bold text-yellow-700">
                                        {i === 1 ? 'JD' : i === 2 ? 'AL' : 'KS'}
                                    </div>
                                    <div>
                                        <h5 className="text-xs font-bold group-hover:text-primary-600 transition-colors">Amazing Sprint Finish!</h5>
                                        <p className="text-[10px] text-surface-500 line-clamp-2">&quot;Thanks to the team for pushing through the last few bugs before release.&quot;</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[8px] text-surface-400 uppercase font-bold">2 hours ago</span>
                                            <div className="flex items-center gap-0.5 text-[8px] text-yellow-600 font-bold">
                                                <Star className="h-2 w-2 fill-current" /> +5 Karma
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full text-xs text-primary-600 p-0 h-auto">View All Kudos</Button>
                        </CardContent>
                    </Card>

                    {/* Coaching Corner */}
                    <Card className="md:col-span-2 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-surface-900">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-indigo-900 dark:text-indigo-400 flex items-center gap-2">
                                    <Users className="h-5 w-5" /> Development Trajectory
                                </CardTitle>
                                <Button variant="primary" size="sm" className="bg-indigo-600 hover:bg-indigo-700">Connect with Coach</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-[var(--bg-input)] rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/50">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Growth Opportunity</h4>
                                    <p className="text-sm font-semibold mb-1">Advanced Architecture Workshop</p>
                                    <p className="text-xs text-surface-500">Based on your &quot;System Design&quot; skill Gap</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-surface-400">Estimated Effort: 4h</span>
                                        <ChevronRight className="h-4 w-4 text-indigo-400" />
                                    </div>
                                </div>
                                <div className="p-4 bg-[var(--bg-input)] rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/50">
                                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Peak Performance</h4>
                                    <p className="text-sm font-semibold mb-1">Consistency King</p>
                                    <p className="text-xs text-surface-500">9 weeks of meeting all Weekly Commitments</p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-surface-400">Awarded last Friday</span>
                                        <Award className="h-4 w-4 text-yellow-500" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
