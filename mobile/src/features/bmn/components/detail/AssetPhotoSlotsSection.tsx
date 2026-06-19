import React from 'react';
import { StyleSheet, View, Text, Image } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { SectionCard } from '@/components/SectionCard';
import { AppButton } from '@/components/AppButton';
import { AssetDetail } from '../../types';

interface AssetPhotoSlotsSectionProps {
  asset: AssetDetail;
  onCapturePhoto: (type: 'depan' | 'belakang' | 'kiri' | 'kanan') => void;
  onDeletePhoto: (type: 'depan' | 'belakang' | 'kiri' | 'kanan') => void;
  isDeleting?: string | null;
}

const PHOTO_SLOTS = [
  { key: 'depan' as const, label: 'Tampak Depan', urlKey: 'foto_depan_url' as const },
  { key: 'belakang' as const, label: 'Tampak Belakang', urlKey: 'foto_belakang_url' as const },
  { key: 'kiri' as const, label: 'Tampak Kiri', urlKey: 'foto_kiri_url' as const },
  { key: 'kanan' as const, label: 'Tampak Kanan', urlKey: 'foto_kanan_url' as const },
];

export function AssetPhotoSlotsSection({
  asset,
  onCapturePhoto,
  onDeletePhoto,
  isDeleting = null,
}: AssetPhotoSlotsSectionProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const canUpload = asset.allowed_actions?.can_upload_photo ?? false;

  return (
    <SectionCard title="Foto Fisik BMN">
      <View style={[styles.grid, { gap: spacing.md }]}>
        {PHOTO_SLOTS.map((slot) => {
          const imageUrl = asset[slot.urlKey];
          const hasPhoto = !!imageUrl;
          const deletingThisSlot = isDeleting === slot.key;

          return (
            <View
              key={slot.key}
              style={[
                styles.slotCard,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                  padding: spacing.sm,
                },
              ]}
              testID={`photo-slot-${slot.key}`}
            >
              <Text
                style={[
                  styles.slotLabel,
                  {
                    color: colors.foreground,
                    fontFamily: typography.fontFamilies.sans,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                    marginBottom: spacing.xs,
                  },
                ]}
              >
                {slot.label}
              </Text>

              <View
                style={[
                  styles.imageContainer,
                  {
                    backgroundColor: colors.secondary,
                    borderRadius: radius.sm,
                    height: 120,
                  },
                ]}
              >
                {hasPhoto && imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode="cover"
                    accessibilityLabel={slot.label}
                    testID={`photo-image-${slot.key}`}
                  />
                ) : (
                  <View style={styles.placeholder} testID={`photo-placeholder-${slot.key}`}>
                    <Text style={{ fontSize: 24, marginBottom: spacing.xs }}>📷</Text>
                    <Text
                      style={[
                        styles.placeholderText,
                        {
                          color: colors.mutedForeground,
                          fontSize: typography.fontSizes.xs,
                          fontFamily: typography.fontFamilies.sans,
                        },
                      ]}
                    >
                      Foto Belum Tersedia
                    </Text>
                  </View>
                )}
              </View>

              {canUpload && (
                <View style={[styles.actionContainer, { marginTop: spacing.sm }]}>
                  {hasPhoto ? (
                    <AppButton
                      title="Hapus Foto"
                      variant="danger"
                      onPress={() => onDeletePhoto(slot.key)}
                      loading={deletingThisSlot}
                      disabled={deletingThisSlot}
                      leftIcon={<Text style={{ fontSize: 14 }}>🗑️</Text>}
                      accessibilityLabel={`Hapus ${slot.label}`}
                    />
                  ) : (
                    <AppButton
                      title="Ambil Foto"
                      variant="primary"
                      onPress={() => onCapturePhoto(slot.key)}
                      leftIcon={<Text style={{ fontSize: 14 }}>📷</Text>}
                      accessibilityLabel={`Ambil ${slot.label}`}
                    />
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  slotCard: {
    width: '48%',
    borderWidth: 1,
    alignItems: 'stretch',
    marginBottom: 8,
  },
  slotLabel: {
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  placeholderText: {
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
  },
});
