import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, Alert } from 'react-native';
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

export default function BmnDetailScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BmnStackParamList, 'BmnDetail'>>();
  const { id } = route.params;

  const { data, isLoading, error, refetch } = useAssetDetail(id);

  const handleEdit = () => {
    Alert.alert('Ubah Data', 'Fitur ubah data aset akan segera hadir.');
  };

  const handleUploadPhoto = () => {
    Alert.alert('Ambil Foto', 'Fitur ambil foto aset akan segera hadir.');
  };

  const handleVerify = () => {
    Alert.alert('Verifikasi Aset', 'Fitur verifikasi aset akan segera hadir.');
  };

  const handleLoan = () => {
    Alert.alert('Pinjam Aset', 'Fitur peminjaman aset akan segera hadir.');
  };

  const handleReturn = () => {
    Alert.alert('Kembalikan Aset', 'Fitur pengembalian aset akan segera hadir.');
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
