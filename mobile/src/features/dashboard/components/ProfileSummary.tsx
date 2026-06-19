import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BriefProfile } from '../types';

interface ProfileSummaryProps {
  profile: BriefProfile;
}

export default function ProfileSummary({ profile }: ProfileSummaryProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const employee = profile.employee;

  const displayName = employee ? employee.nama_lengkap : profile.name;
  const displaySub = employee ? `NIP. ${employee.nip}` : `@${profile.username}`;
  const displayRole = employee ? employee.jabatan : `Role: ${profile.role.toUpperCase()}`;
  const displayUnit = employee ? employee.satuan_kerja : null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.xl,
          padding: spacing.lg,
        },
      ]}
      accessibilityLabel="Informasi Profil Pengguna"
    >
      <View style={styles.header}>
        {employee?.foto_profil ? (
          <Image
            source={{ uri: employee.foto_profil }}
            style={[styles.avatar, { borderRadius: radius.full }]}
            accessibilityLabel={`Foto profil ${displayName}`}
          />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: colors.primary + '20',
                borderRadius: radius.full,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                {
                  color: colors.primary,
                  fontFamily: typography.fontFamilies.sans,
                  fontWeight: typography.fontWeights.bold,
                },
              ]}
            >
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text
            style={[
              styles.name,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontWeight: typography.fontWeights.semibold,
              },
            ]}
          >
            {displayName}
          </Text>
          <Text
            style={[
              styles.subText,
              {
                color: colors.mutedForeground,
                fontFamily: typography.fontFamilies.sans,
              },
            ]}
          >
            {displaySub}
          </Text>
          <Text
            style={[
              styles.role,
              {
                color: colors.mutedForeground,
                fontFamily: typography.fontFamilies.sans,
                fontWeight: typography.fontWeights.medium,
              },
            ]}
          >
            {displayRole}
          </Text>
          {displayUnit && (
            <Text
              style={[
                styles.unit,
                {
                  color: colors.primary,
                  fontFamily: typography.fontFamilies.sans,
                  fontWeight: typography.fontWeights.medium,
                },
              ]}
            >
              {displayUnit}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 18,
    lineHeight: 22,
  },
  subText: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  role: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  unit: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
});
