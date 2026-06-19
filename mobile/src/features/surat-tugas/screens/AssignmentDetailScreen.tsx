import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { downloadAssignmentFile } from '@/lib/files/download';
import { openFile } from '@/lib/files/share';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ApiError } from '@/types/api';
import { updateAssignmentStatus } from '../assignmentActionsApi';
import AssignmentActions, { AssignmentActionType } from '../components/AssignmentActions';
import {
  AssignmentContentSection,
  AssignmentDatesSection,
  AssignmentFileSection,
  AssignmentPersonelSection,
  AssignmentStatusSection,
  AssignmentSummarySection,
} from '../components/detail';
import { SuratTugasStackParamList } from '../navigation/SuratTugasNavigator';
import { useAssignmentDetail } from '../useAssignmentDetail';

export default function AssignmentDetailScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<SuratTugasStackParamList, 'AssignmentDetail'>>();
  const { id, mode = 'personal' } = route.params;
  const { data, isLoading, error, refetch, isForbidden, isNotFound } = useAssignmentDetail(id, mode);
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!data) {
      return;
    }

    setIsDownloading(true);
    try {
      const downloadedFile = await downloadAssignmentFile({
        assignmentId: id,
        mode,
        filename: data.file.filename,
        storage: 'cache',
      });

      await openFile({
        localUri: downloadedFile.localUri,
        mimeType: downloadedFile.mimeType || data.file.mime_type,
        dialogTitle: 'Buka Surat Tugas',
      });
    } catch (downloadError: any) {
      Alert.alert(
        'Gagal Mengunduh',
        downloadError?.message || 'Gagal mengunduh berkas Surat Tugas.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStatusAction = async (status: AssignmentActionType) => {
    try {
      await updateAssignmentStatus(id, { status });
      Alert.alert('Aksi Surat Tugas', 'Status Surat Tugas berhasil diperbarui.');
      refetch();
    } catch (actionError) {
      const apiError = actionError as ApiError;
      const message =
        apiError.kind === 'validation'
          ? apiError.message || 'Status Surat Tugas tidak valid untuk kondisi saat ini.'
          : apiError.message || 'Gagal memperbarui status Surat Tugas.';

      Alert.alert('Gagal Memproses Aksi', message);
    }
  };

  const renderHeader = (title = 'Detail Surat Tugas') => (
    <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
      <IconButton
        icon={<Text style={{ color: colors.foreground, fontSize: 20 }}>{'<'}</Text>}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Kembali"
      />
      <Text
        style={[
          styles.headerTitle,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.lg,
            fontWeight: typography.fontWeights.bold,
            marginLeft: spacing.sm,
          },
        ]}
      >
        {title}
      </Text>
    </View>
  );

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <LoadingSkeleton variant="detail" count={1} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const title = isForbidden
      ? 'Akses Ditolak'
      : isNotFound
      ? 'Surat Tugas Tidak Ditemukan'
      : 'Gagal Memuat Surat Tugas';
    const message = isForbidden
      ? 'Anda tidak memiliki akses untuk melihat detail Surat Tugas ini.'
      : isNotFound
      ? 'Surat Tugas yang Anda cari tidak ditemukan.'
      : error.message || 'Terjadi kesalahan saat memuat detail Surat Tugas.';

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title={title}
            message={message}
            onRetry={!isForbidden && !isNotFound ? refetch : undefined}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title="Data Kosong"
            message="Data detail Surat Tugas tidak tersedia."
            onRetry={refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canDownload = data.file.available && data.allowed_actions.can_download;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.md }}>
          <AssignmentSummarySection assignment={data} />
        </View>
        <AssignmentDatesSection assignment={data} />
        <AssignmentPersonelSection assignment={data} />
        <AssignmentContentSection assignment={data} />
        <AssignmentFileSection assignment={data} />
        <AssignmentStatusSection assignment={data} />
        <AssignmentActions
          allowedActions={data.allowed_actions}
          currentStatus={data.status}
          onAction={handleStatusAction}
        />

        {canDownload ? (
          <View style={{ marginTop: spacing.sm }}>
            <AppButton
              title={isDownloading ? 'Mengunduh...' : 'Unduh Berkas'}
              onPress={handleDownload}
              loading={isDownloading}
              accessibilityLabel="Unduh berkas Surat Tugas"
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  headerTitle: {
    flexShrink: 1,
    lineHeight: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
  },
});
