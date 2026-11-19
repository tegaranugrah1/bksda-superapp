import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, Text } from 'react-native';
import { AnimateUiScreen } from '../AnimateUi';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.requireActual('react').useEffect,
}));

describe('native Animate UI motion', () => {
  afterEach(() => jest.restoreAllMocks());

  it('leaves content visible and skips motion when Reduce Motion is enabled', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const timing = jest.spyOn(Animated, 'timing');
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AnimateUiScreen><Text>Ready</Text></AnimateUiScreen>);
    });
    expect(timing).not.toHaveBeenCalled();
    expect(tree.root.findByType(Text).props.children).toBe('Ready');
    act(() => tree.unmount());
  });

  it('does not start a delayed animation after the screen has been unmounted', async () => {
    let resolvePreference!: (value: boolean) => void;
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(
      new Promise(resolve => { resolvePreference = resolve; })
    );
    const timing = jest.spyOn(Animated, 'timing');
    let tree!: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AnimateUiScreen><Text>Ready</Text></AnimateUiScreen>); });
    act(() => tree.unmount());
    await act(async () => { resolvePreference(false); });
    expect(timing).not.toHaveBeenCalled();
  });

  it('stops ongoing motion when the accessibility preference changes', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const remove = jest.fn();
    const subscribe = jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue(
      { remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>
    );
    const stop = jest.fn();
    jest.spyOn(Animated, 'timing').mockReturnValue({
      start: jest.fn(), stop, reset: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<AnimateUiScreen><Text>Ready</Text></AnimateUiScreen>);
    });
    const onPreferenceChange = subscribe.mock.calls.filter(([event]) => String(event) === 'reduceMotionChanged').at(-1)?.[1] as unknown as (enabled: boolean) => void;
    act(() => onPreferenceChange(true));
    expect(stop).toHaveBeenCalled();
    expect(tree.root.findByType(Text).props.children).toBe('Ready');
    act(() => tree.unmount());
    expect(remove).toHaveBeenCalled();
  });
});
