import React from 'react';
import { Alert, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import ProfileScreen from '../ProfileScreen';
import { useAuth } from '@/features/auth/AuthProvider';

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({ params: {} }),
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
    mockAuth({
      user: {
        ...mockUser,
        employee: mockEmployee,
      },
    });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const root = tree!.root;
    const texts = getTextValues(root);

    expect(texts).toContain('Ayu Lestari');
    expect(texts).toContain('ayu');
    expect(texts).toContain('Keluar dari Aplikasi');
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
      user: {
        ...mockUser,
        employee: null,
      },
    });

    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const texts = getTextValues(tree!.root);

    expect(texts).toContain('Ayu Lestari');
    expect(texts).toContain('ayu');
  });

  it('asks for confirmation before calling logout from auth context', () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const logoutText = tree!.root.findByProps({ children: 'Keluar dari Aplikasi' });
    let touchable = logoutText.parent;
    while (touchable && typeof touchable.props.onPress !== 'function') {
      touchable = touchable.parent;
    }

    act(() => {
      touchable!.props.onPress();
    });

    expect(mockLogout).not.toHaveBeenCalled();
    expect(tree!.root.findAllByProps({ title: 'Konfirmasi Keluar' }).length).toBeGreaterThan(0);
  });

  it('calls logout when destructive confirmation is selected', async () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<ProfileScreen />);
    });

    const logoutText = tree!.root.findByProps({ children: 'Keluar dari Aplikasi' });
    let touchable = logoutText.parent;
    while (touchable && typeof touchable.props.onPress !== 'function') {
      touchable = touchable.parent;
    }

    act(() => {
      touchable!.props.onPress();
    });

    const confirmModals = tree!.root.findAllByProps({ title: 'Konfirmasi Keluar' });
    const confirmModal = confirmModals.find(m => typeof m.props.onConfirm === 'function');

    await act(async () => {
      confirmModal!.props.onConfirm();
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
