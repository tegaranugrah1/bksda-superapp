import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SectionCard } from '@/components/SectionCard';
import { AssetDetail } from '../../types';

interface AssetFinanceSectionProps {
  asset: AssetDetail;
}

export function AssetFinanceSection({ asset }: AssetFinanceSectionProps) {
  const { colors, spacing, typography } = useAppTheme();

  const formatRupiah = (val?: number) => {
    if (val === undefined || val === null) return null;
    return `Rp ${val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
  };

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

  return (
    <SectionCard title="Informasi Keuangan">
      <View style={[styles.content, { marginTop: spacing.xs }]}>
        {renderItem('Nilai Perolehan', formatRupiah(asset.nilai_perolehan))}
        {renderItem('Tanggal Perolehan', asset.tanggal_pembelian)}
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
