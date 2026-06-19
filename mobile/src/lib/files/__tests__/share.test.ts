import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking } from 'react-native';
import { FileShareError, openFile, shareFile } from '../share';

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('file share helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      isDirectory: false,
      uri: 'file:///cache/surat-tugas.pdf',
      size: 1024,
      modificationTime: 1,
    });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('opens a share sheet for an existing local file', async () => {
    await shareFile({
      localUri: 'file:///cache/surat-tugas.pdf',
      mimeType: 'application/pdf',
      dialogTitle: 'Bagikan Surat Tugas',
      uti: 'com.adobe.pdf',
    });

    expect(FileSystem.getInfoAsync).toHaveBeenCalledWith('file:///cache/surat-tugas.pdf');
    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/surat-tugas.pdf', {
      dialogTitle: 'Bagikan Surat Tugas',
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
    });
  });

  it('throws a friendly missing-file error before sharing', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: false,
      isDirectory: false,
    });

    await expect(shareFile({ localUri: 'file:///cache/missing.pdf' })).rejects.toMatchObject({
      kind: 'missing',
      message: 'File tidak ditemukan atau sudah dihapus dari perangkat.',
    });
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('throws a friendly error when share sheet is unavailable', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    await expect(shareFile({ localUri: 'file:///cache/surat-tugas.pdf' })).rejects.toMatchObject({
      kind: 'share_unavailable',
      message: 'Fitur berbagi file tidak tersedia di perangkat ini.',
    });
  });

  it('opens an existing file with the device viewer when available', async () => {
    await openFile({ localUri: 'file:///cache/surat-tugas.pdf' });

    expect(Linking.canOpenURL).toHaveBeenCalledWith('file:///cache/surat-tugas.pdf');
    expect(Linking.openURL).toHaveBeenCalledWith('file:///cache/surat-tugas.pdf');
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('falls back to share sheet when no direct viewer can open the file', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);

    await openFile({ localUri: 'file:///cache/surat-tugas.pdf' });

    expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/surat-tugas.pdf', {
      dialogTitle: 'Bagikan File',
      mimeType: undefined,
      UTI: undefined,
    });
  });

  it('maps unavailable viewer and share sheet to a friendly open error', async () => {
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

    await expect(openFile({ localUri: 'file:///cache/surat-tugas.pdf' })).rejects.toBeInstanceOf(
      FileShareError
    );
    await expect(openFile({ localUri: 'file:///cache/surat-tugas.pdf' })).rejects.toMatchObject({
      kind: 'open_unavailable',
      message: 'Tidak ada aplikasi yang dapat membuka file ini di perangkat.',
    });
  });
});
