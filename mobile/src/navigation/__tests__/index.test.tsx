/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigation from '../index';
import { useAuth } from '@/features/auth/AuthProvider';
import { ActivityIndicator } from 'react-native';

// Mock dependency hooks to isolate navigation rendering
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      card: '#ffffff',
      border: '#e2e8f0',
      foreground: '#09090b',
      mutedForeground: '#64748b',
    },
  }),
}));

// Mock child screens/navigators to speed up testing and prevent library native dependencies crashes
jest.mock('../AppTabs', () => {
  const { Text } = require('react-native');
  return function MockAppTabs() {
    return <Text testID="mock-app-tabs">Mock App Tabs</Text>;
  };
});

jest.mock('@/features/auth/screens/LoginScreen', () => {
  const { Text } = require('react-native');
  return function MockLoginScreen() {
    return <Text testID="mock-login-screen">Mock Login Screen</Text>;
  };
});

describe('RootNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading indicator when auth is resolving', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: true,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(
        <NavigationContainer>
          <RootNavigation />
        </NavigationContainer>
      );
    });

    // Should find the loading activity indicator
    const spinner = tree.root.findByType(ActivityIndicator);
    expect(spinner).toBeTruthy();
    
    // Should NOT render Login screen or App Tabs
    expect(tree.root.findAllByProps({ testID: 'mock-login-screen' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'mock-app-tabs' })).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });

  it('renders LoginScreen when user is unauthenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(
        <NavigationContainer>
          <RootNavigation />
        </NavigationContainer>
      );
    });

    // Should render the Login Screen
    const loginText = tree.root.findByProps({ testID: 'mock-login-screen' });
    expect(loginText).toBeTruthy();
    
    // Should NOT render loading spinner or App Tabs
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'mock-app-tabs' })).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });

  it('renders AppTabs when user is authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, name: 'User' },
      isLoading: false,
    });

    let tree: any;
    act(() => {
      tree = renderer.create(
        <NavigationContainer>
          <RootNavigation />
        </NavigationContainer>
      );
    });

    // Should render the main authenticated Tabs
    const tabsText = tree.root.findByProps({ testID: 'mock-app-tabs' });
    expect(tabsText).toBeTruthy();
    
    // Should NOT render loading spinner or Login Screen
    expect(tree.root.findAllByType(ActivityIndicator)).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'mock-login-screen' })).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });
});
