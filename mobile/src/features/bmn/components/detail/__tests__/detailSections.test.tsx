/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AssetSummarySection } from '../AssetSummarySection';
import { AssetIdentitySection } from '../AssetIdentitySection';
import { AssetLocationSection } from '../AssetLocationSection';
import { AssetDocumentSection } from '../AssetDocumentSection';
import { AssetFinanceSection } from '../AssetFinanceSection';
import { AssetOrganizationSection } from '../AssetOrganizationSection';
import { AssetDetail } from '../../../types';

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

// Mock SectionCard component
jest.mock('@/components/SectionCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    SectionCard: ({ title, children }: any) => (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    ),
  };
});

describe('BMN Detail Section Components', () => {
  const mockAssetDetail: AssetDetail = {
    id: 1,
    nama_barang: 'Laptop Asus ROG',
    kode_barang: 'BMN-001',
    nup: 5,
    merk_tipe: 'ROG Zephyrus G14',
    kondisi: 'Baik',
    lokasi: 'Seksi Wilayah I',
    lokasi_ruang: 'Ruang IT',
    is_verified: true,
    pengguna: 'Andi',
    no_polisi: 'B 1234 SQA',
    no_rangka: 'R-123',
    no_mesin: 'M-456',
    bpkb_1: 'bpkb_file.pdf',
    stnk_1: 'stnk_file.pdf',
    tanggal_pajak_stnk: '2026-12-31',
    nilai_perolehan: 15000000,
    tanggal_pembelian: '2025-01-15',
    penanggung_jawab: {
      id: 10,
      nama_lengkap: 'Hardi',
      nip: '199001012015011002',
    },
  };

  it('renders AssetSummarySection correctly', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetSummarySection asset={mockAssetDetail} />);
    });
    const root = tree.root;
    const texts = root.findAllByType('Text').map((n: any) => n.props.children);

    expect(texts).toContain('Laptop Asus ROG');
    expect(texts).toContain('Merk/Tipe: ROG Zephyrus G14');
    expect(texts).toContain('Baik');
    expect(texts).toContain('Terverifikasi');

    act(() => {
      tree.unmount();
    });
  });

  it('renders AssetIdentitySection correctly', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetIdentitySection asset={mockAssetDetail} />);
    });
    const root = tree.root;
    const texts = root.findAllByType('Text').map((n: any) => n.props.children);

    expect(texts).toContain('Identitas Barang');
    expect(texts).toContain('Kode / NUP');
    expect(texts).toContain('BMN-001 / NUP 5');
    expect(texts).toContain('No Rangka');
    expect(texts).toContain('R-123');
    expect(texts).toContain('No Mesin');
    expect(texts).toContain('M-456');
    expect(texts).toContain('No Polisi');
    expect(texts).toContain('B 1234 SQA');

    act(() => {
      tree.unmount();
    });
  });

  it('renders AssetLocationSection correctly', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetLocationSection asset={mockAssetDetail} />);
    });
    const root = tree.root;
    const texts = root.findAllByType('Text').map((n: any) => n.props.children);

    expect(texts).toContain('Lokasi & Penanggung Jawab');
    expect(texts).toContain('Lokasi Wilayah');
    expect(texts).toContain('Seksi Wilayah I');
    expect(texts).toContain('Ruangan');
    expect(texts).toContain('Ruang IT');
    expect(texts).toContain('Penanggung Jawab');
    expect(texts).toContain('Hardi (NIP: 199001012015011002)');

    act(() => {
      tree.unmount();
    });
  });

  it('renders AssetDocumentSection correctly', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetDocumentSection asset={mockAssetDetail} />);
    });
    const root = tree.root;
    const texts = root.findAllByType('Text').map((n: any) => n.props.children);

    expect(texts).toContain('Dokumen Kendaraan');
    expect(texts).toContain('BPKB');
    expect(texts).toContain('Tersedia');
    expect(texts).toContain('STNK');
    expect(texts).toContain('Tanggal Pajak STNK');
    expect(texts).toContain('2026-12-31');

    act(() => {
      tree.unmount();
    });
  });

  it('returns null in AssetDocumentSection when no vehicle docs or plate exist', () => {
    const nonVehicleAsset = {
      ...mockAssetDetail,
      bpkb_1: null,
      stnk_1: null,
      no_polisi: undefined,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetDocumentSection asset={nonVehicleAsset} />);
    });
    expect(tree.toJSON()).toBeNull();

    act(() => {
      tree.unmount();
    });
  });

  it('renders AssetFinanceSection correctly', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetFinanceSection asset={mockAssetDetail} />);
    });
    const root = tree.root;
    const texts = root.findAllByType('Text').map((n: any) => n.props.children);

    expect(texts).toContain('Informasi Keuangan');
    expect(texts).toContain('Nilai Perolehan');
    expect(texts).toContain('Rp 15.000.000');
    expect(texts).toContain('Tanggal Perolehan');
    expect(texts).toContain('2025-01-15');

    act(() => {
      tree.unmount();
    });
  });

  it('renders AssetOrganizationSection correctly', () => {
    const orgAsset = {
      ...mockAssetDetail,
      penanggung_jawab: {
        id: 10,
        nama_lengkap: 'Hardi',
        satuan_kerja: 'Balai Konservasi',
        unit_kerja: 'Subbag Tata Usaha',
      } as any,
    };
    let tree: any;
    act(() => {
      tree = renderer.create(<AssetOrganizationSection asset={orgAsset} />);
    });
    const root = tree.root;
    const texts = root.findAllByType('Text').map((n: any) => n.props.children);

    expect(texts).toContain('Informasi Organisasi & Pengguna');
    expect(texts).toContain('Pengguna Barang');
    expect(texts).toContain('Andi');
    expect(texts).toContain('Satuan Kerja');
    expect(texts).toContain('Balai Konservasi');
    expect(texts).toContain('Unit Kerja');
    expect(texts).toContain('Subbag Tata Usaha');

    act(() => {
      tree.unmount();
    });
  });
});
