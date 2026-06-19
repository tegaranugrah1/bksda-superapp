import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StatusBadge } from '../StatusBadge';
import { Text, StyleSheet } from 'react-native';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
    },
    radius: {
      full: 9999,
    },
    typography: {
      fontSizes: {
        xs: 12,
      },
      fontWeights: {
        medium: '500',
      },
    },
  }),
}));

describe('StatusBadge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with text and status', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <StatusBadge text="Aktif" status="success" />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstance = tree.root.findByType(Text);
    expect(textInstance.props.children).toBe('Aktif');
  });

  it('applies success colors in light mode', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <StatusBadge text="Sukses" status="success" />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const viewInstance = tree.toJSON();
    const flatStyle = StyleSheet.flatten(viewInstance.props.style);
    expect(flatStyle.backgroundColor).toBe('#d1fae5');

    const textInstance = tree.root.findByType(Text);
    const flatTextStyle = StyleSheet.flatten(textInstance.props.style);
    expect(flatTextStyle.color).toBe('#065f46');
  });

  it('applies danger colors in light mode', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <StatusBadge text="Bahaya" status="danger" />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const viewInstance = tree.toJSON();
    const flatStyle = StyleSheet.flatten(viewInstance.props.style);
    expect(flatStyle.backgroundColor).toBe('#fee2e2');

    const textInstance = tree.root.findByType(Text);
    const flatTextStyle = StyleSheet.flatten(textInstance.props.style);
    expect(flatTextStyle.color).toBe('#991b1b');
  });
});
