import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';

export type FileShareErrorKind = 'missing' | 'share_unavailable' | 'open_unavailable' | 'unknown';

export class FileShareError extends Error {
  kind: FileShareErrorKind;

  constructor(kind: FileShareErrorKind, message: string) {
    super(message);
    this.name = 'FileShareError';
    this.kind = kind;
  }
}

export type ShareFileOptions = {
  localUri: string;
  mimeType?: string | null;
  dialogTitle?: string;
  uti?: string;
};

async function ensureLocalFile(localUri: string) {
  const info = await FileSystem.getInfoAsync(localUri);

  if (!info.exists || info.isDirectory) {
    throw new FileShareError('missing', 'File tidak ditemukan atau sudah dihapus dari perangkat.');
  }

  return info;
}

export async function shareFile({
  localUri,
  mimeType,
  dialogTitle = 'Bagikan File',
  uti,
}: ShareFileOptions): Promise<void> {
  await ensureLocalFile(localUri);

  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    throw new FileShareError('share_unavailable', 'Fitur berbagi file tidak tersedia di perangkat ini.');
  }

  await Sharing.shareAsync(localUri, {
    dialogTitle,
    mimeType: mimeType || undefined,
    UTI: uti,
  });
}

export async function openFile(options: ShareFileOptions): Promise<void> {
  await ensureLocalFile(options.localUri);

  try {
    const canOpen = await Linking.canOpenURL(options.localUri);
    if (canOpen) {
      await Linking.openURL(options.localUri);
      return;
    }
  } catch {
    // Fall through to share sheet fallback below.
  }

  try {
    await shareFile(options);
  } catch (error) {
    if (error instanceof FileShareError && error.kind === 'share_unavailable') {
      throw new FileShareError(
        'open_unavailable',
        'Tidak ada aplikasi yang dapat membuka file ini di perangkat.'
      );
    }

    throw error;
  }
}
