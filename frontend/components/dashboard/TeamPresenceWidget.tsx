'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { homeService, OnLeaveEmployeeResponse } from '@/lib/services/home.service';

interface EmployeePresence {
  employeeId: string;
  employeeName: string;
  initials: string;
  avatarColor: string;
}

interface TeamPresenceWidgetProps {
  onLeaveEmployees?: EmployeePresence[];
  remoteWorkingEmployees?: EmployeePresence[];
  isLoading?: boolean;
}

const DEMO_REMOTE_WORKERS: EmployeePresence[] = [
  { employeeId: '1', employeeName: 'Ananya Sharma', initials: 'AS', avatarColor: 'bg-slate-500' },
  { employeeId: '2', employeeName: 'Nikhil Kapoor', initials: 'NK', avatarColor: 'bg-slate-600' },
  { employeeId: '3', employeeName: 'Priya Desai', initials: 'PD', avatarColor: 'bg-slate-500' },
];

function getInitials(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
}

function mapLeaveToPresence(emp: OnLeaveEmployeeResponse): EmployeePresence {
  const initials = emp.employeeName.split(' ').map((p) => p[0]).join('').toUpperCase().slice(0, 2);
  return {
    employeeId: emp.employeeId,
    employeeName: emp.employeeName,
    initials,
    avatarColor: 'bg-slate-500',
  };
}

function Avatar({ name }: { name: string }) {
  const initials = getInitials(name);
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300"
      title={name}
    >
      {initials}
    </div>
  );
}

export function TeamPresenceWidget({
  onLeaveEmployees: propOnLeave,
  remoteWorkingEmployees = DEMO_REMOTE_WORKERS,
}: TeamPresenceWidgetProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [apiOnLeave, setApiOnLeave] = useState<EmployeePresence[]>([]);
  const [apiLoading, setApiLoading] = useState(!propOnLeave);

  useEffect(() => { setIsHydrated(true); }, []);

  useEffect(() => {
    if (propOnLeave) return;
    const fetchLeaveData = async () => {
      try {
        setApiLoading(true);
        const data = await homeService.getEmployeesOnLeaveToday();
        if (data && data.length > 0) {
          setApiOnLeave(data.map(mapLeaveToPresence));
        }
      } catch {
        // Silently fall back to empty
      } finally {
        setApiLoading(false);
      }
    };
    fetchLeaveData();
  }, [propOnLeave]);

  if (!isHydrated) return null;

  const onLeaveEmployees = propOnLeave ?? apiOnLeave;
  const remoteWorkers = remoteWorkingEmployees.length > 0 ? remoteWorkingEmployees : DEMO_REMOTE_WORKERS;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
      {/* On Leave Today */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2.5">
          On Leave Today
        </h3>
        {onLeaveEmployees.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-900">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Everyone is working today</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onLeaveEmployees.map((e) => (
              <div key={e.employeeId} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-900">
                <Avatar name={e.employeeName} />
                <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[80px] truncate">{e.employeeName.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Working Remotely */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Working Remotely
          </h3>
          <span className="ml-auto text-xs text-gray-400">{remoteWorkers.length}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {remoteWorkers.map((e) => (
            <div key={e.employeeId} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1.5 dark:bg-gray-900">
              <div className="relative">
                <Avatar name={e.employeeName} />
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500 dark:border-gray-950" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 max-w-[80px] truncate">{e.employeeName.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
