import React from 'react';
import { Alert, KeyboardAvoidingView, Switch, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssignmentFormScreen from '../AssignmentFormScreen';

const mockGoBack = jest.fn();
let mockRouteParams: { id?: string | number } | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
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
      dangerForeground: '#ffffff',
      foreground: '#09090b',
      card: '#ffffff',
      border: '#e2e8f0',
      muted: '#f1f5f9',
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
      md: 6,
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

describe('AssignmentFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
  });

  it('renders the sectioned create form shell inside a keyboard-aware container', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Buat Surat Tugas');
    expect(texts).toContain('Informasi Surat');
    expect(texts).toContain('Tanggal & Tujuan');
    expect(texts).toContain('Personel');
    expect(texts).toContain('Dana & Transport');
    expect(texts).toContain('Review');
    expect(tree!.root.findByType(KeyboardAvoidingView).props.style).toEqual({ flex: 1 });
    expect(tree!.root.findByProps({ accessibilityLabel: 'Maksud dan Tujuan *' })).toBeTruthy();
    expect(tree!.root.findByProps({ accessibilityLabel: 'Tempat Tujuan *' })).toBeTruthy();
    expect(tree!.root.findByProps({ accessibilityLabel: 'Validasi form Surat Tugas' })).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('renders edit title when an assignment id is provided', () => {
    mockRouteParams = { id: 'st-1' };

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Ubah Surat Tugas');

    act(() => {
      tree!.unmount();
    });
  });

  it('adds another personnel row from the personel section action', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const addButton = tree!.root.findByProps({ accessibilityLabel: 'Tambah personel' });
    act(() => {
      addButton.props.onPress();
    });

    expect(tree!.root.findByProps({ accessibilityLabel: 'ID Pegawai 2 *' })).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('reveals transport input when transport is required', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const transportSwitch = tree!.root.findByType(Switch);
    act(() => {
      transportSwitch.props.onValueChange(true);
    });

    expect(tree!.root.findByProps({ accessibilityLabel: 'Transportasi *' })).toBeTruthy();

    act(() => {
      tree!.unmount();
    });
  });

  it('shows Indonesian validation errors before the submit API task', async () => {
    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const submitButton = tree!.root.findByProps({ accessibilityLabel: 'Validasi form Surat Tugas' });
    await act(async () => {
      submitButton.props.onPress();
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Maksud dan tujuan wajib diisi');
    expect(texts).toContain('Tanggal mulai wajib diisi');
    expect(texts).toContain('Tanggal selesai wajib diisi');

    act(() => {
      tree!.unmount();
    });
  });

  it('shows a placeholder alert when the form shell is valid', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const setText = (label: string, value: string) => {
      const input = tree!.root.findByProps({ accessibilityLabel: label });
      act(() => {
        input.props.onChangeText(value);
      });
    };

    setText('Maksud dan Tujuan *', 'Patroli kawasan konservasi');
    setText('Tanggal Mulai *', '2026-06-20');
    setText('Tanggal Selesai *', '2026-06-21');
    setText('Tempat Tujuan *', 'Samarinda');
    setText('Sumber Dana *', 'dipa');
    setText('ID Pegawai 1 *', '12');

    const submitButton = tree!.root.findByProps({ accessibilityLabel: 'Validasi form Surat Tugas' });
    await act(async () => {
      submitButton.props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Buat Surat Tugas',
      'Form sudah valid. Submit API akan disambungkan pada task berikutnya.'
    );

    alertSpy.mockRestore();
    act(() => {
      tree!.unmount();
    });
  });
});
