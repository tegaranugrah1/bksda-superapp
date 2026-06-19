import React from 'react';
import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import {
  AssignmentContentSection,
  AssignmentDatesSection,
  AssignmentFileSection,
  AssignmentPersonelSection,
  AssignmentStatusSection,
  AssignmentSummarySection,
} from '..';
import { AssignmentDetail } from '../../../types';

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
    shadows: {
      sm: {},
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
      },
    },
  }),
}));

describe('Surat Tugas detail section components', () => {
  const longDasar =
    'Berdasarkan surat permohonan dan kebutuhan pengamanan kawasan konservasi yang membutuhkan koordinasi lintas resort tanpa memotong keterbacaan konten panjang pada layar kecil.';

  const assignment: AssignmentDetail = {
    id: 'st-1',
    nomor: 'ST.001/BKSDA/2026',
    kode_surat: 'ST',
    kegiatan: 'Patroli kawasan konservasi',
    dasar_hukum: longDasar,
    tujuan: 'Samarinda',
    tanggal_mulai: '2026-06-20',
    tanggal_selesai: '2026-06-21',
    tanggal_surat: '2026-06-19',
    status: 'approved',
    sumber_dana: 'DIPA',
    template_type: 'default',
    personel: [
      {
        id: 1,
        name: 'Pegawai Satu',
        nip: '199001012020011001',
        jabatan: 'Analis',
        unit_kerja: 'Balai KSDA',
        peran: 'Ketua Tim',
      },
    ],
    file: {
      available: true,
      download_url: '/api/surat-tugas/my/st-1/download',
      filename: 'st-001.pdf',
      mime_type: 'application/pdf',
    },
    allowed_actions: {
      can_view: true,
      can_download: true,
      can_update: true,
      can_approve: true,
      can_delete: false,
    },
  };

  function getTexts(tree: renderer.ReactTestRenderer) {
    return tree.root.findAllByType(Text).map((node) => node.props.children);
  }

  it('renders AssignmentSummarySection', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentSummarySection assignment={assignment} />);
    });

    const texts = getTexts(tree!);
    expect(texts).toContain('ST.001/BKSDA/2026');
    expect(texts).toContain('Patroli kawasan konservasi');
    expect(texts).toContain('Disetujui');
    expect(texts).toContain('ST');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders AssignmentDatesSection', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentDatesSection assignment={assignment} />);
    });

    const texts = getTexts(tree!);
    expect(texts).toContain('Tanggal & Tujuan');
    expect(texts).toContain('Tanggal Surat');
    expect(texts).toContain('2026-06-19');
    expect(texts).toContain('Tanggal Mulai');
    expect(texts).toContain('2026-06-20');
    expect(texts).toContain('Tujuan');
    expect(texts).toContain('Samarinda');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders AssignmentPersonelSection', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentPersonelSection assignment={assignment} />);
    });

    const texts = getTexts(tree!);
    expect(texts).toContain('Personel');
    expect(texts).toContain('Pegawai Satu');
    expect(texts).toContain('199001012020011001 / Analis / Balai KSDA');
    expect(texts).toContain('Peran: Ketua Tim');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders empty personel fallback', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentPersonelSection assignment={{ ...assignment, personel: [] }} />);
    });

    expect(getTexts(tree!)).toContain('Belum ada personel.');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders AssignmentContentSection with long readable content', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentContentSection assignment={assignment} />);
    });

    const texts = getTexts(tree!);
    expect(texts).toContain('Isi Surat');
    expect(texts).toContain('Kegiatan');
    expect(texts).toContain('Patroli kawasan konservasi');
    expect(texts).toContain(longDasar);
    expect(texts).toContain('Sumber Dana');
    expect(texts).toContain('DIPA');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders AssignmentFileSection', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentFileSection assignment={assignment} />);
    });

    const texts = getTexts(tree!);
    expect(texts).toContain('Berkas');
    expect(texts).toContain('Status Berkas');
    expect(texts).toContain('Tersedia');
    expect(texts).toContain('st-001.pdf');
    expect(texts).toContain('/api/surat-tugas/my/st-1/download');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders AssignmentStatusSection', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentStatusSection assignment={assignment} />);
    });

    const texts = getTexts(tree!);
    expect(texts).toContain('Status & Aksi');
    expect(texts).toContain('approved');
    expect(texts).toContain('Bisa Diunduh');
    expect(texts).toContain('Butuh Persetujuan');
    expect(texts).toContain('Ubah Data');
    expect(texts).toContain('Diizinkan');

    act(() => {
      tree!.unmount();
    });
  });
});
