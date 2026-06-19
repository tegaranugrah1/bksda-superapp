import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '@/lib/auth/tokenStorage';
import { config } from '@/lib/api/config';
import { AssignmentListMode } from '@/features/surat-tugas/types';

export type DownloadStorage = 'cache' | 'document';

export type DownloadFileOptions = {
  assignmentId: string | number;
  mode?: AssignmentListMode;
  filename?: string | null;
  storage?: DownloadStorage;
};

export type DownloadedFile = {
  localUri: string;
  filename: string;
  mimeType?: string | null;
  status: number;
};

export type FileDownloadErrorKind =
  | 'auth'
  | 'forbidden'
  | 'not_found'
  | 'server'
  | 'network'
  | 'unavailable';

export class FileDownloadError extends Error {
  kind: FileDownloadErrorKind;
  status?: number;

  constructor(kind: FileDownloadErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'FileDownloadError';
    this.kind = kind;
    this.status = status;
  }
}

function getAssignmentDownloadEndpoint(assignmentId: string | number, mode: AssignmentListMode) {
  const encodedId = encodeURIComponent(String(assignmentId));
  return mode === 'personal'
    ? `/surat-tugas/my/${encodedId}/download`
    : `/surat-tugas/${encodedId}/download`;
}

function buildApiUrl(endpoint: string) {
  return `${config.apiUrl.replace(/\/$/, '')}${endpoint}`;
}

function sanitizeFilename(filename?: string | null) {
  const fallback = 'surat-tugas.pdf';
  const cleaned = (filename || fallback)
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ');

  return cleaned || fallback;
}

function getBaseDirectory(storage: DownloadStorage) {
  const baseDirectory = storage === 'document' ? FileSystem.documentDirectory : FileSystem.cacheDirectory;

  if (!baseDirectory) {
    throw new FileDownloadError('unavailable', 'Penyimpanan file tidak tersedia di perangkat ini.');
  }

  return baseDirectory;
}

function getDownloadError(status: number) {
  if (status === 401) {
    return new FileDownloadError('auth', 'Sesi Anda telah berakhir. Silakan login kembali.', status);
  }

  if (status === 403) {
    return new FileDownloadError('forbidden', 'Anda tidak memiliki akses untuk mengunduh file ini.', status);
  }

  if (status === 404) {
    return new FileDownloadError('not_found', 'File Surat Tugas tidak ditemukan atau belum tersedia.', status);
  }

  if (status >= 500) {
    return new FileDownloadError('server', 'Server gagal menyiapkan file. Silakan coba lagi nanti.', status);
  }

  return new FileDownloadError('network', 'Gagal mengunduh file Surat Tugas.', status);
}

export async function downloadAssignmentFile({
  assignmentId,
  mode = 'personal',
  filename,
  storage = 'cache',
}: DownloadFileOptions): Promise<DownloadedFile> {
  const token = await getToken();
  if (!token) {
    throw new FileDownloadError('auth', 'Sesi Anda telah berakhir. Silakan login kembali.', 401);
  }

  const safeFilename = sanitizeFilename(filename);
  const directory = `${getBaseDirectory(storage)}surat-tugas/`;
  const localUri = `${directory}${safeFilename}`;
  const endpoint = getAssignmentDownloadEndpoint(assignmentId, mode);
  const downloadUrl = buildApiUrl(endpoint);

  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

    const result = await FileSystem.downloadAsync(downloadUrl, localUri, {
      headers: {
        Accept: 'application/pdf,application/octet-stream',
        Authorization: `Bearer ${token}`,
        'X-Client': 'mobile',
      },
    });

    if (result.status < 200 || result.status >= 300) {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      throw getDownloadError(result.status);
    }

    return {
      localUri: result.uri,
      filename: safeFilename,
      mimeType: result.mimeType,
      status: result.status,
    };
  } catch (error) {
    if (error instanceof FileDownloadError) {
      throw error;
    }

    throw new FileDownloadError(
      'network',
      'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.'
    );
  }
}
