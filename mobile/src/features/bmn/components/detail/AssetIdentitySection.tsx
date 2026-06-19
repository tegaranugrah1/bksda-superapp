import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SectionCard } from '@/components/SectionCard';
import { AssetDetail } from '../../types';

interface AssetIdentitySectionProps {
  asset: AssetDetail;
}

export function AssetIdentitySection({ asset }: AssetIdentitySectionProps) {
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

  const codeAndNup = [
    asset.kode_barang,
    asset.nup ? `NUP ${asset.nup}` : null,
  ].filter(Boolean).join(' / ');

  return (
    <SectionCard title="Identitas Barang">
      <View style={[styles.content, { marginTop: spacing.xs }]}>
        {renderItem('Kode / NUP', codeAndNup)}
        {renderItem('Merk / Tipe', asset.merk_tipe)}
        {renderItem('No Rangka', asset.no_rangka)}
        {renderItem('No Mesin', asset.no_mesin)}
        {renderItem('No Polisi', asset.no_polisi)}
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
