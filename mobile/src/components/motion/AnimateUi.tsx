import React, { useCallback, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** Native equivalents of the web Animate UI entrance and chart-reveal timings. */
export function useAnimateUiProgress({
  duration = 160,
  enabled = true,
  transitionKey,
}: { duration?: number; enabled?: boolean; transitionKey?: string } = {}) {
  const [progress] = useState(() => new Animated.Value(1));

  useFocusEffect(useCallback(() => {
    if (!enabled) {
      progress.setValue(1);
      return;
    }

    let focused = true;
    let animation: Animated.CompositeAnimation | undefined;
    const play = (reduceMotion: boolean) => {
      if (!focused) return;
      animation?.stop();
      progress.setValue(reduceMotion ? 1 : 0);
      if (!reduceMotion) {
        animation = Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
        });
        animation.start();
      }
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', play);
    void AccessibilityInfo.isReduceMotionEnabled().then(play).catch(() => play(true));

    return () => {
      focused = false;
      animation?.stop();
      subscription.remove();
      progress.setValue(1);
    };
  // The key deliberately replays the entrance for tabs within the same focused route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, enabled, progress, transitionKey]));

  return progress;
}

export function AnimateUiScreen({ children, style, transitionKey }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  transitionKey?: string;
}) {
  const progress = useAnimateUiProgress({ transitionKey });

  return (
    <Animated.View testID="animate-ui-screen" style={[
      style,
      {
        opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }),
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      },
    ]}>
      {children}
    </Animated.View>
  );
}
