import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SearchInput } from '../SearchInput';
import { TextInput, TouchableOpacity } from 'react-native';

// Mock the useAppTheme hook to prevent native dependency issues during tests
jest.mock('@/hooks/useAppTheme', () => ({
  useAppTheme: () => ({
    colors: {
      primary: '#16a34a',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      background: '#ffffff',
      foreground: '#09090b',
      border: '#e2e8f0',
      card: '#ffffff',
      mutedForeground: '#64748b',
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
    },
  }),
}));

describe('SearchInput', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with placeholder and value', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SearchInput
          value="query"
          onChangeText={jest.fn()}
          placeholder="Cari aset..."
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const inputInstance = tree.root.findByType(TextInput);
    expect(inputInstance.props.value).toBe('query');
    expect(inputInstance.props.placeholder).toBe('Cari aset...');
  });

  it('calls onChangeText when typing', () => {
    const handleChangeText = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SearchInput
          value=""
          onChangeText={handleChangeText}
          placeholder="Cari..."
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const inputInstance = tree.root.findByType(TextInput);
    act(() => {
      inputInstance.props.onChangeText('test');
    });

    expect(handleChangeText).toHaveBeenCalledWith('test');
  });

  it('does not render clear button when value is empty', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SearchInput
          value=""
          onChangeText={jest.fn()}
          placeholder="Cari..."
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const clearButtons = tree.root.findAllByType(TouchableOpacity);
    expect(clearButtons.length).toBe(0);
  });

  it('renders clear button when value is not empty and calls handleClear on press', () => {
    const handleChangeText = jest.fn();
    const handleClear = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <SearchInput
          value="some text"
          onChangeText={handleChangeText}
          onClear={handleClear}
          placeholder="Cari..."
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const clearButton = tree.root.findByType(TouchableOpacity);
    expect(clearButton).toBeTruthy();

    act(() => {
      clearButton.props.onPress();
    });

    expect(handleChangeText).toHaveBeenCalledWith('');
    expect(handleClear).toHaveBeenCalledTimes(1);
  });
});
