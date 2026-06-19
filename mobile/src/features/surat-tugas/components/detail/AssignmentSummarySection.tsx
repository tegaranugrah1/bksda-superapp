import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBadge, StatusBadgeProps } from '@/components/StatusBadge';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AssignmentDetail, AssignmentStatus } from '../../types';

interface AssignmentSummarySectionProps {
  assignment: AssignmentDetail;
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

export function AssignmentSummarySection({ assignment }: AssignmentSummarySectionProps) {
  const { colors, spacing, typography, radius } = useAppTheme();
  const statusBadge = getStatusBadge(assignment.status);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.lg,
        },
      ]}
    >
      <Text
        style={[
          styles.number,
          {
            color: colors.mutedForeground,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.medium,
          },
        ]}
      >
        {assignment.nomor || 'Belum bernomor'}
      </Text>
      <Text
        style={[
          styles.title,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginTop: spacing.xs,
          },
        ]}
      >
        {assignment.kegiatan || 'Kegiatan belum diisi'}
      </Text>
      <View style={[styles.badgeRow, { marginTop: spacing.md }]}>
        <StatusBadge text={statusBadge.text} status={statusBadge.status} />
        {assignment.kode_surat ? <StatusBadge text={assignment.kode_surat} status="info" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    width: '100%',
  },
  number: {
    lineHeight: 20,
  },
  title: {
    lineHeight: 24,
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
