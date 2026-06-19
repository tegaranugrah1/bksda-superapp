import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';

export type LoadingSkeletonProps = {
  variant?: 'card' | 'list' | 'detail';
  count?: number;
};

export function LoadingSkeleton({
  variant = 'list',
  count = 3,
}: LoadingSkeletonProps) {
  const { colors, spacing, radius } = useAppTheme();
  const [pulseAnim] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 0.4,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(pulse).start();
  }, [pulseAnim]);

  const skeletonBg = colors.muted;

  const renderCardSkeleton = () => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Avatar/Icon placeholder */}
        <Animated.View
          style={[
            styles.avatar,
            {
              backgroundColor: skeletonBg,
              borderRadius: radius.full,
              opacity: pulseAnim,
              marginRight: spacing.md,
            },
          ]}
        />
        {/* Text lines */}
        <View style={styles.flex1}>
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonBg,
                borderRadius: radius.sm,
                width: '60%',
                height: 16,
                marginBottom: spacing.sm,
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonBg,
                borderRadius: radius.sm,
                width: '40%',
                height: 12,
                opacity: pulseAnim,
              },
            ]}
          />
        </View>
      </View>
      <View style={[styles.cardContent, { marginTop: spacing.lg }]}>
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonBg,
              borderRadius: radius.sm,
              width: '100%',
              height: 12,
              marginBottom: spacing.sm,
              opacity: pulseAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.line,
            {
              backgroundColor: skeletonBg,
              borderRadius: radius.sm,
              width: '80%',
              height: 12,
              opacity: pulseAnim,
            },
          ]}
        />
      </View>
    </View>
  );

  const renderListSkeleton = () => (
    <View
      style={[
        styles.listItem,
        {
          borderColor: colors.border,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.xs,
        },
      ]}
    >
      <View style={styles.row}>
        <Animated.View
          style={[
            styles.iconPlaceholder,
            {
              backgroundColor: skeletonBg,
              borderRadius: radius.md,
              marginRight: spacing.md,
              opacity: pulseAnim,
            },
          ]}
        />
        <View style={styles.flex1}>
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonBg,
                borderRadius: radius.sm,
                width: '70%',
                height: 14,
                marginBottom: spacing.sm,
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonBg,
                borderRadius: radius.sm,
                width: '50%',
                height: 12,
                opacity: pulseAnim,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderDetailSkeleton = () => (
    <View style={[styles.detailContainer, { padding: spacing.lg }]}>
      {/* Banner / Header image placeholder */}
      <Animated.View
        style={[
          styles.detailBanner,
          {
            backgroundColor: skeletonBg,
            borderRadius: radius.lg,
            marginBottom: spacing.xl,
            opacity: pulseAnim,
          },
        ]}
      />

      {/* Structured Details blocks */}
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.detailRow, { marginBottom: spacing.lg }]}>
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonBg,
                borderRadius: radius.sm,
                width: '30%',
                height: 12,
                marginBottom: spacing.sm,
                opacity: pulseAnim,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.line,
              {
                backgroundColor: skeletonBg,
                borderRadius: radius.sm,
                width: '90%',
                height: 16,
                opacity: pulseAnim,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return renderCardSkeleton();
      case 'detail':
        return renderDetailSkeleton();
      case 'list':
      default:
        return renderListSkeleton();
    }
  };

  // Generate an array of elements based on count
  const items = Array.from({ length: variant === 'detail' ? 1 : count });

  return (
    <View style={styles.container}>
      {items.map((_, index) => (
        <View key={index} style={styles.w100}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  w100: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flex1: {
    flex: 1,
  },
  card: {
    width: '100%',
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
  },
  line: {
    height: 12,
  },
  cardContent: {
    width: '100%',
  },
  listItem: {
    width: '100%',
    borderBottomWidth: 1,
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
  },
  detailContainer: {
    width: '100%',
  },
  detailBanner: {
    width: '100%',
    height: 160,
  },
  detailRow: {
    width: '100%',
  },
});
