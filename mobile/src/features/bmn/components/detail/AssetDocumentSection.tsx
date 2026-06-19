import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SectionCard } from '@/components/SectionCard';
import { AssetDetail } from '../../types';

interface AssetDocumentSectionProps {
  asset: AssetDetail;
}

export function AssetDocumentSection({ asset }: AssetDocumentSectionProps) {
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

  const hasBpkb = asset.bpkb_1 || asset.bpkb_2 || asset.bpkb_3 || asset.bpkb_4;
  const hasStnk = asset.stnk_1 || asset.stnk_2;

  // Render document section only if this is a vehicle (BPKB/STNK details or plate exist)
  if (!hasBpkb && !hasStnk && !asset.no_polisi) {
    return null;
  }

  return (
    <SectionCard title="Dokumen Kendaraan">
      <View style={[styles.content, { marginTop: spacing.xs }]}>
        {renderItem('BPKB', hasBpkb ? 'Tersedia' : 'Tidak Tersedia')}
        {renderItem('STNK', hasStnk ? 'Tersedia' : 'Tidak Tersedia')}
        {renderItem('Tanggal Pajak STNK', asset.tanggal_pajak_stnk)}
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
