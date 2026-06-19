import { apiClient } from '@/lib/api/client';
import { AssignmentStatusActionPayload, AssignmentDetail } from './types';

export async function updateAssignmentStatus(
  id: string | number,
  payload: AssignmentStatusActionPayload
): Promise<AssignmentDetail | { id: string | number }> {
  const response = await apiClient.put(`/surat-tugas/${id}/status`, payload);
  return response.data.data;
}
