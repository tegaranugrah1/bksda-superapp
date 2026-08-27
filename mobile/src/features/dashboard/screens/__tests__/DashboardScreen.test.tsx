/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable react/display-name */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import DashboardScreen from '../DashboardScreen';
import { useMobileDashboard } from '../../useMobileDashboard';
import { useAuth } from '@/features/auth/AuthProvider';

// Mock AuthProvider
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock dashboard API hook
jest.mock('../../useMobileDashboard', () => ({
  useMobileDashboard: jest.fn(),
}));

// Mock PortalDashboardScreen
jest.mock('../../PortalDashboardScreen', () => {
  const React = require('react');
  return {
    PortalDashboardScreen: (props: any) => React.createElement('PortalDashboardScreenMock', props),
  };
});

describe('DashboardScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  };

  const mockDashboardData: any = {
    summary: {
      assigned_assets_count: 5,
      active_loans_count: 2,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, name: 'Budi Santoso', username: 'budi123' },
      employee: { id: 10, nip: '198501012010011001' },
    });

    (useMobileDashboard as jest.Mock).mockReturnValue({
      data: mockDashboardData,
      isLoading: false,
      error: undefined,
    });
  });

  it('renders PortalDashboardScreen with user profile and dashboard data', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;
    const portal = root.findByType('PortalDashboardScreenMock');

    expect(portal.props.userProfile).toEqual({
      name: 'Budi Santoso',
      nip: '198501012010011001',
    });
    expect(portal.props.dashboardData).toEqual(mockDashboardData);
  });

  it('navigates to appropriate screens when module navigation callback is triggered', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<DashboardScreen navigation={mockNavigation} />);
    });

    const root = tree.root;
    const portal = root.findByType('PortalDashboardScreenMock');
    const { onNavigateToModule } = portal.props;

    act(() => {
      onNavigateToModule('buat-surat-tugas');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('AssignmentForm');

    act(() => {
      onNavigateToModule('inbox-surat-tugas');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('InboxSuratTugas');

    act(() => {
      onNavigateToModule('inbox-surat-cuti');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('InboxSuratCuti');

    act(() => {
      onNavigateToModule('surat-tugas');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SuratTugasList', { initialMode: 'personal' });

    act(() => {
      onNavigateToModule('bmn');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('BmnMain');

    act(() => {
      onNavigateToModule('surat');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Surat');

    act(() => {
      onNavigateToModule('inventory');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Inventory');

    act(() => {
      onNavigateToModule('kepegawaian');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('KepegawaianDashboard');

    act(() => {
      onNavigateToModule('profile');
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Profile');
  });
});
