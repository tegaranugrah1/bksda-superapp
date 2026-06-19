import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { StatusBadge } from '@/components/StatusBadge';
import { AssetDetail } from '../../types';

interface AssetSummarySectionProps {
  asset: AssetDetail;
}

export function AssetSummarySection({ asset }: AssetSummarySectionProps) {
  const { colors, spacing, typography, radius } = useAppTheme();

  const getKondisiStatus = (kondisi?: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (!kondisi) return 'neutral';
    switch (kondisi.toLowerCase()) {
      case 'baik':
        return 'success';
      case 'rusak ringan':
        return 'warning';
      case 'rusak berat':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, padding: spacing.lg, borderRadius: radius.lg }]}>
      <Text
        style={[
          styles.namaBarang,
          {
            color: colors.foreground,
            fontFamily: typography.fontFamilies.sans,
            fontWeight: typography.fontWeights.bold,
            fontSize: typography.fontSizes.lg,
          },
        ]}
      >
        {asset.nama_barang}
      </Text>

      {asset.merk_tipe ? (
        <Text
          style={[
            styles.merk,
            {
              color: colors.mutedForeground,
              fontFamily: typography.fontFamilies.sans,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.xs,
            },
          ]}
        >
          {`Merk/Tipe: ${asset.merk_tipe}`}
        </Text>
      ) : null}

      <View style={[styles.badgeRow, { marginTop: spacing.md }]}>
        {asset.kondisi && (
          <StatusBadge
            text={asset.kondisi}
            status={getKondisiStatus(asset.kondisi)}
          />
        )}
        <StatusBadge
          text={asset.is_verified ? 'Terverifikasi' : 'Belum Verifikasi'}
          status={asset.is_verified ? 'success' : 'neutral'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
  },
  namaBarang: {
    lineHeight: 24,
  },
  merk: {
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
