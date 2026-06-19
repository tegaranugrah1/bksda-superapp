import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { IconButton } from '../IconButton';
import { TouchableOpacity, Text } from 'react-native';

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
      full: 9999,
    },
  }),
}));

describe('IconButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const DummyIcon = () => <Text>⚙️</Text>;

  it('renders correctly with required props', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <IconButton
          icon={<DummyIcon />}
          onPress={handlePress}
          accessibilityLabel="Settings"
        />
      );
    });
    
    act(() => {
      jest.runAllTimers();
    });

    const iconInstance = tree.root.findByType(DummyIcon);
    expect(iconInstance).toBeTruthy();

    const touchableInstance = tree.root.findByType(TouchableOpacity);
    expect(touchableInstance.props.accessibilityLabel).toBe('Settings');
  });

  it('triggers onPress when clicked', () => {
    const handlePress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(
        <IconButton
          icon={<DummyIcon />}
          onPress={handlePress}
          accessibilityLabel="Settings"
        />
      );
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
        <IconButton
          icon={<DummyIcon />}
          onPress={handlePress}
          accessibilityLabel="Settings"
          disabled={true}
        />
      );
    });

    act(() => {
      jest.runAllTimers();
    });

    const touchableInstance = tree.root.findByType(TouchableOpacity);
    expect(touchableInstance.props.disabled).toBe(true);
  });
});
