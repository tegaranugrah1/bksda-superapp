import React from 'react';
import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import BmnDetailScreen from '../BmnDetailScreen';
import { useAssetDetail } from '../../useAssetDetail';
import { apiClient } from '@/lib/api/client';

// Mock AuthProvider hook
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      name: 'Admin User',
      username: 'admin',
      role: 'admin',
      access_modules: ['bmn', 'dr', 'inventory'],
    },
    logout: jest.fn(),
  }),
}));

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { id: '123' },
  }),
  useFocusEffect: (cb: any) => cb(),
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

// Mock ThemeContext hook
jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      cardBg: '#ffffff',
      textPrimary: '#000000',
      textSecondary: '#666666',
    },
    isDark: false,
  }),
}));

// Mock permissions hook
const mockCan = jest.fn().mockReturnValue(true);
const mockIsAdmin = jest.fn().mockReturnValue(true);
jest.mock('@/lib/permissions', () => ({
  usePermissions: () => ({
    can: mockCan,
    hasModule: () => true,
    isSuperAdmin: () => true,
    isAdmin: mockIsAdmin,
    user: { role: 'admin' },
  }),
}));

// Mock central API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    delete: jest.fn(),
    post: jest.fn(),
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

  it('renders loading state when loading details', () => {
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
    const loadingText = root.findAllByType('Text').map((n: any) => n.props.children).join(' ');
    expect(loadingText).toContain('Memuat detail aset BMN...');

    act(() => {
      tree.unmount();
    });
  });

  it('renders error state with retry when general error occurs', () => {
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
    const allText = root.findAllByType('Text').flat().map((n: any) => n.props.children).join(' ');
    expect(allText).toContain('Gagal Memuat Detail Aset');
    expect(allText).toContain('Koneksi database terputus');

    // Trigger retry
    const retryBtnText = root.findAllByType('Text').find((n: any) => n.props.children === 'Coba Lagi');
    expect(retryBtnText).toBeTruthy();

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
    expect(allText).toContain('Asus ROG G531');

    // Identity Section
    expect(allText).toContain('Identitas Barang');
    expect(allText).toContain('BMN-10023-ROG');
    expect(allText).toContain('Peralatan dan Mesin');

    // Location Section
    expect(allText).toContain('Lokasi & Pengguna');
    expect(allText).toContain('Ruang IT');

    // Document Section
    expect(allText).toContain('Foto & Dokumen');
    expect(allText).toContain('Tersedia');

    // Finance Section
    expect(allText).toContain('Finansial');
    expect(allText).toContain('15.000.000');

    // Organization Section
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

    // Verify presence of Foto & Dokumen tab label
    const allText = root.findAllByType('Text').flat().map((n: any) => n.props.children).join(' ');
    expect(allText).toContain('Foto & Dokumen');

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

  it('handles verify action successfully', async () => {
    const mockPost = apiClient.post as jest.Mock;
    mockPost.mockResolvedValueOnce({ data: {} });
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const confirmButton = buttons?.find((b) => b.text === 'Ya, Verifikasi');
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
      return {} as any;
    });

    (useAssetDetail as jest.Mock).mockReturnValue({
      data: {
        ...mockAsset,
        allowed_actions: { can_verify: true },
      },
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const verifyBtn = root.findByProps({ accessibilityLabel: 'Verifikasi Aset BMN' });
    expect(verifyBtn).toBeTruthy();

    await act(async () => {
      verifyBtn.props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Verifikasi BMN',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockPost).toHaveBeenCalledWith('/bmn/assets/123/verify');
    expect(mockRefetch).toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  it('handles return action successfully', async () => {
    const mockPost = apiClient.post as jest.Mock;
    mockPost.mockResolvedValueOnce({ data: {} });
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const confirmButton = buttons?.find((b) => b.text === 'Ya, Kembalikan');
      if (confirmButton && confirmButton.onPress) {
        confirmButton.onPress();
      }
      return {} as any;
    });

    (useAssetDetail as jest.Mock).mockReturnValue({
      data: {
        ...mockAsset,
        allowed_actions: { can_return: true },
        active_loan: { id: '456' },
      },
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const returnBtn = root.findByProps({ accessibilityLabel: 'Kembalikan Aset BMN' });
    expect(returnBtn).toBeTruthy();

    await act(async () => {
      returnBtn.props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Kembalikan Aset',
      expect.any(String),
      expect.any(Array)
    );
    expect(mockPost).toHaveBeenCalledWith('/bmn/loans/456/return');
    expect(mockRefetch).toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  it('navigates to BmnLoan screen when clicking loan button', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: {
        ...mockAsset,
        allowed_actions: { can_loan: true },
      },
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const loanBtn = root.findByProps({ accessibilityLabel: 'Ajukan Peminjaman Aset BMN' });
    expect(loanBtn).toBeTruthy();

    act(() => {
      loanBtn.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('BmnLoan', { assetId: '123' });

    act(() => {
      tree.unmount();
    });
  });

  it('navigates to edit form when clicking edit button', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: {
        ...mockAsset,
        allowed_actions: { can_edit: true },
      },
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnDetailScreen />);
    });

    const root = tree.root;
    const editBtn = root.findByProps({ accessibilityLabel: 'Ubah Data Aset BMN' });
    expect(editBtn).toBeTruthy();

    act(() => {
      editBtn.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('BmnForm', { id: '123' });

    act(() => {
      tree.unmount();
    });
  });
});
