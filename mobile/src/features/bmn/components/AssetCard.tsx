import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/hooks/useAppTheme';
import { StatusBadge } from '@/components/StatusBadge';
import { AssetListItem } from '../types';

interface AssetCardProps {
  asset: AssetListItem;
  onPress: () => void;
}

export default function AssetCard({ asset, onPress }: AssetCardProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  const handlePress = () => {
    onPress();
  };

  // Map kondisi to status badge variant
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

  const codeAndNup = [
    asset.kode_barang,
    asset.nup ? `NUP ${asset.nup}` : null,
  ].filter(Boolean).join(' / ');

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Aset: ${asset.nama_barang}. ${codeAndNup}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <Text
          numberOfLines={2}
          style={[
            styles.title,
            {
              color: colors.foreground,
              fontFamily: typography.fontFamilies.sans,
              fontWeight: typography.fontWeights.bold,
              fontSize: typography.fontSizes.md,
            },
          ]}
        >
          {asset.nama_barang}
        </Text>
      </View>

      {codeAndNup ? (
        <Text
          style={[
            styles.subTitle,
            {
              color: colors.mutedForeground,
              fontFamily: typography.fontFamilies.sans,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.xs,
            },
          ]}
        >
          {codeAndNup}
        </Text>
      ) : null}

      {!!asset.merk_tipe && (
        <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.sm, marginTop: spacing.xs }]}>
          {asset.merk_tipe}
        </Text>
      )}

      {asset.jenis_bmn ? (
        <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.sm, marginTop: spacing.xs }]}>
          {asset.jenis_bmn}
        </Text>
      ) : null}

      {!!(asset.pengguna || asset.nama_pengguna) && (
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{asset.nama_pengguna || asset.pengguna}</Text>
        </View>
      )}

      {!!(asset.lokasi_ruang || asset.lokasi) && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{asset.lokasi_ruang || asset.lokasi}</Text>
        </View>
      )}

      {(() => {
        const assetText = `${asset.jenis_bmn || ''} ${asset.nama_barang || ''}`.toLowerCase();
        const isVehicle = assetText.includes('angkutan') || assetText.includes('kendaraan');
        return isVehicle && asset.no_polisi && asset.no_polisi !== '-' ? (
          <View style={styles.infoRow}>
            <Ionicons name="car-outline" size={14} color="#059669" />
            <Text style={[styles.infoText, { color: '#059669', fontWeight: '800' }]}>{asset.no_polisi}</Text>
          </View>
        ) : null;
      })()}

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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    lineHeight: 20,
    flex: 1,
  },
  subTitle: {
    lineHeight: 18,
  },
  metaText: {
    lineHeight: 18,
  },
  plateContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  plateText: {
    lineHeight: 16,
  },
  locationText: {
    lineHeight: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
