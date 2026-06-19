import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AssignmentDetail } from '../../types';
import { DetailRow } from './DetailRow';

interface AssignmentContentSectionProps {
  assignment: AssignmentDetail;
}

export function AssignmentContentSection({ assignment }: AssignmentContentSectionProps) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <SectionCard title="Isi Surat">
      <DetailRow label="Kegiatan" value={assignment.kegiatan || '-'} />
      <DetailRow label="Dasar Hukum" value={assignment.dasar_hukum || '-'} />
      <Text
        style={[
          styles.longText,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.sm,
            marginTop: spacing.xs,
          },
        ]}
      >
        {assignment.dasar_hukum || 'Dasar hukum belum diisi.'}
      </Text>
      <DetailRow label="Sumber Dana" value={assignment.sumber_dana || '-'} />
      <DetailRow label="Template" value={assignment.template_type || '-'} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  longText: {
    flexShrink: 1,
    lineHeight: 22,
  },
});
