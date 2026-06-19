import React from 'react';
import renderer, { act } from 'react-test-renderer';
import BmnDetailScreen from '../BmnDetailScreen';
import { useAssetDetail } from '../../useAssetDetail';

// Mock navigation hooks
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { id: '123' },
  }),
}));

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      foreground: '#09090b',
      muted: '#f1f5f9',
      border: '#e2e8f0',
      card: '#ffffff',
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
      sm: 4,
      md: 6,
      lg: 8,
      xl: 12,
      full: 9999,
    },
    shadows: {
      sm: {},
      md: {},
      lg: {},
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
        xl: 20,
      },
    },
  }),
}));

// Mock central API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    delete: jest.fn(),
  },
}));

// Mock useAssetDetail hook
jest.mock('../../useAssetDetail', () => ({
  useAssetDetail: jest.fn(),
}));

describe('BmnDetailScreen', () => {
  const mockRefetch = jest.fn();

  const mockAsset = {
    id: '123',
    nama_barang: 'Laptop Asus ROG',
    kode_barang: 'BMN-10023-ROG',
    nup: 15,
    merk_tipe: 'Asus ROG G531',
    kondisi: 'Baik',
    is_verified: true,
    merk: 'Asus',
    tipe: 'ROG G531',
    no_rangka: 'RNGK12345678',
    no_mesin: 'MSN98765432',
    no_polisi: 'B 7777 ABC',
    lokasi: 'Kantor Balai',
    lokasi_ruang: 'Ruang IT',
    penanggung_jawab: {
      id: 5,
      nama_lengkap: 'Budi Santoso',
      nip: '199001012015031001',
    },
    tanggal_pembelian: '2023-05-15',
    nilai_perolehan: 15000000,
    jenis_bmn: 'Peralatan dan Mesin',
    bpkb_1: 'BPKB_LINK_1',
    stnk_1: 'STNK_LINK_1',
    tanggal_pajak_stnk: '2026-12-31',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders LoadingSkeleton when loading details', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const skeleton = root.findByProps({ variant: 'detail' });
    expect(skeleton).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('renders ErrorState with retry when general error occurs', () => {
    const mockError = { kind: 'server', message: 'Koneksi database terputus' };
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const errorState = root.findByProps({ title: 'Gagal Memuat Detail Aset' });
    expect(errorState).toBeTruthy();
    expect(errorState.props.message).toBe('Koneksi database terputus');

    // Trigger retry
    act(() => {
      errorState.props.onRetry();
    });
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });

  it('renders forbidden ErrorState without retry option', () => {
    const mockError = { kind: 'forbidden', message: 'Forbidden access' };
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const errorState = root.findByProps({ title: 'Akses Ditolak' });
    expect(errorState).toBeTruthy();
    expect(errorState.props.message).toBe('Anda tidak memiliki akses untuk melihat detail aset ini.');
    expect(errorState.props.onRetry).toBeUndefined();

    act(() => {
      tree.unmount();
    });
  });

  it('renders not_found ErrorState without retry option', () => {
    const mockError = { kind: 'not_found', message: 'Not found' };
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const errorState = root.findByProps({ title: 'Aset Tidak Ditemukan' });
    expect(errorState).toBeTruthy();
    expect(errorState.props.message).toBe('Detail aset yang Anda cari tidak ditemukan.');
    expect(errorState.props.onRetry).toBeUndefined();

    act(() => {
      tree.unmount();
    });
  });

  it('renders all sections and custom header with correct data upon success', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: mockAsset,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;

    // Check title in custom header
    const headerTitleText = root.findAllByType('Text').map((n: any) => n.props.children);
    expect(headerTitleText).toContain('Detail Aset BMN');

    // Verify presence of all sections by checking key labels
    const allText = root.findAllByType('Text').flat().map((n: any) => n.props.children).join(' ');
    
    // Summary Section
    expect(allText).toContain('Laptop Asus ROG');
    expect(allText).toContain('Merk/Tipe: Asus ROG G531');

    // Identity Section
    expect(allText).toContain('Identitas Barang');
    expect(allText).toContain('RNGK12345678');
    expect(allText).toContain('MSN98765432');

    // Location Section
    expect(allText).toContain('Lokasi');
    expect(allText).toContain('Kantor Balai');
    expect(allText).toContain('Ruang IT');

    // Document Section
    expect(allText).toContain('Dokumen');
    expect(allText).toContain('BPKB Tersedia');
    expect(allText).toContain('STNK Tersedia');

    // Finance Section
    expect(allText).toContain('Informasi Keuangan');
    expect(allText).toContain('Rp 15.000.000');

    // Organization Section
    expect(allText).toContain('Organisasi & Pengguna');
    expect(allText).toContain('Budi Santoso');

    act(() => {
      tree.unmount();
    });
  });

  it('renders photo slots section upon success', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: mockAsset,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;

    // Verify presence of Foto Fisik BMN card title
    const allText = root.findAllByType('Text').flat().map((n: any) => n.props.children).join(' ');
    expect(allText).toContain('Foto Fisik BMN');

    act(() => {
      tree.unmount();
    });
  });

  it('navigates back when clicking the back button in header', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: mockAsset,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    
    // Find back button by accessibility label
    const backBtn = root.findByProps({ accessibilityLabel: 'Kembali' });
    expect(backBtn).toBeTruthy();

    act(() => {
      backBtn.props.onPress();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });
});
