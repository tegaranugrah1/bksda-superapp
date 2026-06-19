/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AppTabs from '../AppTabs';
import { usePermissions } from '@/lib/permissions';

// Mock permissions hook
jest.mock('@/lib/permissions', () => ({
  usePermissions: jest.fn(),
}));

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      mutedForeground: '#64748b',
      card: '#ffffff',
      border: '#e2e8f0',
      foreground: '#09090b',
    },
  }),
}));

// Mock react-navigation bottom-tabs to avoid native module dependency issues
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }: any) => React.createElement('TabNavigator', null, children),
      Screen: ({ name }: any) => React.createElement('TabScreen', { name }),
    }),
  };
});

// Mock child screens
jest.mock('@/features/dashboard/screens/DashboardScreen', () => () => null);
jest.mock('@/features/bmn/navigation/BmnNavigator', () => () => null);
jest.mock('@/features/surat-tugas/screens/SuratTugasListScreen', () => () => null);
jest.mock('@/features/profile/screens/ProfileScreen', () => () => null);

describe('AppTabs', () => {
  const mockHasModule = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({
      hasModule: mockHasModule,
      isSuperAdmin: jest.fn(),
      can: jest.fn(),
    });
  });

  it('renders Dashboard and Profile tabs by default, hiding BMN and Surat Tugas when missing access', () => {
    // User does not have access to any module
    mockHasModule.mockReturnValue(false);

    let tree: any;
    act(() => {
      tree = renderer.create(<AppTabs />);
    });

    const screens = tree.root.findAllByType('TabScreen');
    
    // Should render Dashboard and Profile
    const screenNames = screens.map((s: any) => s.props.name);
    expect(screenNames).toContain('Dashboard');
    expect(screenNames).toContain('Profile');
    
    // Should NOT render Bmn or SuratTugas
    expect(screenNames).not.toContain('Bmn');
    expect(screenNames).not.toContain('SuratTugas');

    act(() => {
      tree.unmount();
    });
  });

  it('renders BMN tab when user has BMN module access', () => {
    // User has access only to BMN
    mockHasModule.mockImplementation((mod) => mod === 'bmn');

    let tree: any;
    act(() => {
      tree = renderer.create(<AppTabs />);
    });

    const screens = tree.root.findAllByType('TabScreen');
    const screenNames = screens.map((s: any) => s.props.name);

    expect(screenNames).toContain('Dashboard');
    expect(screenNames).toContain('Profile');
    expect(screenNames).toContain('Bmn');
    expect(screenNames).not.toContain('SuratTugas');

    act(() => {
      tree.unmount();
    });
  });

  it('renders Surat Tugas tab when user has kepegawaian access', () => {
    // User has access only to kepegawaian
    mockHasModule.mockImplementation((mod) => mod === 'kepegawaian');

    let tree: any;
    act(() => {
      tree = renderer.create(<AppTabs />);
    });

    const screens = tree.root.findAllByType('TabScreen');
    const screenNames = screens.map((s: any) => s.props.name);

    expect(screenNames).toContain('Dashboard');
    expect(screenNames).toContain('Profile');
    expect(screenNames).not.toContain('Bmn');
    expect(screenNames).toContain('SuratTugas');

    act(() => {
      tree.unmount();
    });
  });

  it('renders Surat Tugas tab when user has surat_tugas access', () => {
    // User has access only to surat_tugas
    mockHasModule.mockImplementation((mod) => mod === 'surat_tugas');

    let tree: any;
    act(() => {
      tree = renderer.create(<AppTabs />);
    });

    const screens = tree.root.findAllByType('TabScreen');
    const screenNames = screens.map((s: any) => s.props.name);

    expect(screenNames).toContain('Dashboard');
    expect(screenNames).toContain('Profile');
    expect(screenNames).not.toContain('Bmn');
    expect(screenNames).toContain('SuratTugas');

    act(() => {
      tree.unmount();
    });
  });

  it('renders BMN and Surat Tugas tabs when user has access to both', () => {
    // User has access to everything
    mockHasModule.mockReturnValue(true);

    let tree: any;
    act(() => {
      tree = renderer.create(<AppTabs />);
    });

    const screens = tree.root.findAllByType('TabScreen');
    const screenNames = screens.map((s: any) => s.props.name);

    expect(screenNames).toContain('Dashboard');
    expect(screenNames).toContain('Bmn');
    expect(screenNames).toContain('SuratTugas');
    expect(screenNames).toContain('Profile');

    act(() => {
      tree.unmount();
    });
  });
});
