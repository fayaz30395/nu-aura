import {useMutation, useQuery} from '@tanstack/react-query';
import {notifications} from '@mantine/notifications';
import {apiClient} from '@/lib/api/client';
import {getLocalDateString} from '@/lib/utils/dateUtils';
import type {CreatePIPRequest, PIPCheckInRequest, PIPResponse} from '@/lib/types/grow/performance';
import type {CheckInFormData, ClosePIPFormData, CreatePIPFormData, PIPFilter} from '../_components/pipConfig';

async function fetchPIPs(filters?: PIPFilter): Promise<PIPResponse[]> {
  const params = new URLSearchParams();
  if (filters?.departmentId) params.append('departmentId', filters.departmentId);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);
  if (filters?.search) params.append('search', filters.search);

  const res = await apiClient.get(`/performance/pip?${params}`);
  const data = res.data;
  if (Array.isArray(data)) return data as PIPResponse[];
  if (data && Array.isArray((data as Record<string, unknown>).content)) return (data as Record<string, unknown>).content as PIPResponse[];
  return [];
}

async function createPIP(data: CreatePIPRequest): Promise<PIPResponse> {
  const res = await apiClient.post<PIPResponse>('/performance/pip', data);
  return res.data;
}

async function addCheckIn(pipId: string, data: PIPCheckInRequest): Promise<PIPResponse> {
  const res = await apiClient.post<PIPResponse>(`/performance/pip/${pipId}/check-in`, data);
  return res.data;
}

async function closePIP(
  pipId: string,
  status: 'COMPLETED' | 'EXTENDED' | 'TERMINATED',
  notes?: string
): Promise<PIPResponse> {
  const res = await apiClient.patch<PIPResponse>(`/performance/pip/${pipId}/status`, {status, notes});
  return res.data;
}

export function usePipsQuery(filters: PIPFilter) {
  return useQuery({
    queryKey: ['pips', filters],
    queryFn: () => fetchPIPs(filters),
  });
}

export function useCreatePip() {
  return useMutation({
    mutationFn: (data: CreatePIPFormData) => createPIP(data as CreatePIPRequest),
    meta: {skipGlobalError: true},
    onError: () => notifications.show({title: 'Error', message: 'Failed to create PIP', color: 'red'}),
  });
}

export function useAddPipCheckIn(pipId: string | undefined) {
  return useMutation({
    mutationFn: (data: CheckInFormData) => addCheckIn(pipId!, {
      checkInDate: getLocalDateString(new Date()),
      progressNotes: data.progressNotes,
      managerComments: data.managerComments,
    }),
    meta: {skipGlobalError: true},
    onError: () => notifications.show({title: 'Error', message: 'Failed to add check-in', color: 'red'}),
  });
}

export function useClosePip(pipId: string | undefined) {
  return useMutation({
    mutationFn: (data: ClosePIPFormData) => closePIP(pipId!, data.status, data.notes),
    meta: {skipGlobalError: true},
    onError: () => notifications.show({title: 'Error', message: 'Failed to close PIP', color: 'red'}),
  });
}
