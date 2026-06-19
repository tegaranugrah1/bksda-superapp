import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SectionCard } from '@/components/SectionCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AssignmentAllowedActions, AssignmentStatus } from '../types';

export type AssignmentActionType = Extract<AssignmentStatus, 'pending' | 'approved' | 'rejected' | 'completed'>;

type ActionConfig = {
  status: AssignmentActionType;
  title: string;
  message: string;
  buttonTitle: string;
  confirmText: string;
  variant: 'primary' | 'secondary' | 'danger';
  destructive?: boolean;
};

export type AssignmentActionsProps = {
  allowedActions: AssignmentAllowedActions;
  currentStatus?: AssignmentStatus | null;
  onAction: (status: AssignmentActionType) => void;
  disabled?: boolean;
};

const actionConfigs: ActionConfig[] = [
  {
    status: 'pending',
    title: 'Ajukan Surat Tugas',
    message: 'Ajukan Surat Tugas ini untuk proses persetujuan?',
    buttonTitle: 'Ajukan',
    confirmText: 'Ya, Ajukan',
    variant: 'secondary',
  },
  {
    status: 'approved',
    title: 'Setujui Surat Tugas',
    message: 'Setujui Surat Tugas ini dan lanjutkan proses penerbitan?',
    buttonTitle: 'Setujui',
    confirmText: 'Ya, Setujui',
    variant: 'primary',
  },
  {
    status: 'rejected',
    title: 'Tolak Surat Tugas',
    message: 'Tolak Surat Tugas ini? Tindakan ini perlu alasan pada proses berikutnya.',
    buttonTitle: 'Tolak',
    confirmText: 'Ya, Tolak',
    variant: 'danger',
    destructive: true,
  },
  {
    status: 'completed',
    title: 'Selesaikan Surat Tugas',
    message: 'Tandai Surat Tugas ini sebagai selesai?',
    buttonTitle: 'Selesai',
    confirmText: 'Ya, Selesai',
    variant: 'secondary',
  },
];

function getVisibleActions(allowedActions: AssignmentAllowedActions, currentStatus?: AssignmentStatus | null) {
  return actionConfigs.filter((config) => {
    if (config.status === currentStatus) {
      return false;
    }

    if (config.status === 'pending') {
      return allowedActions.can_update;
    }

    if (config.status === 'approved') {
      return allowedActions.can_approve;
    }

    if (config.status === 'rejected') {
      return allowedActions.can_reject;
    }

    if (config.status === 'completed') {
      return allowedActions.can_complete;
    }

    return false;
  });
}

export default function AssignmentActions({
  allowedActions,
  currentStatus,
  onAction,
  disabled = false,
}: AssignmentActionsProps) {
  const { colors, spacing, typography } = useAppTheme();
  const visibleActions = getVisibleActions(allowedActions, currentStatus);
  const [pendingAction, setPendingAction] = React.useState<ActionConfig | null>(null);

  const confirmAction = () => {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    setPendingAction(null);
    onAction(action.status);
  };

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <SectionCard title="Aksi Surat Tugas">
      <Text
        style={[
          styles.helper,
          {
            color: colors.mutedForeground,
            fontSize: typography.fontSizes.sm,
            marginBottom: spacing.md,
          },
        ]}
      >
        Setiap perubahan status memerlukan konfirmasi.
      </Text>
      <View style={[styles.actionRow, { gap: spacing.sm }]}>
        {visibleActions.map((action) => (
          <View key={action.status} style={styles.actionButton}>
            <AppButton
              title={action.buttonTitle}
              variant={action.variant}
              disabled={disabled}
              onPress={() => setPendingAction(action)}
              accessibilityLabel={`${action.buttonTitle} Surat Tugas`}
            />
          </View>
        ))}
      </View>
      <ConfirmDialog
        visible={!!pendingAction}
        title={pendingAction?.title || ''}
        message={pendingAction?.message || ''}
        confirmText={pendingAction?.confirmText}
        isDestructive={pendingAction?.destructive}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmAction}
      />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  helper: {
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
  },
});
