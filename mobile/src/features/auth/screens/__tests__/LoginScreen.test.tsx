import React from 'react';
import renderer, { act } from 'react-test-renderer';
import LoginScreen from '../LoginScreen';
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
      primaryForeground: '#ffffff',
      foreground: '#09090b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
    },
    spacing: {
      xs: 4,
      md: 12,
      lg: 16,
      xl: 20,
    },
    radius: {
      md: 6,
      lg: 8,
    },
    typography: {
      fontWeights: {
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
      },
    },
  }),
}));

describe('LoginScreen', () => {
  const login = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      login,
      isLoading: false,
    });
  });

  it('renders username, password, and submit controls', () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    expect(tree.root.findByProps({ accessibilityLabel: 'Username' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Password' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Masuk' })).toBeTruthy();
  });

  it('validates required username and password before submitting', () => {
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Masuk' }).props.onPress();
    });

    expect(login).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ message: 'Username dan Password wajib diisi.' })).toBeTruthy();
  });

  it('submits trimmed username and password to auth context', async () => {
    login.mockResolvedValue(undefined);
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Username' }).props.onChangeText(' admin ');
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onChangeText('secret');
    });

    await act(async () => {
      await tree.root.findByProps({ accessibilityLabel: 'Masuk' }).props.onPress();
    });

    expect(login).toHaveBeenCalledWith('admin', 'secret');
  });

  it('renders a generic login error without exposing raw exception details', async () => {
    login.mockRejectedValue(new Error('SQLSTATE password debug token'));
    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    act(() => {
      tree.root.findByProps({ accessibilityLabel: 'Username' }).props.onChangeText('admin');
      tree.root.findByProps({ accessibilityLabel: 'Password' }).props.onChangeText('wrong');
    });

    await act(async () => {
      await tree.root.findByProps({ accessibilityLabel: 'Masuk' }).props.onPress();
    });

    const serialized = JSON.stringify(tree.toJSON());

    expect(serialized).toContain('Login gagal. Periksa username dan password, lalu coba lagi.');
    expect(serialized).not.toContain('SQLSTATE');
    expect(serialized).not.toContain('debug token');
  });

  it('disables inputs and shows busy submit state while auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      login,
      isLoading: true,
    });

    let tree!: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(<LoginScreen />);
    });

    expect(tree.root.findByProps({ accessibilityLabel: 'Username' }).props.editable).toBe(false);
    expect(tree.root.findByProps({ accessibilityLabel: 'Password' }).props.editable).toBe(false);
    const submitButton = tree.root
      .findAllByProps({ accessibilityLabel: 'Masuk' })
      .find((node) => node.props.accessibilityState);

    expect(submitButton?.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
  });
});
