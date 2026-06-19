/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable react/display-name */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import DashboardScreen from '../DashboardScreen';
import { useMobileDashboard } from '../../useMobileDashboard';
import { usePermissions } from '@/lib/permissions';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      foreground: '#09090b',
      muted: '#f1f5f9',
      border: '#e2e8f0',
      card: '#ffffff',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24,
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
        xxl: 24,
        xxxl: 32,
      },
    },
  }),
}));

// Mock dashboard API hook
jest.mock('../../useMobileDashboard', () => ({
  useMobileDashboard: jest.fn(),
}));

// Mock permissions hook
jest.mock('@/lib/permissions', () => ({
  usePermissions: jest.fn(),
}));

// Mock child components to keep unit tests isolated and fast
jest.mock('../../components/ProfileSummary', () => {
  const React = require('react');
  return () => React.createElement('ProfileSummaryMock');
});

jest.mock('../../components/MetricCard', () => {
  const React = require('react');
  return ({ count, label }: any) =>
    React.createElement('MetricCardMock', { count, label });
});

jest.mock('../../components/AlertCard', () => {
  const React = require('react');
  return () => React.createElement('AlertCardMock');
});

jest.mock('../../components/QuickActions', () => {
  const React = require('react');
  return (props: any) => React.createElement('QuickActionsMock', props);
});

describe('DashboardScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockDashboardData = {
    profile: {
      id: 1,
      name: 'Test Pegawai',
      username: 'pegawai',
      role: 'pegawai',
      access_modules: ['bmn'],
      permissions: [],
      employee: {
        id: 10,
        nip: '12345',
        nama_lengkap: 'Test Pegawai Lengkap',
        jabatan: 'Staff BMN',
        satuan_kerja: 'Seksi I',
        foto_profil: null,
      },
    },
    summary: {
      assigned_assets_count: 5,
      active_loans_count: 2,
      pending_my_letters_count: 1,
      active_my_letters_count: 3,
      pending_approvals_count: 0,
    },
    urgent_tax_vehicles: [],
    notifications: [],
  };

  const mockRefetch = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    (usePermissions as jest.Mock).mockReturnValue({
      hasModule: (mod: string) => mod === 'bmn' || mod === 'surat_tugas',
      can: (perm: string) => false,
      isSuperAdmin: () => false,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders LoadingSkeleton when hook is loading and has no data', () => {
    (useMobileDashboard as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;
    expect(() => root.findByType('ProfileSummaryMock')).toThrow();
    expect(root.findAllByProps({ variant: 'detail' }).length).toBe(1);

    act(() => {
      tree.unmount();
    });
  });

  it('renders ErrorState with retry callback when API request fails', () => {
    const apiError = {
      message: 'Gagal menyambungkan ke server',
    };

    (useMobileDashboard as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: apiError,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;
    const errorState = root.findByProps({ message: 'Gagal menyambungkan ke server' });
    expect(errorState).toBeTruthy();

    // Trigger retry
    act(() => {
      errorState.props.onRetry();
    });
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });

  it('renders dashboard details and consolidated metrics when data is loaded successfully', () => {
    (useMobileDashboard as jest.Mock).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;

    // Profile summary check
    expect(root.findByType('ProfileSummaryMock')).toBeTruthy();

    // Metric Cards check
    const metricCards = root.findAllByType('MetricCardMock');
    expect(metricCards.length).toBe(4); // Aset Saya, Peminjaman Aktif, ST Pending Saya, ST Aktif Saya

    const countProps = metricCards.map((m: any) => m.props.count);
    expect(countProps).toContain(5); // assigned_assets_count
    expect(countProps).toContain(2); // active_loans_count
    expect(countProps).toContain(1); // pending_my_letters_count
    expect(countProps).toContain(3); // active_my_letters_count

    // Alert Card and Quick Actions check
    expect(root.findByType('AlertCardMock')).toBeTruthy();
    expect(root.findByType('QuickActionsMock')).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it('navigates to BMN or Surat Tugas screens when quick actions are pressed', () => {
    (useMobileDashboard as jest.Mock).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;
    const quickActions = root.findByType('QuickActionsMock');

    // Press 'Daftar BMN' action
    act(() => {
      quickActions.props.onViewBmnPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Bmn');

    // Press 'Surat Tugas Saya' action
    act(() => {
      quickActions.props.onViewSuratTugasPress();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SuratTugas');

    act(() => {
      tree.unmount();
    });
  });

  it('triggers Alert calls when non-implemented quick actions are pressed', () => {
    jest.spyOn(Alert, 'alert');

    (useMobileDashboard as jest.Mock).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;
    const quickActions = root.findByType('QuickActionsMock');

    // Press 'Scan Barcode'
    act(() => {
      quickActions.props.onScanPress();
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Scan Barcode',
      'Fitur scan barcode BMN akan segera hadir.'
    );

    // Press 'Pinjam Aset'
    act(() => {
      quickActions.props.onLoanPress();
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Pinjam Aset',
      'Fitur pengajuan peminjaman aset akan segera hadir.'
    );

    // Press 'Persetujuan ST'
    act(() => {
      quickActions.props.onApproveSuratTugasPress();
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Persetujuan Surat Tugas',
      'Fitur persetujuan surat tugas akan segera hadir.'
    );

    act(() => {
      tree.unmount();
    });
  });
});
