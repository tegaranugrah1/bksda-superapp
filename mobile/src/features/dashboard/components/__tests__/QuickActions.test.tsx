/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import QuickActions from '../QuickActions';

// Mock theme hook
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      card: '#ffffff',
      border: '#e2e8f0',
      primary: '#16a34a',
      secondary: '#f1f5f9',
      danger: '#ef4444',
      foreground: '#09090b',
    },
    spacing: {
      lg: 16,
      md: 12,
    },
    radius: {
      xl: 12,
      lg: 8,
    },
    typography: {
      fontFamilies: {
        sans: 'System',
      },
      fontWeights: {
        bold: '700',
        semibold: '600',
      },
      fontSizes: {
        md: 16,
      },
    },
  }),
}));

// Mock AppButton to inspect it easily
jest.mock('@/components/AppButton', () => {
  const React = require('react');
  return {
    AppButton: ({ title, onPress }: any) =>
      React.createElement('AppButtonMock', { title, onPress }),
  };
});

describe('QuickActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const defaultProps = {
    canViewBmn: false,
    canLoanBmn: false,
    canViewSuratTugas: false,
    canApproveSuratTugas: false,
    onScanPress: jest.fn(),
    onLoanPress: jest.fn(),
    onViewBmnPress: jest.fn(),
    onViewSuratTugasPress: jest.fn(),
    onApproveSuratTugasPress: jest.fn(),
  };

  it('renders null when there are no permissions', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<QuickActions {...defaultProps} />);
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders only BMN lists and barcode scanning when only BMN view is permitted', () => {
    const props = {
      ...defaultProps,
      canViewBmn: true,
    };

    let tree: any;
    act(() => {
      tree = renderer.create(<QuickActions {...props} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const buttons = root.findAllByType('AppButtonMock');
    expect(buttons.length).toBe(2);

    const titles = buttons.map((b: any) => b.props.title);
    expect(titles).toContain('Daftar BMN');
    expect(titles).toContain('Scan Barcode');
    expect(titles).not.toContain('Pinjam Aset');
    expect(titles).not.toContain('Surat Tugas Saya');
    expect(titles).not.toContain('Persetujuan ST');

    act(() => {
      tree.unmount();
    });
  });

  it('triggers onPress callbacks correctly when buttons are clicked', () => {
    const props = {
      ...defaultProps,
      canViewBmn: true,
      canLoanBmn: true,
      canViewSuratTugas: true,
      canApproveSuratTugas: true,
    };

    let tree: any;
    act(() => {
      tree = renderer.create(<QuickActions {...props} />);
    });

    act(() => {
      jest.runAllTimers();
    });

    const root = tree.root;
    const buttons = root.findAllByType('AppButtonMock');
    expect(buttons.length).toBe(5);

    // Click 'Scan Barcode'
    const scanBtn = buttons.find((b: any) => b.props.title === 'Scan Barcode');
    act(() => {
      scanBtn.props.onPress();
    });
    expect(props.onScanPress).toHaveBeenCalledTimes(1);

    // Click 'Pinjam Aset'
    const loanBtn = buttons.find((b: any) => b.props.title === 'Pinjam Aset');
    act(() => {
      loanBtn.props.onPress();
    });
    expect(props.onLoanPress).toHaveBeenCalledTimes(1);

    // Click 'Surat Tugas Saya'
    const stBtn = buttons.find((b: any) => b.props.title === 'Surat Tugas Saya');
    act(() => {
      stBtn.props.onPress();
    });
    expect(props.onViewSuratTugasPress).toHaveBeenCalledTimes(1);

    // Click 'Persetujuan ST'
    const approveBtn = buttons.find((b: any) => b.props.title === 'Persetujuan ST');
    act(() => {
      approveBtn.props.onPress();
    });
    expect(props.onApproveSuratTugasPress).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
  });
});
