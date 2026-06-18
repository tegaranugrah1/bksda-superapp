import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppButton } from '../AppButton';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

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
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
    },
    radius: {
      lg: 8,
    },
    typography: {
      fontSizes: {
        md: 16,
      },
      fontWeights: {
        semibold: '600',
      },
    },
  }),
}));

describe('AppButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders correctly with default props', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<AppButton title="Click Me" onPress={handlePress} />);
    });
    
    act(() => {
      jest.runAllTimers();
    });

    const textInstance = tree.root.findByType(Text);
    expect(textInstance.props.children).toBe('Click Me');
  });

  it('triggers onPress when clicked', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<AppButton title="Click Me" onPress={handlePress} />);
    });
    
    act(() => {
      jest.runAllTimers();
    });

    const touchableInstance = tree.root.findByType(TouchableOpacity);
    
    act(() => {
      touchableInstance.props.onPress();
    });
    
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it('does not trigger onPress when disabled', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppButton title="Click Me" onPress={handlePress} disabled={true} />
      );
    });
    
    act(() => {
      jest.runAllTimers();
    });

    const touchableInstance = tree.root.findByType(TouchableOpacity);
    expect(touchableInstance.props.disabled).toBe(true);
  });

  it('shows activity indicator when loading', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <AppButton title="Click Me" onPress={handlePress} loading={true} />
      );
    });
    
    act(() => {
      jest.runAllTimers();
    });

    const indicatorInstance = tree.root.findByType(ActivityIndicator);
    expect(indicatorInstance).toBeTruthy();
  });
});
