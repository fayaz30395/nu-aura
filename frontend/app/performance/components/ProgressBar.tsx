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
    blue: "bg-accent",
    green: "bg-status-success-bg",
    yellow: "bg-status-warning-bg",
    red: "bg-status-danger-bg",
    primary: "bg-accent",
  };

  const getColorByProgress = () => {
    if (color !== 'primary') return colorClasses[color];
    if (percentage >= 80) return "bg-status-success-bg";
    if (percentage >= 50) return "bg-accent";
    if (percentage >= 30) return "bg-status-warning-bg";
    return "bg-status-danger-bg";
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
