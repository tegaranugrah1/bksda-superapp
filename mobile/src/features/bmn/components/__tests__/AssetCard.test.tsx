import React from 'react';
import { TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssetCard from '../AssetCard';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#e2e8f0',
      muted: '#f1f5f9',
      foreground: '#09090b',
      mutedForeground: '#64748b',
    },
    spacing: {
      lg: 16,
      md: 12,
      sm: 8,
      xs: 4,
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
        medium: '500',
      },
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
      },
    },
  }),
}));

describe('AssetCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockAsset = {
    id: 1,
    nama_barang: 'Laptop Asus ROG',
    kode_barang: 'BMN-001',
    nup: 5,
    merk_tipe: 'ROG Zephyrus G14',
    kondisi: 'Baik',
    lokasi: 'Seksi Wilayah I',
    is_verified: true,
  };

  it('renders all asset details correctly including badges', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetCard asset={mockAsset} onPress={jest.fn()} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((n: any) => n.props.children);

    expect(texts).toContain('Laptop Asus ROG');
    expect(texts).toContain('BMN-001 / NUP 5');
    expect(texts).toContain('Merk/Tipe: ROG Zephyrus G14');
    expect(texts).toContain('📍 Seksi Wilayah I');
    expect(texts).toContain('Baik');
    expect(texts).toContain('Terverifikasi');

    // Should NOT show Plat No
    expect(texts.some((t: any) => typeof t === 'string' && t.includes('Plat No'))).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  it('renders plate number badge if no_polisi is present', () => {
    const assetWithPlate = {
      ...mockAsset,
      no_polisi: 'B 1234 SQA',
    };

    let tree: any;
    act(() => {
      tree = renderer.create(<AssetCard asset={assetWithPlate} onPress={jest.fn()} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((n: any) => n.props.children);

    expect(texts).toContain('Plat No: B 1234 SQA');

    act(() => {
      tree.unmount();
    });
  });

  it('triggers onPress callback when card is pressed', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetCard asset={mockAsset} onPress={handlePress} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const touchable = root.findByType(TouchableOpacity);
    
    act(() => {
      touchable.props.onPress();
    });

    expect(handlePress).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });
});
