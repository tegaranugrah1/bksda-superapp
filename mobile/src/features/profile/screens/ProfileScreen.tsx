import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function ProfileScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const { user, employee, logout, isLoading } = useAuth();

  const displayName = employee?.name || user?.name || 'Pengguna';
  const displaySub = employee?.nip ? `NIP. ${employee.nip}` : user?.username ? `@${user.username}` : '-';
  const role = formatLabel(user?.role);
  const accessModules = user?.access_modules?.length ? user.access_modules : ['Tidak ada modul akses'];
  const employeeRows: [string, string | null | undefined][] = [
    ['Nama pegawai', employee?.name],
    ['NIP', employee?.nip],
    ['Jabatan', employee?.position],
    ['Unit kerja', employee?.department],
    ['Pangkat/Golongan', employee?.rank],
    ['Email pegawai', employee?.email],
    ['Telepon', employee?.phone],
  ];
  const confirmLogout = () => {
    Alert.alert('Logout', 'Keluar dari aplikasi di perangkat ini?', [
      {
        text: 'Batal',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.lg, gap: spacing.lg }]}
    >
      <View
        style={[
          styles.hero,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.lg,
          },
        ]}
        accessibilityLabel="Informasi identitas pengguna"
      >
        <View
          style={[
            styles.avatar,
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
                fontWeight: typography.fontWeights.bold,
              },
            ]}
          >
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.heroText}>
          <Text
            style={[
              styles.name,
              {
                color: colors.foreground,
                fontWeight: typography.fontWeights.bold,
              },
            ]}
          >
            {displayName}
          </Text>
          <Text style={[styles.mutedText, { color: colors.mutedForeground }]}>{displaySub}</Text>
          <Text style={[styles.roleText, { color: colors.primary, fontWeight: typography.fontWeights.semibold }]}>
            {role}
          </Text>
        </View>
      </View>

      <Section title="Akun" colors={colors} spacing={spacing} radius={radius} typography={typography}>
        <InfoRow label="Nama akun" value={user?.name} colors={colors} typography={typography} />
        <InfoRow label="Username" value={user?.username} colors={colors} typography={typography} />
        <InfoRow label="Email akun" value={user?.email} colors={colors} typography={typography} />
        <InfoRow label="Role" value={role} colors={colors} typography={typography} />
      </Section>

      <Section title="Data Pegawai" colors={colors} spacing={spacing} radius={radius} typography={typography}>
        {employee ? (
          employeeRows.map(([label, value]) => (
            <InfoRow key={label} label={label} value={value} colors={colors} typography={typography} />
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Belum terhubung dengan data pegawai.</Text>
        )}
      </Section>

      <Section title="Modul Akses" colors={colors} spacing={spacing} radius={radius} typography={typography}>
        <View style={styles.moduleGrid}>
          {accessModules.map((module) => (
            <View
              key={module}
              style={[
                styles.moduleBadge,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                  borderRadius: radius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                },
              ]}
            >
              <Text style={[styles.moduleText, { color: colors.foreground, fontWeight: typography.fontWeights.medium }]}>
                {formatLabel(module)}
              </Text>
            </View>
          ))}
        </View>
      </Section>

      <View
        style={[
          styles.logoutPanel,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.lg,
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground, fontWeight: typography.fontWeights.semibold }]}>
          Sesi Aplikasi
        </Text>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Keluar dari perangkat ini untuk mengakhiri akses aplikasi mobile.
        </Text>
        <AppButton
          title="Logout"
          onPress={confirmLogout}
          variant="danger"
          loading={isLoading}
          accessibilityLabel="Logout"
        />
      </View>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  colors,
  spacing,
  radius,
  typography,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useAppTheme>['colors'];
  spacing: ReturnType<typeof useAppTheme>['spacing'];
  radius: ReturnType<typeof useAppTheme>['radius'];
  typography: ReturnType<typeof useAppTheme>['typography'];
}) {
  return (
    <View
      style={[
        styles.section,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.md,
        },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.foreground, fontWeight: typography.fontWeights.semibold }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
  typography,
}: {
  label: string;
  value?: string | null;
  colors: ReturnType<typeof useAppTheme>['colors'];
  typography: ReturnType<typeof useAppTheme>['typography'];
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground, fontWeight: typography.fontWeights.medium }]}>
        {value || '-'}
      </Text>
    </View>
  );
}

function formatLabel(value?: string | null) {
  if (!value) return '-';
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  hero: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
  },
  heroText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
  },
  mutedText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  roleText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  section: {
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  infoRow: {
    minHeight: 48,
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleBadge: {
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  moduleText: {
    fontSize: 14,
    lineHeight: 18,
  },
  logoutPanel: {
    borderWidth: 1,
    gap: 12,
  },
});
