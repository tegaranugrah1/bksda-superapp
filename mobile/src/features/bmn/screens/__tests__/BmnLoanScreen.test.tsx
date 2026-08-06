import React from 'react';
import { Alert } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import BmnLoanScreen from '../BmnLoanScreen';
import { apiClient } from '@/lib/api/client';

// Mock navigation hooks
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: { assetId: '123' },
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

// Mock central API client
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const VALID_UUID_1 = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('BmnLoanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correct initial form fields', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<BmnLoanScreen />);
    });

    const root = tree.root;

    // Check title
    const headerTitle = root.findAllByType('Text').map((n: any) => n.props.children);
    expect(headerTitle).toContain('Form Peminjaman BMN');

    // Check presence of Search Input
    const searchInput = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });
    expect(searchInput).toBeTruthy();

    // Check presence of Date Input
    const dateInput = root.findByProps({ label: 'Tanggal Pinjam (YYYY-MM-DD) *' });
    expect(dateInput).toBeTruthy();
    
    // Default value should be today string (YYYY-MM-DD)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(dateInput.props.value).toBe(todayStr);

    // Check presence of Keterangan Input
    const descInput = root.findByProps({ label: 'Keterangan / Keperluan Peminjaman' });
    expect(descInput).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('searches and lists employee suggestions upon query change', async () => {
    const mockGet = apiClient.get as jest.Mock;
    const mockEmployees = [
      { id: VALID_UUID_1, name: 'Budi Santoso', nip: '19900101', position: 'Staf IT', department: 'Balai BKSDA' },
      { id: VALID_UUID_2, name: 'Bambang', nip: '19900102', position: 'Pengendali Ekosistem', department: 'Seksi I' },
    ];
    mockGet.mockResolvedValueOnce({ data: { data: mockEmployees } });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnLoanScreen />);
    });

    const root = tree.root;
    const searchInput = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });

    // Change text to trigger search
    act(() => {
      searchInput.props.onChangeText('Budi');
    });

    // Wait for debounce timeout
    await act(async () => {
      await sleep(450);
    });

    expect(mockGet).toHaveBeenCalledWith('/kepegawaian/employees/select?q=Budi');

    // Suggestions should render
    const allText = root.findAllByType('Text').flat().map((n: any) => n.props.children).join(' ');
    expect(allText).toContain('Budi Santoso');
    expect(allText).toContain('Bambang');

    act(() => {
      tree.unmount();
    });
  });

  it('allows selecting an employee and resets suggestions', async () => {
    const mockGet = apiClient.get as jest.Mock;
    const mockEmployees = [
      { id: VALID_UUID_1, name: 'Budi Santoso', nip: '19900101', position: 'Staf IT', department: 'Balai BKSDA' },
    ];
    mockGet.mockResolvedValueOnce({ data: { data: mockEmployees } });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnLoanScreen />);
    });

    const root = tree.root;
    const searchInput = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });

    act(() => {
      searchInput.props.onChangeText('Budi');
    });

    await act(async () => {
      await sleep(450);
    });

    const selectBtn = root.findByProps({ accessibilityLabel: 'Pilih Budi Santoso' });
    expect(selectBtn).toBeTruthy();

    // Select employee
    await act(async () => {
      selectBtn.props.onPress();
    });

    // Check if employee details card is rendered
    const allText = root.findAllByType('Text').flat().map((n: any) => n.props.children).join(' ');
    expect(allText).toContain('Budi Santoso');
    expect(allText).toContain('19900101');
    expect(allText).toContain('Balai BKSDA');

    // Suggestion picker and search input should be gone
    expect(() => root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' })).toThrow();

    act(() => {
      tree.unmount();
    });
  });

  it('allows clearing selected employee to search again', async () => {
    const mockGet = apiClient.get as jest.Mock;
    const mockEmployees = [
      { id: VALID_UUID_1, name: 'Budi Santoso', nip: '19900101', position: 'Staf IT', department: 'Balai BKSDA' },
    ];
    mockGet.mockResolvedValueOnce({ data: { data: mockEmployees } });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnLoanScreen />);
    });

    const root = tree.root;
    const searchInput = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });

    act(() => {
      searchInput.props.onChangeText('Budi');
    });

    await act(async () => {
      await sleep(450);
    });

    const selectBtn = root.findByProps({ accessibilityLabel: 'Pilih Budi Santoso' });
    await act(async () => {
      selectBtn.props.onPress();
    });

    const clearBtn = root.findByProps({ accessibilityLabel: 'Ubah Pegawai' });
    expect(clearBtn).toBeTruthy();

    // Clear selection
    await act(async () => {
      clearBtn.props.onPress();
    });

    // Search input should be visible again
    const searchInputReappeared = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });
    expect(searchInputReappeared).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('submits loan form successfully', async () => {
    const mockPost = apiClient.post as jest.Mock;
    mockPost.mockResolvedValueOnce({ data: {} });
    jest.spyOn(Alert, 'alert');

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnLoanScreen />);
    });

    const root = tree.root;

    // Simulate pre-selected employee
    const searchInput = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });
    const mockGet = apiClient.get as jest.Mock;
    mockGet.mockResolvedValueOnce({ data: { data: [{ id: VALID_UUID_1, name: 'Budi Santoso', nip: '19900101' }] } });

    act(() => {
      searchInput.props.onChangeText('Budi');
    });

    await act(async () => {
      await sleep(450);
    });

    const selectBtn = root.findByProps({ accessibilityLabel: 'Pilih Budi Santoso' });
    await act(async () => {
      selectBtn.props.onPress();
    });

    // Fill notes
    const descInput = root.findByProps({ label: 'Keterangan / Keperluan Peminjaman' });
    act(() => {
      descInput.props.onChangeText('Untuk survei lapangan');
    });

    // Press Submit button
    const submitBtn = root.findByProps({ accessibilityLabel: 'Submit Peminjaman BMN' });
    
    await act(async () => {
      submitBtn.props.onPress();
    });

    expect(mockPost).toHaveBeenCalledWith('/bmn/assets/123/loans', {
      employee_id: VALID_UUID_1,
      tanggal_pinjam: expect.any(String),
      keterangan: 'Untuk survei lapangan',
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sukses',
      'Aset berhasil dipinjamkan.',
      expect.any(Array)
    );

    // Call navigation callback from Alert button click
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    act(() => {
      buttons[0].onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('BmnDetail', { id: '123' });

    act(() => {
      tree.unmount();
    });
  });

  it('displays API field validation errors from backend response', async () => {
    const mockPost = apiClient.post as jest.Mock;
    mockPost.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Validation failed',
          errors: {
            tanggal_pinjam: ['Tanggal pinjam tidak boleh di masa mendatang.'],
          },
        },
      },
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnLoanScreen />);
    });

    const root = tree.root;

    // Simulate pre-selected employee
    const searchInput = root.findByProps({ label: 'Cari Pegawai (Nama / NIP) *' });
    const mockGet = apiClient.get as jest.Mock;
    mockGet.mockResolvedValueOnce({ data: { data: [{ id: VALID_UUID_1, name: 'Budi Santoso', nip: '19900101' }] } });

    act(() => {
      searchInput.props.onChangeText('Budi');
    });

    await act(async () => {
      await sleep(450);
    });

    const selectBtn = root.findByProps({ accessibilityLabel: 'Pilih Budi Santoso' });
    await act(async () => {
      selectBtn.props.onPress();
    });

    // Press Submit
    const submitBtn = root.findByProps({ accessibilityLabel: 'Submit Peminjaman BMN' });
    
    await act(async () => {
      submitBtn.props.onPress();
    });

    // Verify error prop is set on Tanggal Pinjam input
    const dateInput = root.findByProps({ label: 'Tanggal Pinjam (YYYY-MM-DD) *' });
    expect(dateInput.props.error).toBe('Tanggal pinjam tidak boleh di masa mendatang.');

    act(() => {
      tree.unmount();
    });
  });
});
