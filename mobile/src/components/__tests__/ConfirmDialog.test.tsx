import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ConfirmDialog } from '../ConfirmDialog';
import { Text, TouchableOpacity, Modal } from 'react-native';

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
      card: '#ffffff',
      border: '#e2e8f0',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
    },
    radius: {
      lg: 8,
      xl: 12,
    },
    typography: {
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
      },
      fontWeights: {
        bold: '700',
        semibold: '600',
      },
    },
  }),
}));

describe('ConfirmDialog', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly when visible is true', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ConfirmDialog
          visible={true}
          title="Hapus Aset"
          message="Apakah Anda yakin ingin menghapus aset ini?"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const modalInstance = tree.root.findByType(Modal);
    expect(modalInstance.props.visible).toBe(true);

    const textInstances = tree.root.findAllByType(Text);
    const titleInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Hapus Aset'
    );
    expect(titleInstance).toBeTruthy();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ConfirmDialog
          visible={true}
          title="Hapus"
          message="Yakin?"
          onConfirm={jest.fn()}
          onCancel={handleCancel}
          cancelText="Tidak"
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    // Cancel is the first button (AppButton with cancel text)
    const touchables = tree.root.findAllByType(TouchableOpacity);
    const cancelTouchable = touchables[0];
    
    act(() => {
      cancelTouchable.props.onPress();
    });

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const handleConfirm = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ConfirmDialog
          visible={true}
          title="Hapus"
          message="Yakin?"
          onConfirm={handleConfirm}
          onCancel={jest.fn()}
          confirmText="Ya, Hapus"
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    // Confirm is the second button (AppButton with confirm text)
    const touchables = tree.root.findAllByType(TouchableOpacity);
    const confirmTouchable = touchables[1];
    
    act(() => {
      confirmTouchable.props.onPress();
    });

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('has correct accessibility properties on the dialog container', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ConfirmDialog
          visible={true}
          title="Hapus Aset"
          message="Apakah Anda yakin ingin menghapus aset ini?"
          onConfirm={jest.fn()}
          onCancel={jest.fn()}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const modalInstance = tree.root.findByType(Modal);
    const container = modalInstance.findByProps({ accessibilityViewIsModal: true });
    expect(container).toBeTruthy();
    expect(container.props.importantForAccessibility).toBe('yes');
  });
});
