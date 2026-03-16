interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  height?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'primary';
}

export default function ProgressBar({
  progress,
  showLabel = true,
  height = 'h-2',
  color = 'primary'
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(progress, 0), 100);

  const colorClasses = {
    blue: 'bg-primary-500',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600',
    primary: 'bg-primary-500',
  };

  const getColorByProgress = () => {
    if (color !== 'primary') return colorClasses[color];
    if (percentage >= 80) return 'bg-green-600';
    if (percentage >= 50) return 'bg-primary-500';
    if (percentage >= 30) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${getColorByProgress()} transition-all duration-300 ease-in-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-surface-600 dark:text-surface-400 text-right">
          {percentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}
