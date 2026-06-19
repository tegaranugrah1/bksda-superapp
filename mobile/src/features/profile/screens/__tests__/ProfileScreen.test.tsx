import React from 'react';
import { Alert, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import ProfileScreen from '../ProfileScreen';
import { useAuth } from '@/features/auth/AuthProvider';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      card: '#ffffff',
      border: '#e2e8f0',
      primary: '#16a34a',
      foreground: '#09090b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
    },
    spacing: {
      sm: 8,
      md: 12,
      lg: 16,
    },
    radius: {
      lg: 8,
      full: 9999,
    },
    typography: {
      fontWeights: {
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontSizes: {
        md: 16,
      },
    },
  }),
}));

const mockLogout = jest.fn();

const mockUser = {
  id: 1,
  name: 'Ayu Lestari',
  username: 'ayu',
  email: 'ayu@example.test',
  role: 'staff_bmn',
  access_modules: ['bmn', 'surat_tugas'],
  permissions: ['bmn.view'],
  is_active: true,
  employee: null,
};

const mockEmployee = {
  id: 10,
  nip: '198501012010011002',
  name: 'Ayu Lestari Pegawai',
  position: 'Pengelola BMN',
  department: 'Seksi Wilayah I',
  email: 'pegawai@example.test',
  phone: '08123456789',
  photo: null,
  rank: 'Penata Muda',
  is_active: true,
};

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    user: mockUser,
    employee: mockEmployee,
    token: 'super-secret-token',
    isLoading: false,
    login: jest.fn(),
    logout: mockLogout,
    refreshUser: jest.fn(),
    ...overrides,
  });
}

function getTextValues(root: renderer.ReactTestInstance) {
  return root.findAllByType(Text).map((node) => node.props.children).flat();
}

describe('ProfileScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockLogout.mockClear();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    mockAuth();
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders user identity, employee data, role, access modules, and logout action', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const root = tree!.root;
    const texts = getTextValues(root);

    expect(texts).toContain('Ayu Lestari Pegawai');
    expect(texts).toContain('NIP. 198501012010011002');
    expect(texts).toContain('Pengelola BMN');
    expect(texts).toContain('Seksi Wilayah I');
    expect(texts).toContain('Penata Muda');
    expect(texts).toContain('Staff Bmn');
    expect(texts).toContain('Bmn');
    expect(texts).toContain('Surat Tugas');
    expect(root.findByProps({ accessibilityLabel: 'Logout' })).toBeTruthy();
  });

  it('does not display token or session values from auth context', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const serialized = JSON.stringify(tree!.toJSON());

    expect(serialized).not.toContain('super-secret-token');
    expect(serialized.toLowerCase()).not.toContain('session');
    expect(serialized.toLowerCase()).not.toContain('bearer');
  });

  it('renders account fallback when employee data is not linked', () => {
    mockAuth({
      employee: null,
      user: {
        ...mockUser,
        access_modules: [],
      },
    });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const texts = getTextValues(tree!.root);

    expect(texts).toContain('Ayu Lestari');
    expect(texts).toContain('@ayu');
    expect(texts).toContain('Belum terhubung dengan data pegawai.');
    expect(texts).toContain('Tidak ada modul akses');
  });

  it('asks for confirmation before calling logout from auth context', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    act(() => {
      tree!.root.findByProps({ accessibilityLabel: 'Logout' }).props.onPress();
    });

    expect(mockLogout).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      'Logout',
      'Keluar dari aplikasi di perangkat ini?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Batal', style: 'cancel' }),
        expect.objectContaining({ text: 'Logout', style: 'destructive', onPress: mockLogout }),
      ])
    );
  });

  it('calls logout when destructive confirmation is selected', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    act(() => {
      tree!.root.findByProps({ accessibilityLabel: 'Logout' }).props.onPress();
    });

    const confirmAction = alertSpy.mock.calls[0][2].find((action: { text: string }) => action.text === 'Logout');

    act(() => {
      confirmAction.onPress();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
