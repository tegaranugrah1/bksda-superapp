/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import App from '../../App';

jest.mock('@react-navigation/native', () => {
  const React = require('react');
  return {
    NavigationContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('NavigationContainerMock', { testID: 'navigation-container' }, children),
  };
});

jest.mock('@/features/auth/AuthProvider', () => {
  const React = require('react');
  return {
    AuthProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement('AuthProviderMock', { testID: 'auth-provider' }, children),
  };
});

jest.mock('@/navigation', () => {
  const React = require('react');
  return function RootNavigationMock() {
    return React.createElement('RootNavigationMock', { testID: 'root-navigation' });
  };
});

describe('App', () => {
  it('renders the authenticated navigation shell instead of the Expo template', () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<App />);
    });

    expect(tree.root.findByProps({ testID: 'auth-provider' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'navigation-container' })).toBeTruthy();
    expect(tree.root.findByProps({ testID: 'root-navigation' })).toBeTruthy();
    expect(JSON.stringify(tree.toJSON())).not.toContain('Open up App.tsx to start working on your app');
  });
});
