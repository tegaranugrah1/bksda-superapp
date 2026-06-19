import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AssignmentDetail, AssignmentPersonel } from '../../types';

interface AssignmentPersonelSectionProps {
  assignment: AssignmentDetail;
}

function PersonelItem({ personel }: { personel: AssignmentPersonel }) {
  const { colors, spacing, typography } = useAppTheme();
  const meta = [personel.nip, personel.jabatan, personel.unit_kerja].filter(Boolean).join(' / ');

  return (
    <View style={[styles.personelItem, { borderColor: colors.border, paddingVertical: spacing.sm }]}>
      <Text
        style={[
          styles.personelName,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.semibold,
          },
        ]}
      >
        {personel.name}
      </Text>
      {meta ? (
        <Text
          style={[
            styles.personelMeta,
            {
              color: colors.mutedForeground,
              fontSize: typography.fontSizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {meta}
        </Text>
      ) : null}
      {personel.peran ? (
        <Text
          style={[
            styles.personelRole,
            {
              color: colors.foreground,
              fontSize: typography.fontSizes.xs,
              marginTop: spacing.xs,
            },
          ]}
        >
          {`Peran: ${personel.peran}`}
        </Text>
      ) : null}
    </View>
  );
}

export function AssignmentPersonelSection({ assignment }: AssignmentPersonelSectionProps) {
  const { colors, typography } = useAppTheme();

  return (
    <SectionCard title="Personel">
      {assignment.personel.length > 0 ? (
        assignment.personel.map((personel) => <PersonelItem key={String(personel.id)} personel={personel} />)
      ) : (
        <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.sm }}>
          Belum ada personel.
        </Text>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  personelItem: {
    borderBottomWidth: 1,
  },
  personelName: {
    lineHeight: 20,
  },
  personelMeta: {
    lineHeight: 16,
  },
  personelRole: {
    lineHeight: 16,
  },
});
