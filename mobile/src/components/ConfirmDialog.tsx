import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from './AppButton';

export type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Ya',
  cancelText = 'Batal',
  isDestructive = false,
}: ConfirmDialogProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap acts as cancel */}
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View
          accessibilityViewIsModal={true}
          importantForAccessibility="yes"
          style={[
            styles.dialogContainer,
            {
              backgroundColor: colors.card,
              borderRadius: radius.xl,
              padding: spacing.xl,
              borderColor: colors.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: isDestructive ? colors.danger : colors.foreground,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginBottom: spacing.sm,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.message,
              {
                color: colors.mutedForeground,
                fontSize: typography.fontSizes.sm,
                marginBottom: spacing.xl,
              },
            ]}
          >
            {message}
          </Text>

          <View style={[styles.buttonRow, { gap: spacing.md }]}>
            <View style={styles.buttonWrapper}>
              <AppButton
                title={cancelText}
                onPress={onCancel}
                variant="ghost"
              />
            </View>
            <View style={styles.buttonWrapper}>
              <AppButton
                title={confirmText}
                onPress={onConfirm}
                variant={isDestructive ? 'danger' : 'primary'}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 340,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1,
  },
  title: {
    textAlign: 'left',
  },
  message: {
    textAlign: 'left',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
  },
});
