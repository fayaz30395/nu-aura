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
    blue: 'bg-accent-500',
    green: 'bg-success-600',
    yellow: 'bg-warning-600',
    red: 'bg-danger-600',
    primary: 'bg-accent-500',
  };

  const getColorByProgress = () => {
    if (color !== 'primary') return colorClasses[color];
    if (percentage >= 80) return 'bg-success-600';
    if (percentage >= 50) return 'bg-accent-500';
    if (percentage >= 30) return 'bg-warning-600';
    return 'bg-danger-600';
  };

  return (
    <div className="w-full">
      <div className={`w-full ${height} bg-elevated rounded-full overflow-hidden`}>
        <div
          className={`${height} ${getColorByProgress()} transition-all duration-300 ease-in-out`}
          style={{width: `${percentage}%`}}
        />
      </div>
      {showLabel && (
        <div className='mt-1 text-xs text-secondary text-right'>
          {percentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}
