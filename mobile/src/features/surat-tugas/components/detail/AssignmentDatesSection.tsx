import React from 'react';
import { SectionCard } from '@/components/SectionCard';
import { AssignmentDetail } from '../../types';
import { DetailRow } from './DetailRow';

interface AssignmentDatesSectionProps {
  assignment: AssignmentDetail;
}

export function AssignmentDatesSection({ assignment }: AssignmentDatesSectionProps) {
  return (
    <SectionCard title="Tanggal & Tujuan">
      <DetailRow label="Tanggal Surat" value={assignment.tanggal_surat || '-'} />
      <DetailRow label="Tanggal Mulai" value={assignment.tanggal_mulai || '-'} />
      <DetailRow label="Tanggal Selesai" value={assignment.tanggal_selesai || '-'} />
      <DetailRow label="Tujuan" value={assignment.tujuan || '-'} />
    </SectionCard>
  );
}
