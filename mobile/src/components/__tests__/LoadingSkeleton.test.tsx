import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { LoadingSkeleton } from '../LoadingSkeleton';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      background: '#ffffff',
      foreground: '#09090b',
      border: '#e2e8f0',
      muted: '#f1f5f9',
      card: '#ffffff',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
    },
    radius: {
      sm: 4,
      md: 6,
      lg: 8,
      full: 9999,
    },
  }),
}));

describe('LoadingSkeleton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with list variant and correct count', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<LoadingSkeleton variant="list" count={5} />);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const instance = tree.toJSON();
    expect(instance.children.length).toBe(5);
  });

  it('renders correctly with card variant', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<LoadingSkeleton variant="card" count={2} />);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const instance = tree.toJSON();
    expect(instance.children.length).toBe(2);
  });

  it('renders correctly with detail variant', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<LoadingSkeleton variant="detail" />);
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const instance = tree.toJSON();
    expect(instance.children.length).toBe(1);
  });
});
