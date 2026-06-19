import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AlertCard from '../AlertCard';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      danger: '#ef4444',
      border: '#e2e8f0',
      foreground: '#09090b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
    },
    spacing: {
      lg: 16,
    },
    radius: {
      xl: 12,
      sm: 4,
    },
    typography: {
      fontFamilies: {
        sans: 'System',
      },
      fontWeights: {
        bold: '700',
        semibold: '600',
      },
    },
  }),
}));

describe('AlertCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders null when vehicles list is empty', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AlertCard vehicles={[]} />);
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders vehicles with plate numbers and due dates correctly', () => {
    const mockVehicles = [
      {
        id: 1,
        nama_barang: 'Mobil Toyota Hilux',
        no_polisi: 'B 1234 SQA',
        tanggal_pajak_stnk: '2026-07-05',
      },
      {
        id: 2,
        nama_barang: 'Motor Honda CRF',
        no_polisi: 'B 5678 SQA',
        tanggal_pajak_stnk: '2026-07-12',
      },
    ];

    let tree: any;
    act(() => {
      tree = renderer.create(<AlertCard vehicles={mockVehicles} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((n: any) => n.props.children);

    expect(texts).toContain('Perhatian: Pajak STNK Segera Jatuh Tempo');
    expect(texts).toContain('Mobil Toyota Hilux');
    expect(texts).toContain('B 1234 SQA');
    expect(texts).toContain('Jatuh Tempo: 2026-07-05');
    expect(texts).toContain('Motor Honda CRF');
    expect(texts).toContain('B 5678 SQA');
    expect(texts).toContain('Jatuh Tempo: 2026-07-12');

    act(() => {
      tree.unmount();
    });
  });
});
