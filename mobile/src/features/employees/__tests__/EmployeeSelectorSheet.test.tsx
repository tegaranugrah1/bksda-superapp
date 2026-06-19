import React from 'react';
import { ActivityIndicator, FlatList, Modal, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import EmployeeSelectorSheet from '../EmployeeSelectorSheet';
import { useEmployeeSearch } from '../useEmployeeSearch';

jest.mock('../useEmployeeSearch', () => ({
  useEmployeeSearch: jest.fn(),
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
      danger: '#dc2626',
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
      xxl: 24,
    },
    radius: {
      md: 6,
      lg: 8,
      xl: 12,
      full: 9999,
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
        xxxl: 32,
      },
    },
  }),
}));

describe('EmployeeSelectorSheet', () => {
  const employees = [
    {
      id: 1,
      name: 'Pegawai Satu',
      nip: '199001012020011001',
      jabatan: 'Polhut',
      unit_kerja: 'BKSDA Kaltim',
    },
    {
      id: 2,
      name: 'Pegawai Dua',
      nip: '199101012020011002',
      jabatan: 'Analis',
      unit_kerja: 'Seksi Wilayah I',
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useEmployeeSearch as jest.Mock).mockReturnValue({
      items: employees,
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders employee name, NIP, jabatan, and unit summary', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EmployeeSelectorSheet visible onClose={jest.fn()} onSelect={jest.fn()} />
      );
    });

    expect(tree!.root.findByType(Modal).props.visible).toBe(true);
    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Pilih Pegawai');
    expect(texts).toContain('Pegawai Satu');
    expect(texts).toContain('199001012020011001 • Polhut • BKSDA Kaltim');

    act(() => {
      tree!.unmount();
    });
  });

  it('selects an employee and closes the sheet', () => {
    const handleSelect = jest.fn();
    const handleClose = jest.fn();

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EmployeeSelectorSheet visible onClose={handleClose} onSelect={handleSelect} />
      );
    });

    const employeeButton = tree!.root.findByProps({ accessibilityLabel: 'Pilih pegawai Pegawai Satu' });
    act(() => {
      employeeButton.props.onPress();
    });

    expect(handleSelect).toHaveBeenCalledWith(employees[0]);
    expect(handleClose).toHaveBeenCalledTimes(1);

    act(() => {
      tree!.unmount();
    });
  });

  it('passes debounced search text to useEmployeeSearch', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EmployeeSelectorSheet visible onClose={jest.fn()} onSelect={jest.fn()} />
      );
    });

    const searchInput = tree!.root.findByProps({ accessibilityLabel: 'Cari pegawai' });
    act(() => {
      searchInput.props.onChangeText('199001');
    });

    expect(useEmployeeSearch).toHaveBeenLastCalledWith({ search: '', per_page: 20 });

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(useEmployeeSearch).toHaveBeenLastCalledWith({ search: '199001', per_page: 20 });

    act(() => {
      tree!.unmount();
    });
  });

  it('wires pagination and refresh callbacks to FlatList', () => {
    const refetch = jest.fn();
    const fetchNextPage = jest.fn();
    (useEmployeeSearch as jest.Mock).mockReturnValue({
      items: employees,
      isLoading: false,
      isRefreshing: true,
      isFetchingNextPage: true,
      error: undefined,
      refetch,
      fetchNextPage,
      hasNextPage: true,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <EmployeeSelectorSheet visible onClose={jest.fn()} onSelect={jest.fn()} />
      );
    });

    const list = tree!.root.findByType(FlatList);
    act(() => {
      list.props.onRefresh();
      list.props.onEndReached();
    });

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(tree!.root.findByType(ActivityIndicator)).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('renders loading, empty, and error states', () => {
    (useEmployeeSearch as jest.Mock).mockReturnValueOnce({
      items: [],
      isLoading: true,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    let loadingTree: renderer.ReactTestRenderer;
    act(() => {
      loadingTree = renderer.create(
        <EmployeeSelectorSheet visible onClose={jest.fn()} onSelect={jest.fn()} />
      );
    });
    expect(loadingTree!.root.findByType(ActivityIndicator)).toBeTruthy();
    act(() => loadingTree!.unmount());

    (useEmployeeSearch as jest.Mock).mockReturnValueOnce({
      items: [],
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    let emptyTree: renderer.ReactTestRenderer;
    act(() => {
      emptyTree = renderer.create(
        <EmployeeSelectorSheet visible onClose={jest.fn()} onSelect={jest.fn()} />
      );
    });
    expect(emptyTree!.root.findByProps({ title: 'Pegawai Tidak Ditemukan' })).toBeTruthy();
    act(() => emptyTree!.unmount());

    (useEmployeeSearch as jest.Mock).mockReturnValueOnce({
      items: [],
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: { kind: 'server', message: 'Server error', status: 500 },
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
    });

    let errorTree: renderer.ReactTestRenderer;
    act(() => {
      errorTree = renderer.create(
        <EmployeeSelectorSheet visible onClose={jest.fn()} onSelect={jest.fn()} />
      );
    });
    expect(errorTree!.root.findByProps({ title: 'Gagal Memuat Pegawai' })).toBeTruthy();
    act(() => errorTree!.unmount());
  });
});
