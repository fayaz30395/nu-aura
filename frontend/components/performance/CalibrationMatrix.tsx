'use client';

import { useState, useCallback } from 'react';
import { Star, TrendingUp, AlertTriangle, Users, GripVertical } from 'lucide-react';
import { EmployeeCalibration, PerformanceRating, PotentialRating } from '@/lib/types/performance-360';

interface CalibrationMatrixProps {
  employees: EmployeeCalibration[];
  onEmployeeMove: (employeeId: string, performance: number, potential: number) => void;
  onEmployeeClick?: (employee: EmployeeCalibration) => void;
  readOnly?: boolean;
}

type MatrixPosition = {
  performance: number; // 1-3 (Low to High)
  potential: number; // 1-3 (Low to High)
};

const matrixLabels: Record<string, { title: string; description: string; color: string }> = {
  '3-3': {
    title: 'Stars / Top Talent',
    description: 'High performers with high potential - future leaders',
    color: 'bg-green-500',
  },
  '3-2': {
    title: 'Core Contributors',
    description: 'High performers - backbone of the organization',
    color: 'bg-green-400',
  },
  '3-1': {
    title: 'Solid Performers',
    description: 'Consistent performers in current role',
    color: 'bg-green-300',
  },
  '2-3': {
    title: 'High Potential',
    description: 'Strong potential - need development',
    color: 'bg-yellow-400',
  },
  '2-2': {
    title: 'Solid Contributors',
    description: 'Meeting expectations consistently',
    color: 'bg-yellow-300',
  },
  '2-1': {
    title: 'Underperformers',
    description: 'Need improvement in current role',
    color: 'bg-yellow-200',
  },
  '1-3': {
    title: 'Enigmas / Rough Diamonds',
    description: 'High potential but underperforming - need support',
    color: 'bg-red-400',
  },
  '1-2': {
    title: 'Inconsistent Performers',
    description: 'Variable performance - coaching needed',
    color: 'bg-red-300',
  },
  '1-1': {
    title: 'Low Performers',
    description: 'Significant performance concerns',
    color: 'bg-red-500',
  },
};

function EmployeeCard({
  employee,
  onClick,
  onDragStart,
  isDragging,
  readOnly,
}: {
  employee: EmployeeCalibration;
  onClick?: () => void;
  onDragStart: (e: React.DragEvent) => void;
  isDragging: boolean;
  readOnly?: boolean;
}) {
  return (
    <div
      draggable={!readOnly}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`p-2 bg-white rounded border border-[var(--border-main)] shadow-sm cursor-pointer hover:shadow-md transition-all text-xs ${
        isDragging ? 'opacity-50' : ''
      } ${!readOnly ? 'hover:border-blue-400' : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] truncate">{employee.employeeName}</p>
          <p className="text-[var(--text-muted)] truncate text-xs">{employee.designation}</p>
        </div>
        {!readOnly && <GripVertical className="h-3 w-3 text-[var(--text-muted)] flex-shrink-0" />}
      </div>
      {employee.retentionRisk && (
        <div className="mt-1 flex items-center gap-1">
          {employee.retentionRisk === 'HIGH' && (
            <AlertTriangle className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs ${
              employee.retentionRisk === 'HIGH'
                ? 'text-red-600'
                : employee.retentionRisk === 'MEDIUM'
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
          >
            {employee.retentionRisk === 'HIGH' ? 'Flight Risk' : ''}
          </span>
        </div>
      )}
    </div>
  );
}

function MatrixCell({
  performance,
  potential,
  employees,
  onDrop,
  onEmployeeClick,
  onEmployeeDragStart,
  readOnly,
}: {
  performance: number;
  potential: number;
  employees: EmployeeCalibration[];
  onDrop: (e: React.DragEvent) => void;
  onEmployeeClick?: (employee: EmployeeCalibration) => void;
  onEmployeeDragStart: (employee: EmployeeCalibration) => (e: React.DragEvent) => void;
  readOnly?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const key = `${performance}-${potential}`;
  const cellInfo = matrixLabels[key];

  const handleDragOver = (e: React.DragEvent) => {
    if (!readOnly) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!readOnly) {
      e.preventDefault();
      setIsDragOver(false);
      onDrop(e);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border border-[var(--border-strong)] p-2 rounded-lg min-h-[180px] transition-all ${
        isDragOver ? 'bg-blue-50 border-blue-400 border-2' : 'bg-[var(--bg-surface)]'
      } ${cellInfo.color} bg-opacity-10`}
    >
      <div className="mb-2 pb-2 border-b border-[var(--border-main)]">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{cellInfo.title}</h4>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-tight">{cellInfo.description}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Users className="h-3 w-3" />
            {employees.length}
          </span>
        </div>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onClick={() => onEmployeeClick?.(employee)}
            onDragStart={onEmployeeDragStart(employee)}
            isDragging={false}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

export default function CalibrationMatrix({
  employees,
  onEmployeeMove,
  onEmployeeClick,
  readOnly = false,
}: CalibrationMatrixProps) {
  const [draggedEmployee, setDraggedEmployee] = useState<EmployeeCalibration | null>(null);

  const getEmployeesForCell = useCallback(
    (performance: number, potential: number) => {
      return employees.filter(
        (emp) =>
          emp.currentPosition.performance === performance &&
          emp.currentPosition.potential === potential
      );
    },
    [employees]
  );

  const handleEmployeeDragStart = (employee: EmployeeCalibration) => (e: React.DragEvent) => {
    setDraggedEmployee(employee);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCellDrop =
    (performance: number, potential: number) => (e: React.DragEvent) => {
      e.preventDefault();
      if (draggedEmployee && !readOnly) {
        onEmployeeMove(draggedEmployee.id, performance, potential);
        setDraggedEmployee(null);
      }
    };

  const distribution = employees.reduce(
    (acc, emp) => {
      const key = `${emp.currentPosition.performance}-${emp.currentPosition.potential}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="bg-white p-4 rounded-lg border border-[var(--border-main)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">9-Box Grid Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Top Talent / Stars</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-400"></div>
            <span>Development Needed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>Performance Concerns</span>
          </div>
        </div>
        {!readOnly && (
          <p className="mt-2 text-xs text-[var(--text-muted)] italic">
            Drag and drop employees between cells to calibrate their performance and potential
            ratings
          </p>
        )}
      </div>

      {/* Matrix Grid */}
      <div className="bg-white p-4 rounded-lg border border-[var(--border-main)] overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Y-axis label */}
          <div className="flex items-center mb-4">
            <div className="w-32 flex items-center justify-center">
              <div className="transform -rotate-90 whitespace-nowrap">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Potential</span>
                <TrendingUp className="inline h-4 w-4 ml-1" />
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Performance</span>
                <Star className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex">
            {/* Y-axis labels */}
            <div className="w-32 flex flex-col-reverse gap-2 pr-2">
              <div className="h-[200px] flex items-center justify-end">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Low</span>
              </div>
              <div className="h-[200px] flex items-center justify-end">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Medium</span>
              </div>
              <div className="h-[200px] flex items-center justify-end">
                <span className="text-xs font-medium text-[var(--text-secondary)]">High</span>
              </div>
            </div>

            {/* Matrix cells */}
            <div className="flex-1">
              {/* High Potential Row */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <MatrixCell
                  performance={1}
                  potential={3}
                  employees={getEmployeesForCell(1, 3)}
                  onDrop={handleCellDrop(1, 3)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
                <MatrixCell
                  performance={2}
                  potential={3}
                  employees={getEmployeesForCell(2, 3)}
                  onDrop={handleCellDrop(2, 3)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
                <MatrixCell
                  performance={3}
                  potential={3}
                  employees={getEmployeesForCell(3, 3)}
                  onDrop={handleCellDrop(3, 3)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
              </div>

              {/* Medium Potential Row */}
              <div className="grid grid-cols-3 gap-2 mb-2">
                <MatrixCell
                  performance={1}
                  potential={2}
                  employees={getEmployeesForCell(1, 2)}
                  onDrop={handleCellDrop(1, 2)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
                <MatrixCell
                  performance={2}
                  potential={2}
                  employees={getEmployeesForCell(2, 2)}
                  onDrop={handleCellDrop(2, 2)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
                <MatrixCell
                  performance={3}
                  potential={2}
                  employees={getEmployeesForCell(3, 2)}
                  onDrop={handleCellDrop(3, 2)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
              </div>

              {/* Low Potential Row */}
              <div className="grid grid-cols-3 gap-2">
                <MatrixCell
                  performance={1}
                  potential={1}
                  employees={getEmployeesForCell(1, 1)}
                  onDrop={handleCellDrop(1, 1)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
                <MatrixCell
                  performance={2}
                  potential={1}
                  employees={getEmployeesForCell(2, 1)}
                  onDrop={handleCellDrop(2, 1)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
                <MatrixCell
                  performance={3}
                  potential={1}
                  employees={getEmployeesForCell(3, 1)}
                  onDrop={handleCellDrop(3, 1)}
                  onEmployeeClick={onEmployeeClick}
                  onEmployeeDragStart={handleEmployeeDragStart}
                  readOnly={readOnly}
                />
              </div>

              {/* X-axis labels */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Low</span>
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Medium</span>
                </div>
                <div className="text-center">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">High</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white p-4 rounded-lg border border-[var(--border-main)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Distribution Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{employees.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Total Employees</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {(distribution['3-3'] || 0) + (distribution['2-3'] || 0) + (distribution['3-2'] || 0)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Top Performers</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {(distribution['2-2'] || 0) + (distribution['2-1'] || 0) + (distribution['3-1'] || 0)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Solid Contributors</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {(distribution['1-1'] || 0) + (distribution['1-2'] || 0) + (distribution['1-3'] || 0)}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Need Development</div>
          </div>
        </div>
      </div>
    </div>
  );
}
