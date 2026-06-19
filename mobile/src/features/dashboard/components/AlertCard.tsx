import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { UrgentTaxVehicle } from '../types';

interface AlertCardProps {
  vehicles: UrgentTaxVehicle[];
}

export default function AlertCard({ vehicles }: AlertCardProps) {
  const { colors, spacing, radius, typography } = useAppTheme();

  if (vehicles.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.danger + '08',
          borderColor: colors.danger + '30',
          borderRadius: radius.xl,
          padding: spacing.lg,
        },
      ]}
      accessibilityLabel="Notifikasi Jatuh Tempo Pajak Kendaraan"
    >
      <View style={styles.header}>
        <View style={[styles.indicator, { backgroundColor: colors.danger }]} />
        <Text
          style={[
            styles.title,
            {
              color: colors.danger,
              fontFamily: typography.fontFamilies.sans,
              fontWeight: typography.fontWeights.bold,
            },
          ]}
        >
          Perhatian: Pajak STNK Segera Jatuh Tempo
        </Text>
      </View>
      <View style={styles.list}>
        {vehicles.map((vehicle) => (
          <View
            key={vehicle.id}
            style={[
              styles.item,
              {
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.vehicleName,
                {
                  color: colors.foreground,
                  fontFamily: typography.fontFamilies.sans,
                  fontWeight: typography.fontWeights.semibold,
                },
              ]}
            >
              {vehicle.nama_barang}
            </Text>
            <View style={styles.metadata}>
              {vehicle.no_polisi && (
                <Text
                  style={[
                    styles.badge,
                    {
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                      borderRadius: radius.sm,
                      fontFamily: typography.fontFamilies.sans,
                      fontWeight: typography.fontWeights.semibold,
                    },
                  ]}
                >
                  {vehicle.no_polisi}
                </Text>
              )}
              <Text
                style={[
                  styles.date,
                  {
                    color: colors.mutedForeground,
                    fontFamily: typography.fontFamilies.sans,
                  },
                ]}
              >
                {`Jatuh Tempo: ${vehicle.tanggal_pajak_stnk}`}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  list: {
    marginTop: 4,
  },
  item: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  vehicleName: {
    fontSize: 14,
    lineHeight: 18,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  badge: {
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  date: {
    fontSize: 12,
  },
});
