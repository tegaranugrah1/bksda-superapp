import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from '@/components/AppButton';

export interface AssetActionBarProps {
  allowedActions?: {
    can_edit?: boolean;
    can_upload_photo?: boolean;
    can_verify?: boolean;
    can_loan?: boolean;
    can_return?: boolean;
  };
  onEditPress: () => void;
  onUploadPhotoPress: () => void;
  onVerifyPress: () => void;
  onLoanPress: () => void;
  onReturnPress: () => void;
  isVerifying?: boolean;
  isReturning?: boolean;
}

export function AssetActionBar({
  allowedActions = {},
  onEditPress,
  onUploadPhotoPress,
  onVerifyPress,
  onLoanPress,
  onReturnPress,
  isVerifying = false,
  isReturning = false,
}: AssetActionBarProps) {
  const { spacing } = useAppTheme();

  const {
    can_edit = false,
    can_upload_photo = false,
    can_verify = false,
    can_loan = false,
    can_return = false,
  } = allowedActions;

  // If no action is allowed, render nothing
  if (!can_edit && !can_upload_photo && !can_verify && !can_loan && !can_return) {
    return null;
  }

  return (
    <View style={[styles.container, { gap: spacing.md }]}>
      {can_verify && (
        <AppButton
          title="Verifikasi Aset"
          variant="primary"
          onPress={onVerifyPress}
          loading={isVerifying}
          accessibilityLabel="Verifikasi Aset BMN"
        />
      )}

      {can_loan && (
        <AppButton
          title="Pinjam Aset"
          variant="secondary"
          onPress={onLoanPress}
          accessibilityLabel="Ajukan Peminjaman Aset BMN"
        />
      )}

      {can_return && (
        <AppButton
          title="Kembalikan Aset"
          variant="danger"
          onPress={onReturnPress}
          loading={isReturning}
          accessibilityLabel="Kembalikan Aset BMN"
        />
      )}

      {can_upload_photo && (
        <AppButton
          title="Ambil Foto"
          variant="ghost"
          onPress={onUploadPhotoPress}
          accessibilityLabel="Ambil Foto Aset BMN"
        />
      )}

      {can_edit && (
        <AppButton
          title="Ubah Data"
          variant="ghost"
          onPress={onEditPress}
          accessibilityLabel="Ubah Data Aset BMN"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'column',
    marginTop: 8,
    marginBottom: 24,
  },
});
