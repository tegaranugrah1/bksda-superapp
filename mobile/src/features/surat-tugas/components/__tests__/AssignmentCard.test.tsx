import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssignmentCard from '../AssignmentCard';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      card: '#ffffff',
      border: '#e2e8f0',
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
      lg: 8,
      full: 9999,
    },
    typography: {
      fontFamilies: {
        sans: 'System',
      },
      fontWeights: {
        bold: '700',
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

describe('AssignmentCard', () => {
  const assignment = {
    id: 'st-1',
    nomor: 'ST.001/BKSDA/2026',
    kegiatan: 'Patroli kawasan konservasi',
    tujuan: 'Samarinda',
    tanggal_mulai: '2026-06-20',
    tanggal_selesai: '2026-06-21',
    status: 'approved',
    personel_summary: 'Pegawai Satu, Pegawai Dua',
  };

  it('renders assignment summary, date, status, and personel text', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentCard assignment={assignment} onPress={jest.fn()} />);
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);

    expect(texts).toContain('ST.001/BKSDA/2026');
    expect(texts).toContain('Patroli kawasan konservasi');
    expect(texts).toContain('Tujuan: Samarinda');
    expect(texts).toContain('Tanggal: 2026-06-20 - 2026-06-21');
    expect(texts).toContain('Disetujui');
    expect(texts).toContain('Personel: Pegawai Satu, Pegawai Dua');

    act(() => {
      tree!.unmount();
    });
  });

  it('uses fallback labels when number and activity are missing', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AssignmentCard
          assignment={{
            id: 'st-2',
            status: 'draft',
          }}
          onPress={jest.fn()}
        />
      );
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);

    expect(texts).toContain('Belum bernomor');
    expect(texts).toContain('Kegiatan belum diisi');
    expect(texts).toContain('Draft');

    act(() => {
      tree!.unmount();
    });
  });

  it('triggers onPress when card is pressed and exposes an accessible label', () => {
    const handlePress = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentCard assignment={assignment} onPress={handlePress} />);
    });

    const touchable = tree!.root.findByType(TouchableOpacity);

    expect(touchable.props.accessibilityRole).toBe('button');
    expect(touchable.props.accessibilityLabel).toBe(
      'Surat Tugas: ST.001/BKSDA/2026. Patroli kawasan konservasi'
    );

    act(() => {
      touchable.props.onPress();
    });

    expect(handlePress).toHaveBeenCalledTimes(1);

    act(() => {
      tree!.unmount();
    });
  });
});
