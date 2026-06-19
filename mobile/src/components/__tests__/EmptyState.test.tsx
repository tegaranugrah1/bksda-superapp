import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { EmptyState } from '../EmptyState';
import { Text } from 'react-native';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
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
      },
    },
  }),
}));

describe('EmptyState', () => {
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
        <EmptyState
          title="Tidak ada aset"
          message="Silakan buat aset baru atau sinkronisasikan ulang"
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const titleInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Tidak ada aset'
    );
    expect(titleInstance).toBeTruthy();

    const messageInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Silakan buat aset baru atau sinkronisasikan ulang'
    );
    expect(messageInstance).toBeTruthy();
  });

  it('renders action when provided', () => {
    const DummyAction = () => <Text>Reload</Text>;
    let tree: any;
    act(() => {
      tree = renderer.create(
        <EmptyState
          title="Tidak ada aset"
          action={<DummyAction />}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const actionInstance = tree.root.findByType(DummyAction);
    expect(actionInstance).toBeTruthy();
  });

  it('has correct accessibility properties on layout and elements', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <EmptyState
          title="Tidak ada aset"
          message="Silakan buat aset baru"
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const parentView = tree.root.children[0];
    expect(parentView.props.accessibilityRole).toBe('summary');
    expect(parentView.props.accessibilityLabel).toBe('Tidak ada aset. Silakan buat aset baru');

    const textInstances = tree.root.findAllByType(Text);
    const emojiInstance = textInstances.find((inst: any) => inst.props.children === '📭');
    expect(emojiInstance).toBeTruthy();
    expect(emojiInstance.props.accessibilityElementsHidden).toBe(true);
    expect(emojiInstance.props.importantForAccessibility).toBe('no');
  });
});
