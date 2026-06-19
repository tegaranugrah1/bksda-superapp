/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssetFilterSheet from '../AssetFilterSheet';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      primaryForeground: '#ffffff',
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

// Mock AppButton to isolate test
jest.mock('@/components/AppButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    AppButton: ({ title, onPress }: any) => (
      <TouchableOpacity onPress={onPress} testID={`btn-${title.toLowerCase().replace(/\s/g, '-')}`}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

describe('AssetFilterSheet', () => {
  const mockApply = jest.fn();
  const mockClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all section labels and options when visible', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetFilterSheet
          visible={true}
          onClose={mockClose}
          filters={{}}
          onApply={mockApply}
        />
      );
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((n: any) => n.props.children);

    expect(texts).toContain('Filter Aset BMN');
    expect(texts).toContain('Kondisi Barang');
    expect(texts).toContain('Jenis Barang (BMN)');
    expect(texts).toContain('Lokasi Wilayah/Ruang');

    // Verify option chips rendered
    expect(texts).toContain('Baik');
    expect(texts).toContain('Rusak Ringan');
    expect(texts).toContain('Kendaraan');
    expect(texts).toContain('Seksi Wilayah I');

    act(() => {
      tree.unmount();
    });
  });

  it('selects option chips and calls onApply with values when Terapkan is pressed', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetFilterSheet
          visible={true}
          onClose={mockClose}
          filters={{}}
          onApply={mockApply}
        />
      );
    });

    const root = tree.root;

    // Find all TouchableOpacity components representing chips and buttons
    const touchables = root.findAllByType(TouchableOpacity);

    // Let's find chip for 'Baik' (which is one of KONDISI_OPTIONS)
    const baikChip = touchables.find((t: any) => {
      const textNode = t.findByType('Text');
      return textNode.props.children === 'Baik';
    });

    // Let's find chip for 'Kendaraan' (which is one of JENIS_BMN_OPTIONS)
    const kendaraanChip = touchables.find((t: any) => {
      const textNode = t.findByType('Text');
      return textNode.props.children === 'Kendaraan';
    });

    expect(baikChip).toBeTruthy();
    expect(kendaraanChip).toBeTruthy();

    // Select options
    act(() => {
      baikChip.props.onPress();
    });
    act(() => {
      kendaraanChip.props.onPress();
    });

    // Find Apply button
    const applyBtn = root.findByProps({ testID: 'btn-terapkan' });
    expect(applyBtn).toBeTruthy();

    act(() => {
      applyBtn.props.onPress();
    });

    expect(mockApply).toHaveBeenCalledWith({
      kondisi: 'Baik',
      jenis_bmn: 'Kendaraan',
      lokasi_ruang: undefined,
    });
    expect(mockClose).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });

  it('clears all options when Hapus Semua is pressed', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AssetFilterSheet
          visible={true}
          onClose={mockClose}
          filters={{ kondisi: 'Baik', jenis_bmn: 'Kendaraan' }}
          onApply={mockApply}
        />
      );
    });

    const root = tree.root;

    // Find Clear button
    const clearBtn = root.findByProps({ testID: 'btn-hapus-semua' });
    act(() => {
      clearBtn.props.onPress();
    });

    // Find Apply button
    const applyBtn = root.findByProps({ testID: 'btn-terapkan' });
    act(() => {
      applyBtn.props.onPress();
    });

    expect(mockApply).toHaveBeenCalledWith({
      kondisi: undefined,
      jenis_bmn: undefined,
      lokasi_ruang: undefined,
    });

    act(() => {
      tree.unmount();
    });
  });
});
