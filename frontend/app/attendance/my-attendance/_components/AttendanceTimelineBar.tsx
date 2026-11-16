import {AttendanceRecord} from '@/lib/types/hrms/attendance';
import {formatTime, timelineSegment} from './format';

/** Worked span on a 6am–midnight track. */
export function AttendanceTimelineBar({record}: {record: AttendanceRecord}) {
  const seg = timelineSegment(record);
  if (!seg) return null;
  return (
    <div
      role="img"
      aria-label={`Worked ${formatTime(record.checkInTime)} to ${record.checkOutTime ? formatTime(record.checkOutTime) : 'now'}`}
      className="relative h-2 w-full min-w-40 overflow-hidden rounded-full bg-surface-aura-sunken"
    >
      {/* Position is data-driven, so it can't be expressed as a static utility class. */}
      <div className="absolute top-0 h-full rounded-full bg-accent" style={{left: `${seg.left}%`, width: `${seg.width}%`}}/>
    </div>
  );
}
