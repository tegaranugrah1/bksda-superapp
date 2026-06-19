import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '@/lib/auth/tokenStorage';
import { downloadAssignmentFile, FileDownloadError } from '../download';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn(),
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('@/lib/auth/tokenStorage', () => ({
  getToken: jest.fn(),
}));

jest.mock('@/lib/api/config', () => ({
  config: {
    apiUrl: 'https://api.test.com/api',
  },
}));

describe('downloadAssignmentFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getToken as jest.Mock).mockResolvedValue('secure-token');
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///cache/surat-tugas/surat-tugas.pdf',
      status: 200,
      mimeType: 'application/pdf',
      headers: {},
    });
  });

  it('downloads personal assignment files through an authenticated API endpoint', async () => {
    const result = await downloadAssignmentFile({
      assignmentId: 'st-1',
      mode: 'personal',
      filename: 'ST.001/BKSDA/2026.pdf',
    });

    expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith('file:///cache/surat-tugas/', {
      intermediates: true,
    });
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      'https://api.test.com/api/surat-tugas/my/st-1/download',
      'file:///cache/surat-tugas/ST.001-BKSDA-2026.pdf',
      {
        headers: {
          Accept: 'application/pdf,application/octet-stream',
          Authorization: 'Bearer secure-token',
          'X-Client': 'mobile',
        },
      }
    );
    expect(result).toEqual({
      localUri: 'file:///cache/surat-tugas/surat-tugas.pdf',
      filename: 'ST.001-BKSDA-2026.pdf',
      mimeType: 'application/pdf',
      status: 200,
    });
  });

  it('downloads management assignment files to document storage when requested', async () => {
    await downloadAssignmentFile({
      assignmentId: 42,
      mode: 'management',
      filename: 'surat tugas.pdf',
      storage: 'document',
    });

    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      'https://api.test.com/api/surat-tugas/42/download',
      'file:///documents/surat-tugas/surat tugas.pdf',
      expect.any(Object)
    );
  });

  it('rejects before downloading when no auth token is available', async () => {
    (getToken as jest.Mock).mockResolvedValue(null);

    await expect(downloadAssignmentFile({ assignmentId: 'st-1' })).rejects.toMatchObject({
      kind: 'auth',
      status: 401,
      message: 'Sesi Anda telah berakhir. Silakan login kembali.',
    });
    expect(FileSystem.downloadAsync).not.toHaveBeenCalled();
  });

  it('deletes failed downloads and returns a user-friendly not found error', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockResolvedValue({
      uri: 'file:///cache/surat-tugas/surat-tugas.pdf',
      status: 404,
      mimeType: null,
      headers: {},
    });

    await expect(downloadAssignmentFile({ assignmentId: 'st-missing' })).rejects.toMatchObject({
      kind: 'not_found',
      status: 404,
      message: 'File Surat Tugas tidak ditemukan atau belum tersedia.',
    });
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith('file:///cache/surat-tugas/surat-tugas.pdf', {
      idempotent: true,
    });
  });

  it('wraps filesystem failures as network download errors', async () => {
    (FileSystem.downloadAsync as jest.Mock).mockRejectedValue(new Error('native failure'));

    await expect(downloadAssignmentFile({ assignmentId: 'st-1' })).rejects.toBeInstanceOf(FileDownloadError);
    await expect(downloadAssignmentFile({ assignmentId: 'st-1' })).rejects.toMatchObject({
      kind: 'network',
      message: 'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.',
    });
  });
});
