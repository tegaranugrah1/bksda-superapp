import { updateAssignmentStatus } from '../assignmentActionsApi';
import { apiClient } from '@/lib/api/client';

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    put: jest.fn(),
  },
}));

describe('assignmentActionsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('puts status payload to the Surat Tugas status endpoint', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { data: { id: 'st-1', status: 'approved' } },
    });

    const result = await updateAssignmentStatus('st-1', { status: 'approved' });

    expect(apiClient.put).toHaveBeenCalledWith('/surat-tugas/st-1/status', {
      status: 'approved',
    });
    expect(result).toEqual({ id: 'st-1', status: 'approved' });
  });

  it('passes optional nomor_surat when included', async () => {
    (apiClient.put as jest.Mock).mockResolvedValue({
      data: { data: { id: 'st-1', status: 'approved' } },
    });

    await updateAssignmentStatus('st-1', {
      status: 'approved',
      nomor_surat: 'ST.001/BKSDA/2026',
    });

    expect(apiClient.put).toHaveBeenCalledWith('/surat-tugas/st-1/status', {
      status: 'approved',
      nomor_surat: 'ST.001/BKSDA/2026',
    });
  });
});
