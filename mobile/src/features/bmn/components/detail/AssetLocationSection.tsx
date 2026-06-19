import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SectionCard } from '@/components/SectionCard';
import { AssetDetail } from '../../types';

interface AssetLocationSectionProps {
  asset: AssetDetail;
}

export function AssetLocationSection({ asset }: AssetLocationSectionProps) {
  const { colors, spacing, typography } = useAppTheme();

  const renderItem = (label: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <View style={[styles.row, { paddingVertical: spacing.sm }]}>
        <Text style={[styles.label, { color: colors.mutedForeground, fontSize: typography.fontSizes.sm, fontFamily: typography.fontFamilies.sans }]}>
          {label}
        </Text>
        <Text style={[styles.value, { color: colors.foreground, fontSize: typography.fontSizes.sm, fontFamily: typography.fontFamilies.sans, fontWeight: typography.fontWeights.semibold }]}>
          {value}
        </Text>
      </View>
    );
  };

  const picName = asset.penanggung_jawab?.nama_lengkap;
  const picNip = asset.penanggung_jawab?.nip ? `(NIP: ${asset.penanggung_jawab.nip})` : '';
  const picDisplay = picName ? `${picName} ${picNip}`.trim() : null;

  return (
    <SectionCard title="Lokasi & Penanggung Jawab">
      <View style={[styles.content, { marginTop: spacing.xs }]}>
        {renderItem('Lokasi Wilayah', asset.lokasi)}
        {renderItem('Ruangan', asset.lokasi_ruang)}
        {renderItem('Penanggung Jawab', picDisplay)}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  label: {
    flex: 1,
  },
  value: {
    flex: 2,
    textAlign: 'right',
  },
});
