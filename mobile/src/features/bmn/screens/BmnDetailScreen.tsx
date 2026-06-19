import React from 'react';
import { StyleSheet, View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAssetDetail } from '../useAssetDetail';
import { BmnStackParamList } from '../navigation/BmnNavigator';
import { IconButton } from '@/components/IconButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';

import { AssetSummarySection } from '../components/detail/AssetSummarySection';
import { AssetIdentitySection } from '../components/detail/AssetIdentitySection';
import { AssetLocationSection } from '../components/detail/AssetLocationSection';
import { AssetDocumentSection } from '../components/detail/AssetDocumentSection';
import { AssetFinanceSection } from '../components/detail/AssetFinanceSection';
import { AssetOrganizationSection } from '../components/detail/AssetOrganizationSection';
import { AssetActionBar } from '../components/detail/AssetActionBar';
import { AssetPhotoSlotsSection } from '../components/detail/AssetPhotoSlotsSection';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';

export default function BmnDetailScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<BmnStackParamList, 'BmnDetail'>>();
  const { id } = route.params;

  const { data, isLoading, error, refetch } = useAssetDetail(id);
  const [isDeletingPhoto, setIsDeletingPhoto] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isReturning, setIsReturning] = React.useState(false);

  const handleEdit = () => {
    navigation.navigate('BmnForm', { id });
  };

  const handleUploadPhoto = () => {
    Alert.alert(
      'Pilih Bagian Foto',
      'Silakan pilih bagian foto yang ingin diambil:',
      [
        { text: 'Tampak Depan', onPress: () => handleCapturePhoto('depan') },
        { text: 'Tampak Belakang', onPress: () => handleCapturePhoto('belakang') },
        { text: 'Tampak Kiri', onPress: () => handleCapturePhoto('kiri') },
        { text: 'Tampak Kanan', onPress: () => handleCapturePhoto('kanan') },
        { text: 'Batal', style: 'cancel' },
      ]
    );
  };

  const handleCapturePhoto = (type: 'depan' | 'belakang' | 'kiri' | 'kanan') => {
    navigation.navigate('BmnPhotoCapture' as any, { assetId: id, type });
  };

  const handleDeletePhoto = (type: 'depan' | 'belakang' | 'kiri' | 'kanan') => {
    Alert.alert(
      'Hapus Foto',
      `Apakah Anda yakin ingin menghapus foto ${type} ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingPhoto(type);
            try {
              await apiClient.delete(`/bmn/assets/${id}/photo/${type}`);
              Alert.alert('Sukses', `Foto ${type} berhasil dihapus.`);
              refetch();
            } catch (err: any) {
              const apiErr = normalizeError(err);
              Alert.alert('Error', apiErr.message || 'Gagal menghapus foto.');
            } finally {
              setIsDeletingPhoto(null);
            }
          },
        },
      ]
    );
  };

  const handleVerify = () => {
    Alert.alert(
      'Verifikasi BMN',
      'Lakukan verifikasi BMN untuk aset ini? Tindakan ini akan mencatat tanggal dan nama verifikator.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Verifikasi',
          onPress: async () => {
            setIsVerifying(true);
            try {
              await apiClient.post(`/bmn/assets/${id}/verify`);
              Alert.alert('Sukses', 'Aset berhasil diverifikasi.');
              refetch();
            } catch (err: any) {
              const apiErr = normalizeError(err);
              Alert.alert('Error', apiErr.message || 'Gagal memverifikasi aset.');
            } finally {
              setIsVerifying(false);
            }
          },
        },
      ]
    );
  };

  const handleLoan = () => {
    navigation.navigate('BmnLoan', { assetId: id });
  };

  const handleReturn = () => {
    const loanId = data?.active_loan?.id;
    if (!loanId) {
      Alert.alert('Error', 'Tidak ada peminjaman aktif untuk aset ini.');
      return;
    }

    Alert.alert(
      'Kembalikan Aset',
      'Apakah Anda yakin ingin menandai aset ini sebagai sudah dikembalikan?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Kembalikan',
          onPress: async () => {
            setIsReturning(true);
            try {
              await apiClient.post(`/bmn/loans/${loanId}/return`);
              Alert.alert('Sukses', 'Aset berhasil dikembalikan.');
              refetch();
            } catch (err: any) {
              const apiErr = normalizeError(err);
              Alert.alert('Error', apiErr.message || 'Gagal mengembalikan aset.');
            } finally {
              setIsReturning(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Kembali"
          />
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginLeft: spacing.sm,
              },
            ]}
          >
            Detail Aset
          </Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <LoadingSkeleton variant="detail" count={1} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    const isForbidden = error.kind === 'forbidden';
    const isNotFound = error.kind === 'not_found';

    const title = isForbidden
      ? 'Akses Ditolak'
      : isNotFound
      ? 'Aset Tidak Ditemukan'
      : 'Gagal Memuat Detail Aset';

    const message = isForbidden
      ? 'Anda tidak memiliki akses untuk melihat detail aset ini.'
      : isNotFound
      ? 'Detail aset yang Anda cari tidak ditemukan.'
      : error.message || 'Terjadi kesalahan saat memuat data aset BMN.';

    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Kembali"
          />
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginLeft: spacing.sm,
              },
            ]}
          >
            Detail Aset
          </Text>
        </View>
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
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Kembali"
          />
          <Text
            style={[
              styles.headerTitle,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.lg,
                fontWeight: typography.fontWeights.bold,
                marginLeft: spacing.sm,
              },
            ]}
          >
            Detail Aset
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title="Data Kosong"
            message="Data detail aset tidak ditemukan."
            onRetry={refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <IconButton
          icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Kembali"
        />
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.foreground,
              fontFamily: typography.fontFamilies.sans,
              fontSize: typography.fontSizes.lg,
              fontWeight: typography.fontWeights.bold,
              marginLeft: spacing.sm,
            },
          ]}
        >
          Detail Aset BMN
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginBottom: spacing.md }}>
          <AssetSummarySection asset={data} />
        </View>
        <AssetIdentitySection asset={data} />
        <AssetLocationSection asset={data} />
        <AssetPhotoSlotsSection
          asset={data}
          onCapturePhoto={handleCapturePhoto}
          onDeletePhoto={handleDeletePhoto}
          isDeleting={isDeletingPhoto}
        />
        <AssetDocumentSection asset={data} />
        <AssetFinanceSection asset={data} />
        <AssetOrganizationSection asset={data} />
        <AssetActionBar
          allowedActions={data.allowed_actions}
          onEditPress={handleEdit}
          onUploadPhotoPress={handleUploadPhoto}
          onVerifyPress={handleVerify}
          onLoanPress={handleLoan}
          onReturnPress={handleReturn}
          isVerifying={isVerifying}
          isReturning={isReturning}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  scrollContent: {
    width: '100%',
  },
});
