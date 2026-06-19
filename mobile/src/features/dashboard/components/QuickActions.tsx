import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from '@/components/AppButton';

interface QuickActionsProps {
  canViewBmn: boolean;
  canLoanBmn: boolean;
  canViewSuratTugas: boolean;
  canApproveSuratTugas: boolean;
  onLoanPress: () => void;
  onViewBmnPress: () => void;
  onViewSuratTugasPress: () => void;
  onApproveSuratTugasPress: () => void;
}

export default function QuickActions({
  canViewBmn,
  canLoanBmn,
  canViewSuratTugas,
  canApproveSuratTugas,
  onLoanPress,
  onViewBmnPress,
  onViewSuratTugasPress,
  onApproveSuratTugasPress,
}: QuickActionsProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  // If no action is permitted, do not show this section at all
  const hasAnyPermission =
    canViewBmn || canLoanBmn || canViewSuratTugas || canApproveSuratTugas;

  if (!hasAnyPermission) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: spacing.lg,
        },
      ]}
      accessibilityLabel="Menu Aksi Cepat"
    >
      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontFamily: typography.fontFamilies.sans,
            fontWeight: typography.fontWeights.bold,
            marginBottom: spacing.md,
          },
        ]}
      >
        Aksi Cepat
      </Text>
      
      <View style={styles.grid}>
        {canViewBmn && (
          <View style={styles.buttonWrapper}>
            <AppButton
              title="Daftar BMN"
              variant="primary"
              onPress={onViewBmnPress}
              accessibilityLabel="Buka daftar barang milik negara"
            />
          </View>
        )}

        {canLoanBmn && (
          <View style={styles.buttonWrapper}>
            <AppButton
              title="Pilih Aset"
              variant="secondary"
              onPress={onLoanPress}
              accessibilityLabel="Pilih aset BMN untuk diajukan peminjaman"
            />
          </View>
        )}

        {canViewSuratTugas && (
          <View style={styles.buttonWrapper}>
            <AppButton
              title="Surat Tugas Saya"
              variant="primary"
              onPress={onViewSuratTugasPress}
              accessibilityLabel="Buka daftar surat tugas"
            />
          </View>
        )}

        {canApproveSuratTugas && (
          <View style={styles.buttonWrapper}>
            <AppButton
              title="Persetujuan ST"
              variant="danger"
              onPress={onApproveSuratTugasPress}
              accessibilityLabel="Buka daftar persetujuan surat tugas"
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 16,
  },
  grid: {
    gap: 12,
  },
  buttonWrapper: {
    width: '100%',
  },
});
