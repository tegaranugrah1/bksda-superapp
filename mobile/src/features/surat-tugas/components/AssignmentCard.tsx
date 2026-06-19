import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBadge, StatusBadgeProps } from '@/components/StatusBadge';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AssignmentListItem, AssignmentStatus } from '../types';

interface AssignmentCardProps {
  assignment: AssignmentListItem;
  onPress: () => void;
}

function getStatusBadge(status?: AssignmentStatus | null): StatusBadgeProps {
  switch (status) {
    case 'approved':
      return { text: 'Disetujui', status: 'success' };
    case 'completed':
      return { text: 'Selesai', status: 'success' };
    case 'pending':
      return { text: 'Menunggu', status: 'warning' };
    case 'rejected':
      return { text: 'Ditolak', status: 'danger' };
    case 'draft':
      return { text: 'Draft', status: 'neutral' };
    default:
      return { text: status || 'Belum Ada Status', status: 'neutral' };
  }
}

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) {
    return null;
  }

  if (start && end && start !== end) {
    return `${start} - ${end}`;
  }

  return start || end || null;
}

export default function AssignmentCard({ assignment, onPress }: AssignmentCardProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const numberLabel = assignment.nomor || 'Belum bernomor';
  const activityLabel = assignment.kegiatan || 'Kegiatan belum diisi';
  const dateLabel = formatDateRange(assignment.tanggal_mulai, assignment.tanggal_selesai);
  const statusBadge = getStatusBadge(assignment.status);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`Surat Tugas: ${numberLabel}. ${activityLabel}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <Text
            numberOfLines={1}
            style={[
              styles.number,
              {
                color: colors.mutedForeground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.sm,
                fontWeight: typography.fontWeights.medium,
              },
            ]}
          >
            {numberLabel}
          </Text>
          <Text
            numberOfLines={2}
            style={[
              styles.activity,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.md,
                fontWeight: typography.fontWeights.bold,
              },
            ]}
          >
            {activityLabel}
          </Text>
        </View>
        <StatusBadge text={statusBadge.text} status={statusBadge.status} />
      </View>

      {assignment.tujuan ? (
        <Text
          numberOfLines={2}
          style={[
            styles.metaText,
            {
              color: colors.mutedForeground,
              fontFamily: typography.fontFamilies.sans,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.sm,
            },
          ]}
        >
          {`Tujuan: ${assignment.tujuan}`}
        </Text>
      ) : null}

      {dateLabel ? (
        <Text
          style={[
            styles.metaText,
            {
              color: colors.mutedForeground,
              fontFamily: typography.fontFamilies.sans,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.xs,
            },
          ]}
        >
          {`Tanggal: ${dateLabel}`}
        </Text>
      ) : null}

      {assignment.personel_summary ? (
        <Text
          numberOfLines={2}
          style={[
            styles.personelText,
            {
              color: colors.foreground,
              fontFamily: typography.fontFamilies.sans,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.md,
            },
          ]}
        >
          {`Personel: ${assignment.personel_summary}`}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    minHeight: 96,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    minWidth: 0,
  },
  number: {
    lineHeight: 18,
  },
  activity: {
    lineHeight: 22,
    marginTop: 2,
  },
  metaText: {
    lineHeight: 20,
  },
  personelText: {
    lineHeight: 20,
  },
});
