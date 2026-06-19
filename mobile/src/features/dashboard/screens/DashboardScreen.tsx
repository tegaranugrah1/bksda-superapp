import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useMobileDashboard } from '../useMobileDashboard';
import { usePermissions } from '@/lib/permissions';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { OfflineBanner } from '@/components/OfflineBanner';
import ProfileSummary from '../components/ProfileSummary';
import MetricCard from '../components/MetricCard';
import AlertCard from '../components/AlertCard';
import QuickActions from '../components/QuickActions';

export default function DashboardScreen({ navigation }: any) {
  const { colors, spacing, typography } = useAppTheme();
  const { data, isLoading, error, refetch } = useMobileDashboard();
  const onlineStatus = useOnlineStatus(error);
  const { hasModule, can } = usePermissions();

  const showBmn = hasModule('bmn');
  const showSuratTugas = hasModule('surat_tugas') || hasModule('kepegawaian');
  const showApproval = can('surat_tugas.approve');

  // Navigate callbacks
  const handleViewBmn = () => {
    navigation.navigate('Bmn');
  };

  const handleViewSuratTugas = () => {
    navigation.navigate('SuratTugas');
  };

  const handleScanBarcode = () => {
    Alert.alert('Scan Barcode', 'Fitur scan barcode BMN akan segera hadir.');
  };

  const handleLoanAsset = () => {
    Alert.alert('Pinjam Aset', 'Fitur pengajuan peminjaman aset akan segera hadir.');
  };

  const handleApproveST = () => {
    Alert.alert('Persetujuan Surat Tugas', 'Fitur persetujuan surat tugas akan segera hadir.');
  };

  if (isLoading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <LoadingSkeleton variant="detail" count={1} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg }]}>
        <OfflineBanner visible={onlineStatus.isOffline} />
        <ErrorState
          message={error.message || 'Gagal memuat data dashboard. Silakan coba kembali.'}
          onRetry={refetch}
        />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, padding: spacing.lg }]}>
        <ErrorState
          message="Data dashboard tidak ditemukan."
          onRetry={refetch}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { padding: spacing.lg }]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refetch}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <ProfileSummary profile={data.profile} />

      {/* Metrics Section */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.foreground,
              fontFamily: typography.fontFamilies.sans,
              fontWeight: typography.fontWeights.bold,
              marginBottom: spacing.md,
            },
          ]}
        >
          Informasi Ringkas
        </Text>

        <View style={styles.metricsGrid}>
          {showBmn && (
            <>
              <View style={styles.metricItem}>
                <MetricCard
                  count={data.summary.assigned_assets_count}
                  label="Aset Saya"
                  variant="primary"
                />
              </View>
              <View style={styles.metricItem}>
                <MetricCard
                  count={data.summary.active_loans_count}
                  label="Peminjaman Aktif"
                  variant="info"
                />
              </View>
            </>
          )}

          {showSuratTugas && (
            <>
              <View style={styles.metricItem}>
                <MetricCard
                  count={data.summary.pending_my_letters_count}
                  label="ST Pending Saya"
                  variant="warning"
                />
              </View>
              <View style={styles.metricItem}>
                <MetricCard
                  count={data.summary.active_my_letters_count}
                  label="ST Aktif Saya"
                  variant="success"
                />
              </View>
            </>
          )}

          {showApproval && data.summary.pending_approvals_count > 0 && (
            <View style={styles.metricItemFull}>
              <MetricCard
                count={data.summary.pending_approvals_count}
                label="Persetujuan ST Menunggu"
                variant="warning"
              />
            </View>
          )}
        </View>
      </View>

      <AlertCard vehicles={data.urgent_tax_vehicles} />

      <View style={styles.section}>
        <QuickActions
          canViewBmn={showBmn}
          canLoanBmn={showBmn}
          canViewSuratTugas={showSuratTugas}
          canApproveSuratTugas={showApproval}
          onScanPress={handleScanBarcode}
          onLoanPress={handleLoanAsset}
          onViewBmnPress={handleViewBmn}
          onViewSuratTugasPress={handleViewSuratTugas}
          onApproveSuratTugasPress={handleApproveST}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 20,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    width: '48%',
    flexGrow: 1,
  },
  metricItemFull: {
    width: '100%',
  },
});
