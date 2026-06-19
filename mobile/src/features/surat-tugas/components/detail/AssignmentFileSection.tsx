import React from 'react';
import { SectionCard } from '@/components/SectionCard';
import { AssignmentDetail } from '../../types';
import { DetailRow } from './DetailRow';

interface AssignmentFileSectionProps {
  assignment: AssignmentDetail;
}

export function AssignmentFileSection({ assignment }: AssignmentFileSectionProps) {
  const fileLabel = assignment.file.available ? 'Tersedia' : 'Belum tersedia';

  return (
    <SectionCard title="Berkas">
      <DetailRow label="Status Berkas" value={fileLabel} />
      <DetailRow label="Nama File" value={assignment.file.filename || '-'} />
      <DetailRow label="Tipe File" value={assignment.file.mime_type || '-'} />
      <DetailRow label="Download URL" value={assignment.file.download_url || '-'} />
    </SectionCard>
  );
}
