import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ErrorState } from '../ErrorState';
import { Text, TouchableOpacity } from 'react-native';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#09090b',
      mutedForeground: '#64748b',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xxl: 24,
    },
    radius: {
      lg: 8,
    },
    typography: {
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xxxl: 32,
      },
      fontWeights: {
        bold: '700',
        semibold: '600',
      },
    },
  }),
}));

describe('ErrorState', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with title and message', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorState
          title="Koneksi Gagal"
          message="Gagal memuat data aset dari server."
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const titleInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Koneksi Gagal'
    );
    expect(titleInstance).toBeTruthy();

    const messageInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Gagal memuat data aset dari server.'
    );
    expect(messageInstance).toBeTruthy();
  });

  it('does not render retry button when onRetry is not provided', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorState message="Gagal memuat data." />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const touchables = tree.root.findAllByType(TouchableOpacity);
    expect(touchables.length).toBe(0);
  });

  it('renders retry button and triggers onRetry when pressed', () => {
    const handleRetry = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorState
          message="Gagal memuat data."
          onRetry={handleRetry}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const touchableInstance = tree.root.findByType(TouchableOpacity);
    expect(touchableInstance).toBeTruthy();

    act(() => {
      touchableInstance.props.onPress();
    });

    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility properties on layout and elements', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorState
          title="Koneksi Gagal"
          message="Gagal memuat data."
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const parentView = tree.root.children[0];
    expect(parentView.props.accessibilityRole).toBe('summary');
    expect(parentView.props.accessibilityLabel).toBe('Koneksi Gagal. Gagal memuat data.');

    const textInstances = tree.root.findAllByType(Text);
    const emojiInstance = textInstances.find((inst: any) => inst.props.children === '⚠️');
    expect(emojiInstance).toBeTruthy();
    expect(emojiInstance.props.accessibilityElementsHidden).toBe(true);
    expect(emojiInstance.props.importantForAccessibility).toBe('no');
  });
});
