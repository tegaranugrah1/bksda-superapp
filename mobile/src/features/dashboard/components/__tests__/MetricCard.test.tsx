import React from 'react';
import renderer, { act } from 'react-test-renderer';
import MetricCard from '../MetricCard';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#e2e8f0',
      primary: '#16a34a',
      foreground: '#09090b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6',
    },
    spacing: {
      md: 12,
    },
    radius: {
      lg: 8,
      md: 6,
    },
    typography: {
      fontFamilies: {
        sans: 'System',
      },
      fontWeights: {
        bold: '700',
        medium: '500',
      },
    },
  }),
}));

describe('MetricCard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders count and label correctly', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<MetricCard count={12} label="Aset Aktif" />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const textNodes = root.findAllByType('Text');
    const texts = textNodes.map((n: any) => n.props.children);

    expect(texts).toContain(12);
    expect(texts).toContain('Aset Aktif');

    act(() => {
      tree.unmount();
    });
  });

  it('applies styles based on variant prop correctly', () => {
    // Test success variant
    let treeSuccess: any;
    act(() => {
      treeSuccess = renderer.create(
        <MetricCard count={5} label="Selesai" variant="success" />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    // First Text inside View
    const countTextSuccess = treeSuccess.root.findAllByType('Text')[0].props.style;
    // expect text color to be success color
    expect(countTextSuccess.some((s: any) => s && s.color === '#10b981')).toBe(true);

    act(() => {
      treeSuccess.unmount();
    });

    // Test warning variant
    let treeWarning: any;
    act(() => {
      treeWarning = renderer.create(
        <MetricCard count={2} label="Pending" variant="warning" />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const countTextWarning = treeWarning.root.findAllByType('Text')[0].props.style;
    expect(countTextWarning.some((s: any) => s && s.color === '#f59e0b')).toBe(true);

    act(() => {
      treeWarning.unmount();
    });
  });
});
