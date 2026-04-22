import * as React from 'react';
import {cn} from '@/lib/utils';

type Dim = string | number;

interface BaseProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: Dim;
  height?: Dim;
}

const toDim = (v: Dim | undefined): string | undefined =>
  v === undefined ? undefined : typeof v === 'number' ? `${v}px` : v;

function SkeletonBase({className, width, height, style, ...props}: BaseProps) {
  const finalStyle: React.CSSProperties = {
    ...(style as React.CSSProperties),
    ...(width !== undefined && {width: toDim(width)}),
    ...(height !== undefined && {height: toDim(height)}),
  };
  return (
    <div
      className={cn('skeleton-aura', className)}
      style={finalStyle}
      {...props}
    />
  );
}

interface TextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

function SkeletonTextImpl({className, lines = 1, ...props}: TextProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({length: lines}).map((_, i) => (
        <SkeletonBase
          key={i}
          height={16}
          className={cn(i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const AVATAR_DIM: Record<NonNullable<AvatarProps['size']>, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

function SkeletonAvatarImpl({className, size = 'md', ...props}: AvatarProps) {
  const dim = AVATAR_DIM[size];
  return (
    <SkeletonBase
      className={cn('rounded-full', className)}
      width={dim}
      height={dim}
      {...props}
    />
  );
}

const cardPanel = cn(
  'rounded-lg border bg-[var(--bg-card)] border-[var(--border-main)]'
);

function SkeletonCardImpl({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(cardPanel, 'p-4 space-y-4', className)} {...props}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatarImpl/>
        <div className="space-y-2 flex-1">
          <SkeletonBase height={16} width="33%"/>
          <SkeletonBase height={12} width="50%"/>
        </div>
      </div>
      <SkeletonTextImpl lines={3}/>
    </div>
  );
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  columns?: number;
}

function SkeletonTableRowImpl({className, columns = 4, ...props}: TableRowProps) {
  return (
    <tr className={cn(className)} {...props}>
      {Array.from({length: columns}).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <SkeletonBase height={16} width={i === 0 ? 96 : '100%'}/>
        </td>
      ))}
    </tr>
  );
}

interface TableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
}

function SkeletonTableImpl({className, rows = 5, columns = 4, ...props}: TableProps) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border bg-[var(--bg-card)] border-[var(--border-main)]', className)}
      {...props}
    >
      <table className="w-full">
        <thead className="bg-[var(--bg-surface)]">
        <tr className="border-b border-[var(--border-main)]">
          {Array.from({length: columns}).map((_, i) => (
            <th key={i} className="px-4 py-2 text-left">
              <SkeletonBase height={16} width={80}/>
            </th>
          ))}
        </tr>
        </thead>
        <tbody>
        {Array.from({length: rows}).map((_, i) => (
          <SkeletonTableRowImpl key={i} columns={columns}/>
        ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonStatCardImpl({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(cardPanel, 'p-4', className)} {...props}>
      <div className="row-between">
        <SkeletonBase height={16} width={96}/>
        <SkeletonBase height={32} width={32} className="rounded-lg"/>
      </div>
      <SkeletonBase height={32} width={80} className="mt-2"/>
      <SkeletonBase height={12} width={128} className="mt-2"/>
    </div>
  );
}

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  hasAvatar?: boolean;
}

function SkeletonListItemImpl({className, hasAvatar = true, ...props}: ListItemProps) {
  return (
    <div className={cn('flex items-center space-x-4 py-4', className)} {...props}>
      {hasAvatar && <SkeletonAvatarImpl/>}
      <div className="flex-1 space-y-2">
        <SkeletonBase height={16} width="66%"/>
        <SkeletonBase height={12} width="33%"/>
      </div>
      <SkeletonBase height={32} width={80} className="rounded-md"/>
    </div>
  );
}

interface FormProps extends React.HTMLAttributes<HTMLDivElement> {
  fields?: number;
}

function SkeletonFormImpl({className, fields = 4, ...props}: FormProps) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {Array.from({length: fields}).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBase height={16} width={96}/>
          <SkeletonBase height={40} width="100%" className="rounded-md"/>
        </div>
      ))}
      <div className="flex justify-end space-x-4 pt-4">
        <SkeletonBase height={40} width={96} className="rounded-md"/>
        <SkeletonBase height={40} width={96} className="rounded-md"/>
      </div>
    </div>
  );
}

function SkeletonEmployeeCardImpl({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(cardPanel, 'p-4', className)} {...props}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatarImpl size="lg"/>
        <div className="flex-1 space-y-2">
          <SkeletonBase height={20} width={128}/>
          <SkeletonBase height={12} width={96}/>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <SkeletonBase height={16} width={16}/>
          <SkeletonBase height={12} width={112}/>
        </div>
        <div className="flex items-center space-x-2">
          <SkeletonBase height={16} width={16}/>
          <SkeletonBase height={12} width={144}/>
        </div>
      </div>
    </div>
  );
}

interface ChartProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: Dim;
}

function SkeletonChartImpl({className, height = 256, ...props}: ChartProps) {
  return (
    <div className={cn(cardPanel, 'p-4', className)} {...props}>
      <SkeletonBase height={16} width={128} className="mb-4"/>
      <SkeletonBase height={height} width="100%"/>
    </div>
  );
}

function SkeletonDashboardImpl({className, ...props}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('space-y-4', className)} {...props}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({length: 4}).map((_, i) => (
          <SkeletonStatCardImpl key={i}/>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChartImpl height={200}/>
        <div className={cn(cardPanel, 'p-4')}>
          <SkeletonBase height={20} width={128} className="mb-4"/>
          <div className="space-y-4">
            {Array.from({length: 5}).map((_, i) => (
              <SkeletonListItemImpl key={i}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: number;
  hasAvatar?: boolean;
}

function SkeletonListImpl({className, items = 5, hasAvatar = true, ...props}: ListProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({length: items}).map((_, i) => (
        <SkeletonListItemImpl key={i} hasAvatar={hasAvatar}/>
      ))}
    </div>
  );
}

type SkeletonComponent = typeof SkeletonBase & {
  Text: typeof SkeletonTextImpl;
  Avatar: typeof SkeletonAvatarImpl;
  Card: typeof SkeletonCardImpl;
  TableRow: typeof SkeletonTableRowImpl;
  Table: typeof SkeletonTableImpl;
  StatCard: typeof SkeletonStatCardImpl;
  ListItem: typeof SkeletonListItemImpl;
  List: typeof SkeletonListImpl;
  Form: typeof SkeletonFormImpl;
  EmployeeCard: typeof SkeletonEmployeeCardImpl;
  Chart: typeof SkeletonChartImpl;
  Dashboard: typeof SkeletonDashboardImpl;
};

const Skeleton = SkeletonBase as SkeletonComponent;
Skeleton.Text = SkeletonTextImpl;
Skeleton.Avatar = SkeletonAvatarImpl;
Skeleton.Card = SkeletonCardImpl;
Skeleton.TableRow = SkeletonTableRowImpl;
Skeleton.Table = SkeletonTableImpl;
Skeleton.StatCard = SkeletonStatCardImpl;
Skeleton.ListItem = SkeletonListItemImpl;
Skeleton.List = SkeletonListImpl;
Skeleton.Form = SkeletonFormImpl;
Skeleton.EmployeeCard = SkeletonEmployeeCardImpl;
Skeleton.Chart = SkeletonChartImpl;
Skeleton.Dashboard = SkeletonDashboardImpl;

const SkeletonText = SkeletonTextImpl;
const SkeletonAvatar = SkeletonAvatarImpl;
const SkeletonCard = SkeletonCardImpl;
const SkeletonTableRow = SkeletonTableRowImpl;
const SkeletonTable = SkeletonTableImpl;
const SkeletonStatCard = SkeletonStatCardImpl;
const SkeletonListItem = SkeletonListItemImpl;
const SkeletonList = SkeletonListImpl;
const SkeletonForm = SkeletonFormImpl;
const SkeletonEmployeeCard = SkeletonEmployeeCardImpl;
const SkeletonChart = SkeletonChartImpl;
const SkeletonDashboard = SkeletonDashboardImpl;

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTableRow,
  SkeletonTable,
  SkeletonStatCard,
  SkeletonListItem,
  SkeletonList,
  SkeletonForm,
  SkeletonEmployeeCard,
  SkeletonChart,
  SkeletonDashboard,
};
