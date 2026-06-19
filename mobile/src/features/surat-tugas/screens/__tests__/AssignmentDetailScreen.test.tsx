import React from 'react';
import { Alert, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssignmentDetailScreen from '../AssignmentDetailScreen';
import { useAssignmentDetail } from '../../useAssignmentDetail';

const mockGoBack = jest.fn();
let mockRouteParams: { id: string | number; mode?: 'personal' | 'management' } = {
  id: 'st-1',
  mode: 'personal',
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      foreground: '#09090b',
      card: '#ffffff',
      border: '#e2e8f0',
      mutedForeground: '#64748b',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
    },
    radius: {
      lg: 8,
      full: 9999,
    },
    shadows: {
      sm: {},
    },
    typography: {
      fontFamilies: {
        sans: 'System',
      },
      fontWeights: {
        bold: '700',
        semibold: '600',
        medium: '500',
      },
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
      },
    },
  }),
}));

jest.mock('../../useAssignmentDetail', () => ({
  useAssignmentDetail: jest.fn(),
}));

describe('AssignmentDetailScreen', () => {
  const refetch = jest.fn();
  const assignment = {
    id: 'st-1',
    nomor: 'ST.001/BKSDA/2026',
    kode_surat: 'ST',
    kegiatan: 'Patroli kawasan',
    dasar_hukum: 'Dasar hukum perjalanan dinas',
    tujuan: 'Samarinda',
    tanggal_mulai: '2026-06-20',
    tanggal_selesai: '2026-06-21',
    tanggal_surat: '2026-06-19',
    status: 'approved',
    sumber_dana: 'DIPA',
    template_type: 'default',
    personel: [{ id: 1, name: 'Pegawai Satu', nip: '199001012020011001' }],
    file: {
      available: true,
      download_url: '/api/surat-tugas/my/st-1/download',
    },
    allowed_actions: {
      can_view: true,
      can_download: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { id: 'st-1', mode: 'personal' };
    (useAssignmentDetail as jest.Mock).mockReturnValue({
      data: assignment,
      isLoading: false,
      error: undefined,
      refetch,
      isForbidden: false,
      isNotFound: false,
    });
  });

  it('renders detail sections and gated file action when file is allowed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentDetailScreen />);
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Detail Surat Tugas');
    expect(texts).toContain('ST.001/BKSDA/2026');
    expect(texts).toContain('Tanggal & Tujuan');
    expect(texts).toContain('Personel');
    expect(texts).toContain('Isi Surat');
    expect(texts).toContain('Berkas');
    expect(texts).toContain('Status & Aksi');
    expect(texts).toContain('Unduh Berkas');
    expect(useAssignmentDetail).toHaveBeenCalledWith('st-1', 'personal');

    act(() => {
      tree!.unmount();
    });
  });

  it('hides file action when backend does not allow download', () => {
    (useAssignmentDetail as jest.Mock).mockReturnValue({
      data: {
        ...assignment,
        allowed_actions: { can_view: true, can_download: false },
      },
      isLoading: false,
      error: undefined,
      refetch,
      isForbidden: false,
      isNotFound: false,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentDetailScreen />);
    });

    expect(
      tree!.root.findAllByProps({ accessibilityLabel: 'Unduh berkas Surat Tugas' })
    ).toHaveLength(0);

    act(() => {
      tree!.unmount();
    });
  });

  it('renders loading skeleton while loading', () => {
    (useAssignmentDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch,
      isForbidden: false,
      isNotFound: false,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentDetailScreen />);
    });

    expect(tree!.root.findByProps({ variant: 'detail' })).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('renders forbidden state without retry', () => {
    (useAssignmentDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Forbidden', kind: 'forbidden', status: 403 },
      refetch,
      isForbidden: true,
      isNotFound: false,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentDetailScreen />);
    });

    const errorState = tree!.root.findByProps({ title: 'Akses Ditolak' });
    expect(errorState.props.onRetry).toBeUndefined();

    act(() => {
      tree!.unmount();
    });
  });

  it('shows download placeholder alert when file action is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentDetailScreen />);
    });

    const downloadButton = tree!.root.findByProps({ accessibilityLabel: 'Unduh berkas Surat Tugas' });
    act(() => {
      downloadButton.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Unduh Surat Tugas',
      'Fitur unduh berkas akan disiapkan pada task file download berikutnya.'
    );

    alertSpy.mockRestore();
    act(() => {
      tree!.unmount();
    });
  });
});
