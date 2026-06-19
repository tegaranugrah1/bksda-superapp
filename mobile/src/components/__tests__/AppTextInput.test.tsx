import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppTextInput } from '../AppTextInput';
import { TextInput, Text } from 'react-native';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      danger: '#ef4444',
      dangerForeground: '#ffffff',
      background: '#ffffff',
      foreground: '#09090b',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    radius: {
      md: 6,
    },
    typography: {
      fontSizes: {
        xs: 12,
        sm: 14,
        md: 16,
      },
      fontWeights: {
        medium: '500',
      },
    },
  }),
}));

describe('AppTextInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with label and value', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppTextInput
          label="Username"
          value="john_doe"
          onChangeText={jest.fn()}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const labelInstance = textInstances.find((inst: any) => inst.props.children === 'Username');
    expect(labelInstance).toBeTruthy();

    const inputInstance = tree.root.findByType(TextInput);
    expect(inputInstance.props.value).toBe('john_doe');
  });

  it('calls onChangeText when input text changes', () => {
    const handleChangeText = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppTextInput
          label="Username"
          value=""
          onChangeText={handleChangeText}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const inputInstance = tree.root.findByType(TextInput);
    act(() => {
      inputInstance.props.onChangeText('new_value');
    });

    expect(handleChangeText).toHaveBeenCalledWith('new_value');
  });

  it('renders helper text when helperText is provided and no error', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppTextInput
          label="Username"
          value=""
          onChangeText={jest.fn()}
          helperText="Masukkan nama pengguna Anda"
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const helperInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Masukkan nama pengguna Anda'
    );
    expect(helperInstance).toBeTruthy();
  });

  it('renders error text and hides helper text when error is provided', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppTextInput
          label="Username"
          value=""
          onChangeText={jest.fn()}
          helperText="Masukkan nama pengguna Anda"
          error="Nama pengguna tidak boleh kosong"
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const textInstances = tree.root.findAllByType(Text);
    const errorInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Nama pengguna tidak boleh kosong'
    );
    expect(errorInstance).toBeTruthy();

    const helperInstance = textInstances.find(
      (inst: any) => inst.props.children === 'Masukkan nama pengguna Anda'
    );
    expect(helperInstance).toBeFalsy();
  });

  it('disables input when disabled is true', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppTextInput
          label="Username"
          value="john_doe"
          onChangeText={jest.fn()}
          disabled={true}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const inputInstance = tree.root.findByType(TextInput);
    expect(inputInstance.props.editable).toBe(false);
  });
});
