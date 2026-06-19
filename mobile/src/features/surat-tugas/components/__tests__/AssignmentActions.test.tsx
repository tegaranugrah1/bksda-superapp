import React from 'react';
import { Modal, Text, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import AssignmentActions from '../AssignmentActions';

jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    isDark: false,
    colors: {
      background: '#ffffff',
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      danger: '#dc2626',
      dangerForeground: '#ffffff',
      foreground: '#09090b',
      card: '#ffffff',
      border: '#e2e8f0',
      mutedForeground: '#64748b',
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
    shadows: {
      sm: {},
    },
    typography: {
      fontWeights: {
        bold: '700',
        semibold: '600',
      },
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
      },
    },
  }),
}));

describe('AssignmentActions', () => {
  it('renders only actions allowed by the backend', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AssignmentActions
          allowedActions={{
            can_view: true,
            can_approve: true,
            can_reject: true,
            can_complete: false,
            can_update: false,
          }}
          currentStatus="pending"
          onAction={jest.fn()}
        />
      );
    });

    const texts = tree!.root.findAllByType(Text).map((node) => node.props.children);
    expect(texts).toContain('Aksi Surat Tugas');
    expect(texts).toContain('Setujui');
    expect(texts).toContain('Tolak');
    expect(texts).not.toContain('Selesai');
    expect(texts).not.toContain('Ajukan');

    act(() => {
      tree!.unmount();
    });
  });

  it('requires confirmation before calling the action callback', () => {
    const handleAction = jest.fn();

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AssignmentActions
          allowedActions={{
            can_view: true,
            can_approve: true,
            can_reject: false,
            can_complete: false,
            can_update: false,
          }}
          currentStatus="pending"
          onAction={handleAction}
        />
      );
    });

    const approveButton = tree!.root.findByProps({ accessibilityLabel: 'Setujui Surat Tugas' });
    act(() => {
      approveButton.props.onPress();
    });

    expect(handleAction).not.toHaveBeenCalled();
    expect(tree!.root.findByType(Modal).props.visible).toBe(true);
    expect(tree!.root.findAllByType(Text).map((node) => node.props.children)).toContain('Setujui Surat Tugas');

    const touchables = tree!.root.findAllByType(TouchableOpacity);
    const confirmTouchable = touchables[touchables.length - 1];
    act(() => {
      confirmTouchable.props.onPress();
    });

    expect(handleAction).toHaveBeenCalledWith('approved');

    act(() => {
      tree!.unmount();
    });
  });

  it('renders nothing when no status actions are allowed', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <AssignmentActions
          allowedActions={{ can_view: true }}
          currentStatus="approved"
          onAction={jest.fn()}
        />
      );
    });

    expect(tree!.toJSON()).toBeNull();

    act(() => {
      tree!.unmount();
    });
  });
});
