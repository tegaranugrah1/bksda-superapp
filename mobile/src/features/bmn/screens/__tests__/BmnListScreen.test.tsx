import React from 'react';
import renderer, { act } from 'react-test-renderer';
import BmnListScreen from '../BmnListScreen';
import { useAssets } from '../../useAssets';

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

// Mock useAssets hook
jest.mock('../../useAssets', () => ({
  useAssets: jest.fn(),
}));

describe('BmnListScreen', () => {
  const mockRefetch = jest.fn();
  const mockFetchNextPage = jest.fn();

  const mockAssets = [
    {
      id: 1,
      nama_barang: 'Laptop Asus',
      kode_barang: 'BMN-001',
      nup: 1,
      kondisi: 'Baik',
      lokasi: 'Seksi Wilayah I',
      is_verified: true,
    },
    {
      id: 2,
      nama_barang: 'Mobil Toyota',
      kode_barang: 'BMN-002',
      nup: 2,
      no_polisi: 'B 1234 SQA',
      kondisi: 'Baik',
      lokasi: 'Seksi Wilayah II',
      is_verified: false,
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders list header and search bar correctly', () => {
    (useAssets as jest.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnListScreen />);
    });

    const root = tree.root;

    // Check title and subtitle
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((n: any) => n.props.children);

    expect(texts).toContain('Daftar Aset BMN');
    expect(texts).toContain('Kelola dan pantau seluruh aset milik BKSDA');

    act(() => {
      tree.unmount();
    });
  });

  it('renders asset card items correctly', () => {
    (useAssets as jest.Mock).mockReturnValue({
      items: mockAssets,
      isLoading: false,
      isRefreshing: false,
      isFetchingNextPage: false,
      error: undefined,
      refetch: mockRefetch,
      fetchNextPage: mockFetchNextPage,
      hasNextPage: false,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<BmnListScreen />);
    });

    const root = tree.root;

    // Verify both items rendered
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.flat().map((n: any) => n.props.children);

    expect(texts).toContain('Laptop Asus');
    expect(texts).toContain('Mobil Toyota');

    act(() => {
      tree.unmount();
    });
  });
});
