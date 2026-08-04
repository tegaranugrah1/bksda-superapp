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
jest.mock('@/features/bmn/BmnAssetCatalogScreen', () => ({ BmnAssetCatalogScreen: () => null }));
jest.mock('@/features/surat/SuratMasukHistoryScreen', () => ({ SuratMasukHistoryScreen: () => null }));
jest.mock('@/features/inventory/InventoryStockScreen', () => ({ InventoryStockScreen: () => null }));
jest.mock('@/features/profile/screens/ProfileScreen', () => () => null);
jest.mock('@/features/kepegawaian/KepegawaianScreen', () => ({ KepegawaianScreen: () => null }));
jest.mock('@/features/kepegawaian/TambahPegawaiScreen', () => ({ TambahPegawaiScreen: () => null }));
jest.mock('@/features/kepegawaian/InboxSuratTugasScreen', () => ({ InboxSuratTugasScreen: () => null }));
jest.mock('@/features/kepegawaian/BuatSuratTugasScreen', () => ({ BuatSuratTugasScreen: () => null }));
jest.mock('@/features/surat-tugas/screens/SuratTugasListScreen', () => () => null);
jest.mock('@/features/surat-tugas/screens/AssignmentDetailScreen', () => () => null);

describe('AppTabs', () => {
  it('renders all tab screens in AppTabs navigator', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<AppTabs />);
    });

    const screens = tree.root.findAllByType('TabScreen');
    const screenNames = screens.map((s: any) => s.props.name);

    expect(screenNames).toContain('Dashboard');
    expect(screenNames).toContain('Bmn');
    expect(screenNames).toContain('Surat');
    expect(screenNames).toContain('Inventory');
    expect(screenNames).toContain('Profile');
    expect(screenNames).toContain('Kepegawaian');
    expect(screenNames).toContain('InboxSuratTugas');
    expect(screenNames).toContain('BuatSuratTugas');
    expect(screenNames).toContain('SuratTugasList');
    expect(screenNames).toContain('AssignmentDetail');

    act(() => {
      tree.unmount();
    });
  });
});
