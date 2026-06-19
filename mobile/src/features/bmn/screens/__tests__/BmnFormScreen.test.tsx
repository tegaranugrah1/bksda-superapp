import React from 'react';
import renderer, { act } from 'react-test-renderer';
import BmnFormScreen from '../BmnFormScreen';
import { useAssetDetail } from '../../useAssetDetail';
import { Alert } from 'react-native';

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockRouteParams = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    get params() {
      return mockRouteParams();
    },
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
      danger: '#dc2626',
      primaryForeground: '#ffffff',
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

// Mock useAssetDetail hook
jest.mock('../../useAssetDetail', () => ({
  useAssetDetail: jest.fn(),
}));

describe('BmnFormScreen', () => {
  const mockRefetch = jest.fn();
  const alertSpy = jest.spyOn(Alert, 'alert');

  const mockAsset = {
    id: '123',
    nama_barang: 'Laptop Asus Edit',
    kode_barang: 'BMN-10023-ROG',
    nup: 15,
    merk_tipe: 'Asus ROG G531',
    kondisi: 'Rusak Ringan',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.mockReturnValue(undefined); // default: Create mode
  });

  it('renders creation form correctly', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnFormScreen />);
    });

    const root = tree.root;
    
    // Title
    const headerTitle = root.findAllByType('Text').map((t: any) => t.props.children);
    expect(headerTitle).toContain('Tambah Aset BMN');

    // Section cards
    const sections = root.findAllByProps({ title: 'Informasi Dasar BMN' });
    expect(sections).toHaveLength(1);

    act(() => {
      tree.unmount();
    });
  });

  it('renders edit form with prefilled values after loading detail', () => {
    mockRouteParams.mockReturnValue({ id: '123' }); // Edit mode
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: mockAsset,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnFormScreen />);
    });

    const root = tree.root;

    // Header Title
    const headerTitle = root.findAllByType('Text').map((t: any) => t.props.children);
    expect(headerTitle).toContain('Ubah Aset BMN');

    // Verify form prefill fields
    const namaInput = root.findByProps({ label: 'Nama Barang *' });
    expect(namaInput.props.value).toBe('Laptop Asus Edit');

    const codeInput = root.findByProps({ label: 'Kode Barang *' });
    expect(codeInput.props.value).toBe('BMN-10023-ROG');

    const nupInput = root.findByProps({ label: 'NUP (Nomor Urut Pendaftaran) *' });
    expect(nupInput.props.value).toBe('15');

    act(() => {
      tree.unmount();
    });
  });

  it('renders loading skeleton in edit mode', () => {
    mockRouteParams.mockReturnValue({ id: '123' });
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnFormScreen />);
    });

    const root = tree.root;
    const skeleton = root.findByProps({ variant: 'detail' });
    expect(skeleton).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('submits form and triggers navigation back', async () => {
    mockRouteParams.mockReturnValue(undefined); // Create mode
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnFormScreen />);
    });

    const root = tree.root;

    // Populate required fields
    const namaInput = root.findByProps({ label: 'Nama Barang *' });
    const codeInput = root.findByProps({ label: 'Kode Barang *' });
    const nupInput = root.findByProps({ label: 'NUP (Nomor Urut Pendaftaran) *' });

    act(() => {
      namaInput.props.onChangeText('Aset Baru');
      codeInput.props.onChangeText('KODE-NEW');
      nupInput.props.onChangeText('45');
    });

    const submitBtn = root.findByProps({ title: 'Tambah Aset' });
    
    await act(async () => {
      submitBtn.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Tambah Aset',
      'Data aset BMN berhasil divalidasi.',
      expect.any(Array)
    );

    // Call the alert callback to trigger navigation
    const alertCallback = alertSpy.mock.calls[0][2]?.[0]?.onPress;
    if (alertCallback) {
      act(() => {
        alertCallback();
      });
      expect(mockGoBack).toHaveBeenCalled();
    }

    act(() => {
      tree.unmount();
    });
  });

  it('triggers navigation back when cancel button is clicked', () => {
    (useAssetDetail as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnFormScreen />);
    });

    const root = tree.root;
    const cancelBtn = root.findByProps({ accessibilityLabel: 'Batal' });
    expect(cancelBtn).toBeTruthy();

    act(() => {
      cancelBtn.props.onPress();
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });
});
