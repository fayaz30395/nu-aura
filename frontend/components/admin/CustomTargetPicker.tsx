'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CustomTarget, TargetType } from '@/lib/types/roles';
import { employeeService } from '@/lib/services/employee.service';
import { departmentService } from '@/lib/services/department.service';
import { officeLocationService, OfficeLocation } from '@/lib/services/office-location.service';
import { Employee, Department } from '@/lib/types/employee';
import { logger } from '@/lib/utils/logger';

interface CustomTargetPickerProps {
  targets: CustomTarget[];
  onChange: (targets: CustomTarget[]) => void;
  disabled?: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  subtext?: string;
  type: TargetType;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Module-level cache for locations (shared across all instances)
let cachedLocations: OfficeLocation[] | null = null;
let locationsCachePromise: Promise<OfficeLocation[]> | null = null;

async function getCachedLocations(): Promise<OfficeLocation[]> {
  if (cachedLocations) {
    return cachedLocations;
  }
  if (locationsCachePromise) {
    return locationsCachePromise;
  }
  locationsCachePromise = officeLocationService.getActiveLocations().then((locations) => {
    cachedLocations = locations;
    return locations;
  });
  return locationsCachePromise;
}

export function CustomTargetPicker({ targets, onChange, disabled = false }: CustomTargetPickerProps) {
  const [targetType, setTargetType] = useState<TargetType>('EMPLOYEE');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search based on target type
  const performSearch = useCallback(async (query: string, type: TargetType) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      let results: SearchResult[] = [];

      switch (type) {
        case 'EMPLOYEE': {
          const response = await employeeService.searchEmployees(query, 0, 10);
          results = response.content.map((emp: Employee) => ({
            id: emp.id,
            name: emp.fullName || `${emp.firstName} ${emp.lastName || ''}`.trim(),
            subtext: `${emp.employeeCode} • ${emp.designation || 'No designation'} • ${emp.departmentName || 'No department'}`,
            type: 'EMPLOYEE' as TargetType,
          }));
          break;
        }

        case 'DEPARTMENT': {
          const response = await departmentService.searchDepartments(query, 0, 10);
          results = response.content.map((dept: Department) => ({
            id: dept.id,
            name: dept.name,
            subtext: `${dept.code}${dept.parentDepartmentName ? ` • Under ${dept.parentDepartmentName}` : ''}`,
            type: 'DEPARTMENT' as TargetType,
          }));
          break;
        }

        case 'LOCATION': {
          // Use cached locations and filter locally
          const allLocations = await getCachedLocations();
          const lowercaseQuery = query.toLowerCase();
          results = allLocations
            .filter((loc: OfficeLocation) =>
              loc.name.toLowerCase().includes(lowercaseQuery) ||
              loc.city.toLowerCase().includes(lowercaseQuery) ||
              loc.address.toLowerCase().includes(lowercaseQuery)
            )
            .slice(0, 10)
            .map((loc: OfficeLocation) => ({
              id: loc.id,
              name: loc.name,
              subtext: `${loc.city}, ${loc.state}, ${loc.country}`,
              type: 'LOCATION' as TargetType,
            }));
          break;
        }
      }

      // Filter out already selected targets
      const selectedIds = new Set(
        targets
          .filter(t => t.targetType === type)
          .map(t => t.targetId)
      );
      results = results.filter(r => !selectedIds.has(r.id));

      setSearchResults(results);
    } catch (err) {
      logger.error('Search failed:', err);
      setError('Failed to search. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [targets]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery, targetType);
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery, targetType, performSearch]);

  // Handle target type change
  const handleTypeChange = (type: TargetType) => {
    setTargetType(type);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Add selected target
  const addTarget = (result: SearchResult) => {
    const newTarget: CustomTarget = {
      targetType: result.type,
      targetId: result.id,
      targetName: result.name,
    };

    // Avoid duplicates
    const exists = targets.some(
      t => t.targetType === newTarget.targetType && t.targetId === newTarget.targetId
    );

    if (!exists) {
      onChange([...targets, newTarget]);
    }

    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  // Remove target
  const removeTarget = (index: number) => {
    onChange(targets.filter((_, i) => i !== index));
  };

  // Get badge color based on target type
  const getTargetTypeBadgeColor = (type: TargetType) => {
    switch (type) {
      case 'EMPLOYEE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'DEPARTMENT':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'LOCATION':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
  };

  // Get target type label
  const getTargetTypeLabel = (type: TargetType) => {
    switch (type) {
      case 'EMPLOYEE': return 'Employee';
      case 'DEPARTMENT': return 'Department';
      case 'LOCATION': return 'Location';
    }
  };

  // Get target type icon
  const getTargetTypeIcon = (type: TargetType) => {
    switch (type) {
      case 'EMPLOYEE':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'DEPARTMENT':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        );
      case 'LOCATION':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-4 p-4 bg-[var(--bg-surface)] dark:bg-surface-800 rounded-lg border border-[var(--border-main)] dark:border-surface-700">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Custom Scope Targets</p>
        <span className="text-xs text-[var(--text-muted)]">
          {targets.length} selected
        </span>
      </div>

      {/* Target Type Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-surface)] dark:bg-surface-700 rounded-lg">
        {(['EMPLOYEE', 'DEPARTMENT', 'LOCATION'] as TargetType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => handleTypeChange(type)}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              targetType === type
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:hover:text-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {getTargetTypeIcon(type)}
            <span>{getTargetTypeLabel(type)}s</span>
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={`Search ${getTargetTypeLabel(targetType).toLowerCase()}s...`}
            disabled={disabled}
            className="w-full px-3 py-2 pl-9 text-sm border border-[var(--border-main)] dark:border-surface-600 rounded-md bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-muted)]">
            {isSearching ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && (searchResults.length > 0 || (searchQuery && !isSearching)) && (
          <div className="absolute z-10 w-full mt-1 bg-[var(--bg-surface)] border border-[var(--border-main)] dark:border-surface-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  type="button"
                  onClick={() => addTarget(result)}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-card-hover)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className={`p-1 rounded ${getTargetTypeBadgeColor(result.type)}`}>
                      {getTargetTypeIcon(result.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {result.name}
                      </p>
                      {result.subtext && (
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {result.subtext}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-[var(--text-muted)]">
                No {getTargetTypeLabel(targetType).toLowerCase()}s found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Selected Targets */}
      {targets.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Selected Targets
          </p>
          <div className="flex flex-wrap gap-2">
            {targets.map((target, index) => (
              <span
                key={`${target.targetType}-${target.targetId}-${index}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full ${getTargetTypeBadgeColor(target.targetType)}`}
              >
                {getTargetTypeIcon(target.targetType)}
                <span className="font-medium">{target.targetName || target.targetId}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeTarget(index)}
                    className="ml-1 hover:opacity-70 transition-opacity"
                    title="Remove"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)] italic text-center py-2">
          No custom targets selected. Search to add employees, departments, or locations.
        </p>
      )}

      {/* Help Text */}
      <p className="text-xs text-[var(--text-muted)]">
        Users with this permission will only have access to records belonging to the selected targets.
      </p>
    </div>
  );
}

export default CustomTargetPicker;
