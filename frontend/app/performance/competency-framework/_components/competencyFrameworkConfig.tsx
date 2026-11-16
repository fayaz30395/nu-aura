import type {ReactNode} from 'react';
import {z} from 'zod';
import {BookOpen, Brain, Shield, Target, TrendingUp} from 'lucide-react';
import type {CompetencyCategory} from '@/lib/types/grow/performance';

export const CATEGORY_OPTIONS: {value: CompetencyCategory; label: string; icon: ReactNode}[] = [
  {value: 'TECHNICAL', label: 'Technical', icon: <Target size={14} aria-hidden/>},
  {value: 'BEHAVIORAL', label: 'Behavioral', icon: <Brain size={14} aria-hidden/>},
  {value: 'LEADERSHIP', label: 'Leadership', icon: <TrendingUp size={14} aria-hidden/>},
  {value: 'DOMAIN', label: 'Domain', icon: <BookOpen size={14} aria-hidden/>},
  {value: 'PROBLEM_SOLVING', label: 'Problem Solving', icon: <Shield size={14} aria-hidden/>},
];

export const CATEGORY_COLORS: Record<CompetencyCategory, string> = {
  TECHNICAL: 'bg-accent-100 text-accent-800 dark:bg-accent-900/30 dark:text-accent-300',
  BEHAVIORAL: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300',
  LEADERSHIP: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300',
  DOMAIN: 'bg-accent-200 text-accent-900 dark:bg-accent-900/30 dark:text-accent-400',
  PROBLEM_SOLVING: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300',
};

export const competencySchema = z.object({
  reviewId: z.string().min(1, 'Review is required'),
  competencyName: z.string().min(1, 'Competency name is required').max(100),
  category: z.enum(['TECHNICAL', 'BEHAVIORAL', 'LEADERSHIP', 'DOMAIN', 'PROBLEM_SOLVING']),
  rating: z.coerce.number().min(1).max(5),
  comments: z.string().optional(),
});

export type CompetencyFormData = z.infer<typeof competencySchema>;

export interface ReviewOption {
  value: string;
  label: string;
}
