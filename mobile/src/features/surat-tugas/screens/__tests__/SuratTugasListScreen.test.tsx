import React from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import SuratTugasListScreen from '../SuratTugasListScreen';
import { useAssignments } from '../../useAssignments';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      primaryForeground: '#ffffff',
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
        xl: 20,
      },
    },
  }),
}));

jest.mock('@/lib/permissions', () => ({
  usePermissions: jest.fn(() => ({
    hasModule: (moduleName: string) => moduleName === 'surat_tugas',
  })),
}));

jest.mock('../../useAssignments', () => ({
  useAssignments: jest.fn(),
}));

describe('SuratTugasListScreen', () => {
  const mockAssignments = [
    {
      id: 'st-1',
      nomor: 'ST.001/BKSDA/2026',
      kegiatan: 'Patroli kawasan',
      tujuan: 'Samarinda',
      tanggal_mulai: '2026-06-20',
      tanggal_selesai: '2026-06-21',
      status: 'approved',
      personel_summary: 'Pegawai Satu',
    },
  ];
  const mockRefetch = jest.fn();
  const mockFetchNextPage = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (useAssignments as jest.Mock).mockReturnValue({
      items: mockAssignments,
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders header, personal mode label, search, status filters, and cards', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);

    expect(texts).toContain('Surat Tugas');
    expect(texts).toContain('Mode Personal');
    expect(texts).toContain('Personal');
    expect(texts).toContain('Manajemen');
    expect(texts).toContain('Semua');
    expect(texts).toContain('Menunggu');
    expect(texts).toContain('ST.001/BKSDA/2026');
    expect(texts).toContain('Patroli kawasan');

    const searchInput = tree!.root.findByProps({ placeholder: 'Cari nomor, kegiatan, atau tujuan...' });
    expect(searchInput).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('switches to management mode when the management control is pressed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const managementButton = tree!.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.props.accessibilityLabel === 'Tampilkan surat tugas manajemen');

    act(() => {
      managementButton?.props.onPress();
    });

    expect(useAssignments).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'management',
      })
    );

    act(() => {
      tree!.unmount();
    });
  });

  it('debounces search before passing it to useAssignments', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    (useAssignments as jest.Mock).mockClear();

    const searchInput = tree!.root.findByProps({ placeholder: 'Cari nomor, kegiatan, atau tujuan...' });
    act(() => {
      searchInput.props.onChangeText('patroli');
    });

    expect(useAssignments).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: '',
      })
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(useAssignments).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'patroli',
      })
    );

    act(() => {
      tree!.unmount();
    });
  });

  it('renders loading skeleton when initial list is loading', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      items: [],
      isLoading: true,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const skeleton = tree!.root.findByProps({ variant: 'card' });
    expect(skeleton.props.count).toBe(3);

    act(() => {
      tree!.unmount();
    });
  });

  it('renders error state separately from empty state and retries', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: { message: 'Gagal dari server' },
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const errorState = tree!.root.findByProps({ title: 'Gagal Memuat Surat Tugas' });
    expect(errorState.props.message).toBe('Gagal dari server');

    act(() => {
      errorState.props.onRetry();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);

    act(() => {
      tree!.unmount();
    });
  });

  it('renders empty state when there are no assignments', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const emptyState = tree!.root.findByProps({ title: 'Tidak Ada Surat Tugas' });
    expect(emptyState.props.message).toContain('Surat tugas tidak ditemukan');

    act(() => {
      tree!.unmount();
    });
  });

  it('wires pull-to-refresh and next-page loading to FlatList', () => {
    (useAssignments as jest.Mock).mockReturnValue({
      items: mockAssignments,
      isLoading: false,
      isRefreshing: true,
      isFetchingNextPage: true,
      error: undefined,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: true,
    });

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const list = tree!.root.findByType(FlatList);
    expect(list.props.refreshing).toBe(true);

    act(() => {
      list.props.onRefresh();
      list.props.onEndReached();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
    expect(tree!.root.findByType(ActivityIndicator)).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('opens assignment detail when a card is pressed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<SuratTugasListScreen />);
    });

    const card = tree!.root.findByProps({
      accessibilityLabel: 'Surat Tugas: ST.001/BKSDA/2026. Patroli kawasan',
    });

    act(() => {
      card.props.onPress();
    });

    expect(mockNavigate).toHaveBeenCalledWith('AssignmentDetail', {
      id: 'st-1',
      mode: 'personal',
    });

    act(() => {
      tree!.unmount();
    });
  });
});
