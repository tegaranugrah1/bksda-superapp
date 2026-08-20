import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from '@/components/AppButton';

export interface FilterState {
  kondisi?: string;
  jenis_bmn?: string;
  lokasi_ruang?: string;
}

interface AssetFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (newFilters: FilterState) => void;
}

const KONDISI_OPTIONS = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
const JENIS_BMN_OPTIONS = [
  'ALAT ANGKUTAN BERMOTOR',
  'ALAT BESAR',
  'ALAT PERSENJATAAN',
  'BANGUNAN AIR',
  'BANGUNAN DAN GEDUNG',
  'MESIN PERALATAN KHUSUS TIK',
  'MESIN PERALATAN NON TIK',
  'RUMAH NEGARA',
  'TANAH',
];
const LOKASI_OPTIONS = [
  'Kantor Balai KSDA Kalimantan Timur',
  'Seksi KSDA Wilayah I (Berau)',
  'Seksi KSDA Wilayah II (Tenggarong)',
  'Seksi KSDA Wilayah III (Balikpapan)',
];

export default function AssetFilterSheet({
  visible,
  onClose,
  filters,
  onApply,
}: AssetFilterSheetProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  
  // Local state for editing filters
  const [localKondisi, setLocalKondisi] = useState<string | undefined>(filters.kondisi);
  const [localJenisBmn, setLocalJenisBmn] = useState<string | undefined>(filters.jenis_bmn);
  const [localLokasi, setLocalLokasi] = useState<string | undefined>(filters.lokasi_ruang);

  const handleApply = () => {
    onApply({
      kondisi: localKondisi,
      jenis_bmn: localJenisBmn,
      lokasi_ruang: localLokasi,
    });
    onClose();
  };

  const handleClearAll = () => {
    setLocalKondisi(undefined);
    setLocalJenisBmn(undefined);
    setLocalLokasi(undefined);
  };

  const renderChip = (
    value: string,
    selectedValue: string | undefined,
    onSelect: (val: string | undefined) => void
  ) => {
    const isSelected = selectedValue === value;
    return (
      <TouchableOpacity
        key={value}
        onPress={() => onSelect(isSelected ? undefined : value)}
        style={[
          styles.chip,
          {
            borderRadius: radius.full,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs * 1.5,
            marginRight: spacing.xs * 1.5,
            marginBottom: spacing.xs * 1.5,
            backgroundColor: isSelected ? colors.primary : colors.muted,
            borderWidth: 1,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            {
              color: isSelected ? colors.primaryForeground : colors.foreground,
              fontFamily: typography.fontFamilies.sans,
              fontWeight: isSelected ? typography.fontWeights.semibold : typography.fontWeights.medium,
              fontSize: typography.fontSizes.sm,
            },
          ]}
        >
          {value}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: radius.xl * 1.5,
                  borderTopRightRadius: radius.xl * 1.5,
                  padding: spacing.lg,
                },
              ]}
            >
              {/* Drag indicator bar */}
              <View style={[styles.indicator, { backgroundColor: colors.border }]} />

              <View style={styles.header}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: colors.foreground,
                      fontFamily: typography.fontFamilies.sans,
                      fontWeight: typography.fontWeights.bold,
                      fontSize: typography.fontSizes.lg,
                    },
                  ]}
                >
                  Filter Aset BMN
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    Tutup
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Kondisi Filter */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      {
                        color: colors.foreground,
                        fontFamily: typography.fontFamilies.sans,
                        fontWeight: typography.fontWeights.bold,
                        fontSize: typography.fontSizes.sm,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    Kondisi Barang
                  </Text>
                  <View style={styles.chipRow}>
                    {KONDISI_OPTIONS.map((opt) => renderChip(opt, localKondisi, setLocalKondisi))}
                  </View>
                </View>

                {/* Jenis BMN Filter */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      {
                        color: colors.foreground,
                        fontFamily: typography.fontFamilies.sans,
                        fontWeight: typography.fontWeights.bold,
                        fontSize: typography.fontSizes.sm,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    Jenis Barang (BMN)
                  </Text>
                  <View style={styles.chipRow}>
                    {JENIS_BMN_OPTIONS.map((opt) => renderChip(opt, localJenisBmn, setLocalJenisBmn))}
                  </View>
                </View>

                {/* Lokasi Filter */}
                <View style={styles.section}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      {
                        color: colors.foreground,
                        fontFamily: typography.fontFamilies.sans,
                        fontWeight: typography.fontWeights.bold,
                        fontSize: typography.fontSizes.sm,
                        marginBottom: spacing.sm,
                      },
                    ]}
                  >
                    Lokasi Wilayah/Ruang
                  </Text>
                  <View style={styles.chipRow}>
                    {LOKASI_OPTIONS.map((opt) => renderChip(opt, localLokasi, setLocalLokasi))}
                  </View>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.actionRow, { marginTop: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.card }]}>
                <View style={styles.buttonWrapper}>
                  <AppButton
                    title="Hapus Semua"
                    variant="ghost"
                    onPress={handleClearAll}
                  />
                </View>
                <View style={[styles.buttonWrapper, { marginLeft: spacing.sm }]}>
                  <AppButton
                    title="Terapkan"
                    variant="primary"
                    onPress={handleApply}
                  />
                </View>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '80%',
    width: '100%',
  },
  indicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    letterSpacing: -0.25,
  },
  scrollArea: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
  },
});
