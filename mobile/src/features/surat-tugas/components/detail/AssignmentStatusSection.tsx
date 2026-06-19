import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SectionCard } from '@/components/SectionCard';
import { StatusBadge } from '@/components/StatusBadge';
import { AssignmentDetail } from '../../types';
import { DetailRow } from './DetailRow';

interface AssignmentStatusSectionProps {
  assignment: AssignmentDetail;
}

export function AssignmentStatusSection({ assignment }: AssignmentStatusSectionProps) {
  const actions = assignment.allowed_actions;

  return (
    <SectionCard title="Status & Aksi">
      <View style={styles.badgeRow}>
        <StatusBadge text={assignment.status || 'Belum Ada Status'} status="neutral" />
        {actions.can_download ? <StatusBadge text="Bisa Diunduh" status="success" /> : null}
        {actions.can_approve ? <StatusBadge text="Butuh Persetujuan" status="warning" /> : null}
        {actions.can_update ? <StatusBadge text="Bisa Diubah" status="info" /> : null}
      </View>
      <DetailRow label="Lihat Detail" value={actions.can_view ? 'Diizinkan' : 'Tidak diizinkan'} />
      <DetailRow label="Unduh Berkas" value={actions.can_download ? 'Diizinkan' : 'Tidak tersedia'} />
      <DetailRow label="Ubah Data" value={actions.can_update ? 'Diizinkan' : 'Tidak diizinkan'} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
});
