import React from 'react';
import { Alert, Text, TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssignmentFormScreen from '../AssignmentFormScreen';
import { apiClient } from '@/lib/api/client';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: { id?: string | number } | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      data: {
        data: [
          { id: 1, name: 'Budi Santoso', nip: '19900101', department: 'SKW I' },
          { id: 2, name: 'Ayu Lestari', nip: '19900102', department: 'SKW II' },
        ],
      },
    }),
    post: jest.fn().mockResolvedValue({ data: { id: 'st-new' } }),
    put: jest.fn().mockResolvedValue({ data: { id: 'st-1' } }),
  },
}));

jest.mock('@/theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      bgDark: '#f8fafc',
      headerBg: '#ffffff',
      headerBorder: '#e2e8f0',
      textDark: '#0f172a',
      textMuted: '#64748b',
      cardBg: '#ffffff',
      glassBorder: '#e2e8f0',
      primaryBtn: '#2563eb',
    },
  }),
}));

function getTextValues(root: renderer.ReactTestInstance) {
  return root.findAllByType(Text).map((node) => node.props.children).flat();
}

describe('AssignmentFormScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = undefined;
  });

  it('renders Step 1 wizard shell with header and employee selection prompt', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const root = tree!.root;
    const texts = getTextValues(root);

    expect(texts).toContain('Pengajuan Surat Tugas');
    expect(texts).toContain('Pilih Pegawai');
    expect(texts).toContain('Lanjutkan');
  });

  it('disables Lanjutkan button when no employee is selected', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    const nextBtnText = tree!.root.findByProps({ children: 'Lanjutkan' });
    let touchable = nextBtnText.parent;
    while (touchable && typeof touchable.props.onPress !== 'function') {
      touchable = touchable.parent;
    }

    expect(touchable!.props.disabled).toBe(true);
  });

  it('allows typing search, selecting an employee, and advancing to Step 2', async () => {
    let tree: renderer.ReactTestRenderer;

    await act(async () => {
      tree = renderer.create(<AssignmentFormScreen />);
    });

    // Type 'Budi' in search input
    const searchInput = tree!.root.findByType(TextInput);
    act(() => {
      searchInput.props.onChangeText('Budi');
    });

    // Pick Budi Santoso from dropdown
    const employeeText = tree!.root.findByProps({ children: 'Budi Santoso' });
    let touchableEmp = employeeText.parent;
    while (touchableEmp && typeof touchableEmp.props.onPress !== 'function') {
      touchableEmp = touchableEmp.parent;
    }

    act(() => {
      touchableEmp!.props.onPress();
    });

    // Press Lanjutkan
    const nextBtnText = tree!.root.findByProps({ children: 'Lanjutkan' });
    let touchableNext = nextBtnText.parent;
    while (touchableNext && typeof touchableNext.props.onPress !== 'function') {
      touchableNext = touchableNext.parent;
    }

    expect(touchableNext!.props.disabled).toBe(false);

    act(() => {
      touchableNext!.props.onPress();
    });

    const texts = getTextValues(tree!.root);
    expect(texts).toContain('Detail Surat Tugas');
    expect(texts).toContain('DARI ( KOTA / LOKASI ASAL ) *');
  });
});
