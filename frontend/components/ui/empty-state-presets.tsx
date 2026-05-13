'use client';

import React from 'react';
import {
  Activity,
  Award,
  Calendar,
  File,
  FileText,
  HelpCircle,
  MessageCircle,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';

/**
 * Recurring EmptyState preset (icon + title) pairs surfaced during cross-bundle
 * empty-state consolidation. Spread these into <EmptyState {...preset} description="..." />
 * to keep the iconography consistent across the same conceptual state.
 *
 * Icons use `w-full h-full` so they fill whichever inner container the EmptyState
 * primitive sizes (w-8 h-8 default, w-5 h-5 compact).
 *
 * @example
 *   <EmptyState {...EmptyStatePresets.noChartData} size="compact" />
 *   <EmptyState {...EmptyStatePresets.noResults} description="Try a different search." />
 */
export const EmptyStatePresets = {
  noComments: {icon: <MessageCircle className="w-full h-full"/>, title: 'No comments yet'},
  noFeed: {icon: <Activity className="w-full h-full"/>, title: 'No activity'},
  noChartData: {icon: <TrendingUp className="w-full h-full"/>, title: 'No data available'},
  noMeetings: {icon: <Calendar className="w-full h-full"/>, title: 'No meetings scheduled'},
  noQuestions: {icon: <HelpCircle className="w-full h-full"/>, title: 'No questions'},
  noRecognitions: {icon: <Award className="w-full h-full"/>, title: 'No recognitions yet'},
  noResults: {icon: <Search className="w-full h-full"/>, title: 'No results found'},
  noTemplates: {icon: <FileText className="w-full h-full"/>, title: 'No templates'},
  noFiles: {icon: <File className="w-full h-full"/>, title: 'No files'},
  noEmployees: {icon: <Users className="w-full h-full"/>, title: 'No employees'},
  noHolidays: {icon: <Calendar className="w-full h-full"/>, title: 'No holidays scheduled'},
} as const;

export type EmptyStatePresetKey = keyof typeof EmptyStatePresets;
