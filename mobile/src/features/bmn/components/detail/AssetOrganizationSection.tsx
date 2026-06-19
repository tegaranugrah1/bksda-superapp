import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SectionCard } from '@/components/SectionCard';
import { AssetDetail } from '../../types';

interface AssetOrganizationSectionProps {
  asset: AssetDetail;
}

export function AssetOrganizationSection({ asset }: AssetOrganizationSectionProps) {
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

  // Safe checks for nested penanggung_jawab properties
  const pj = asset.penanggung_jawab as any;
  const satker = pj?.satuan_kerja || pj?.satuan_kerja_name;
  const unitKerja = pj?.unit_kerja || pj?.unit_kerja_name;

  return (
    <SectionCard title="Informasi Organisasi & Pengguna">
      <View style={[styles.content, { marginTop: spacing.xs }]}>
        {renderItem('Pengguna Barang', asset.pengguna)}
        {renderItem('Satuan Kerja', satker)}
        {renderItem('Unit Kerja', unitKerja)}
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
