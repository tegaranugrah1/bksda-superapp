import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Linking,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '../../../theme/ThemeContext';
import { GlassCard } from '../../../components/ui/GlassCard';
import { EmeraldButton } from '../../../components/ui/EmeraldButton';
import { useAssetDetail } from '../useAssetDetail';
import { apiClient } from '../../../lib/api/client';
import { normalizeError } from '../../../lib/api/errors';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { NotificationModal } from '../../../components/ui/NotificationModal';

import { config } from '../../../lib/api/config';
import { getToken } from '../../../lib/auth/tokenStorage';

function driveToThumbnail(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
}

function resolvePhotoUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes('drive.google.com')) {
    const thumb = driveToThumbnail(url);
    if (thumb) return thumb;
  }
  const serverHost = config.apiUrl.replace('/api', '');

  let cleanUrl = url;
  if (/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = cleanUrl.replace(/^https?:\/\/[^\/]+/i, '');
  }
  if (cleanUrl.startsWith('/bksda/')) {
    cleanUrl = cleanUrl.replace('/bksda/', '/');
  } else if (cleanUrl.startsWith('bksda/')) {
    cleanUrl = cleanUrl.replace('bksda/', '');
  }

  const cleanPath = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`;
  return `${serverHost}${cleanPath}`;
}

export default function BmnDetailScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;

  const { data, isLoading, error, refetch } = useAssetDetail(id);

  // Automatically refetch fresh asset detail whenever screen gains focus (e.g. returning from edit screen)
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const [activeTab, setActiveTab] = useState<'identitas' | 'finansial' | 'foto' | 'lokasi' | 'riwayat'>('identitas');
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Multi-page & Multi-photo Lightbox modal state
  const [lightboxState, setLightboxState] = useState<{
    images: string[];
    labels?: string[];
    index: number;
    title: string;
  } | null>(null);

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    visible: boolean;
    type: string;
    label: string;
  }>({
    visible: false,
    type: '',
    label: '',
  });

  const [notificationState, setNotificationState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: 'success' | 'danger' | 'warning' | 'info';
    iconName?: any;
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'success',
  });

  const [sourcePickerState, setSourcePickerState] = useState<{
    visible: boolean;
    type: string;
    label: string;
    isGeotag?: boolean;
    currentUrl?: string;
  }>({
    visible: false,
    type: '',
    label: '',
  });

  const [geotagLinkModalState, setGeotagLinkModalState] = useState<{
    visible: boolean;
    url: string;
  }>({
    visible: false,
    url: '',
  });
  const [isSubmittingGeotagLink, setIsSubmittingGeotagLink] = useState(false);

  const handleSubmitGeotagLink = async () => {
    if (!geotagLinkModalState.url.trim() || isSubmittingGeotagLink) return;
    setIsSubmittingGeotagLink(true);
    try {
      await apiClient.post(`/bmn/assets/${id}/geotag`, {
        url: geotagLinkModalState.url.trim(),
      });
      setGeotagLinkModalState({ visible: false, url: '' });
      refetch();
      setNotificationState({
        visible: true,
        title: 'Link Geotag Disimpan',
        message: 'Tautan Google Drive / Foto Geotag berhasil diperbarui.',
        variant: 'success',
        iconName: 'checkmark-circle-outline',
      });
    } catch (err: any) {
      const apiErr = normalizeError(err);
      setNotificationState({
        visible: true,
        title: 'Gagal Menyimpan Link',
        message: apiErr.message || 'Terjadi kesalahan saat menyimpan link geotag.',
        variant: 'danger',
        iconName: 'alert-circle-outline',
      });
    } finally {
      setIsSubmittingGeotagLink(false);
    }
  };

  const [isUploadingDoc, setIsUploadingDoc] = useState<string | null>(null);

  const handleUploadPdfDocument = async (docType: 'stnk' | 'bpkb') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setIsUploadingDoc(docType);

        const formData = new FormData();
        formData.append('document', {
          uri: file.uri,
          name: file.name || `${docType}_document.pdf`,
          type: file.mimeType || 'application/pdf',
        } as any);
        formData.append('type', docType === 'stnk' ? 'stnk_1' : 'bpkb_1');

        await apiClient.post(`/bmn/assets/${id}/document`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        refetch();
        setNotificationState({
          visible: true,
          title: 'Dokumen Berhasil Diunggah',
          message: `Dokumen ${docType.toUpperCase()} (${file.name}) berhasil disimpan.`,
          variant: 'success',
          iconName: 'checkmark-circle-outline',
        });
      }
    } catch (err: any) {
      const apiErr = normalizeError(err);
      setNotificationState({
        visible: true,
        title: 'Gagal Upload Dokumen',
        message: apiErr.message || 'Terjadi kesalahan saat mengunggah berkas PDF.',
        variant: 'danger',
        iconName: 'alert-circle-outline',
      });
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const handlePrevPage = () => {
    if (!lightboxState) return;
    setLightboxState((prev) =>
      prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null
    );
  };

  const handleNextPage = () => {
    if (!lightboxState) return;
    setLightboxState((prev) =>
      prev ? { ...prev, index: Math.min(prev.images.length - 1, prev.index + 1) } : null
    );
  };

  const handleViewStnk = () => {
    const pages = data?.stnk_document?.preview_urls?.length
      ? data.stnk_document.preview_urls
      : data?.stnk_document?.preview_url
      ? [data.stnk_document.preview_url]
      : data?.foto_stnk_1_url
      ? [data.foto_stnk_1_url]
      : [];
    const resolvedImages = pages.map((u) => resolvePhotoUrl(u)).filter(Boolean) as string[];
    if (resolvedImages.length > 0) {
      setLightboxState({
        images: resolvedImages,
        index: 0,
        title: 'Dokumen STNK',
      });
    }
  };

  const handleViewBpkb = () => {
    const pages = data?.bpkb_document?.preview_urls?.length
      ? data.bpkb_document.preview_urls
      : data?.bpkb_document?.preview_url
      ? [data.bpkb_document.preview_url]
      : data?.foto_bpkb_1_url
      ? [data.foto_bpkb_1_url]
      : [];
    const resolvedImages = pages.map((u) => resolvePhotoUrl(u)).filter(Boolean) as string[];
    if (resolvedImages.length > 0) {
      setLightboxState({
        images: resolvedImages,
        index: 0,
        title: 'Dokumen BPKB',
      });
    }
  };

  const handleViewPhysicalPhoto = (clickedKey: string, photoSlots: { key: string, label: string, url: string | null }[]) => {
    const activeSlots = photoSlots
      .filter((s) => !!s.url)
      .map((s) => ({ url: s.url!, label: s.label, key: s.key }));
    const resolvedImages = activeSlots.map((s) => s.url);
    const labels = activeSlots.map((s) => s.label);
    const initialIndex = activeSlots.findIndex((s) => s.key === clickedKey);
    if (resolvedImages.length > 0) {
      const safeIndex = initialIndex >= 0 ? initialIndex : 0;
      setLightboxState({
        images: resolvedImages,
        labels,
        index: safeIndex,
        title: labels[safeIndex] || 'Foto Fisik BMN',
      });
    }
  };

  React.useEffect(() => {
    getToken().then((token) => setAuthToken(token));
  }, []);

  const formatCurrency = (val?: number | string | null) => {
    if (!val) return '-';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    navigation.navigate('Bmn');
  };

  const handleEdit = () => {
    navigation.navigate('BmnForm', { id });
  };

  const handleUploadPhoto = () => {
    Alert.alert('Pilih Bagian Foto', 'Silakan pilih bagian foto yang ingin diambil:', [
      { text: 'Tampak Depan', onPress: () => handleCapturePhoto('depan') },
      { text: 'Tampak Belakang', onPress: () => handleCapturePhoto('belakang') },
      { text: 'Tampak Kiri', onPress: () => handleCapturePhoto('kiri') },
      { text: 'Tampak Kanan', onPress: () => handleCapturePhoto('kanan') },
      { text: 'Batal', style: 'cancel' },
    ]);
  };

  const handleCapturePhoto = (type: 'depan' | 'belakang' | 'kiri' | 'kanan') => {
    navigation.navigate('BmnPhotoCapture', { assetId: id, type });
  };

  const handleDeletePhoto = (type: string) => {
    const labelMap: Record<string, string> = {
      depan: 'Tampak Depan',
      belakang: 'Tampak Belakang',
      kiri: 'Tampak Kiri',
      kanan: 'Tampak Kanan',
    };
    setDeleteConfirmState({
      visible: true,
      type,
      label: labelMap[type] || type,
    });
  };

  const executeDeletePhoto = async (type: string) => {
    setIsDeletingPhoto(type);
    try {
      await apiClient.delete(`/bmn/assets/${id}/photo/${type}`);
      refetch();
      setNotificationState({
        visible: true,
        title: 'Foto Dihapus',
        message: `Foto ${deleteConfirmState.label || type} berhasil dihapus.`,
        variant: 'success',
        iconName: 'checkmark-circle-outline',
      });
    } catch (err: any) {
      const apiErr = normalizeError(err);
      setNotificationState({
        visible: true,
        title: 'Gagal Menghapus',
        message: apiErr.message || 'Gagal menghapus foto fisik.',
        variant: 'danger',
        iconName: 'alert-circle-outline',
      });
    } finally {
      setIsDeletingPhoto(null);
    }
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
              Alert.alert('Sukses', 'Aset BMN berhasil diverifikasi.');
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

    Alert.alert('Kembalikan Aset', 'Apakah Anda yakin ingin menandai aset ini sebagai sudah dikembalikan?', [
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
    ]);
  };

  if (isLoading && !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={[styles.headerTitleText, { color: colors.textDark }]}>Detail Aset BMN</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Memuat detail aset BMN...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textDark} />
          </TouchableOpacity>
          <Text style={[styles.headerTitleText, { color: colors.textDark }]}>Detail Aset BMN</Text>
        </View>
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <Text style={[styles.errorTitle, { color: colors.textDark }]}>Gagal Memuat Detail Aset</Text>
          <Text style={[styles.errorSub, { color: colors.textMuted }]}>
            {error?.message || 'Aset BMN tidak ditemukan atau terjadi masalah koneksi.'}
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const asset = data;
  const isBaik = asset.kondisi === 'Baik';
  const isRusakRingan = asset.kondisi === 'Rusak Ringan';
  const kondisiBg = isBaik ? '#ecfdf5' : isRusakRingan ? '#fffbe8' : '#fef2f2';
  const kondisiColor = isBaik ? '#059669' : isRusakRingan ? '#d97706' : '#dc2626';

  const isVehicle =
    (asset.jenis_bmn || '').toUpperCase().includes('ANGKUTAN') ||
    (asset.jenis_bmn || '').toUpperCase().includes('KENDARAAN');

  const showPlatBadge = isVehicle && !!asset.no_polisi && asset.no_polisi !== '-' && asset.no_polisi !== 'null';

  const isVerified = !!asset.verified_at;

  const photoSlots = [
    { key: 'geotag', label: 'Foto Geotag', url: resolvePhotoUrl(asset.foto_geotag_path || asset.foto_geotag_url || asset.foto_lokasi_url) },
    { key: 'depan', label: 'Tampak Depan', url: resolvePhotoUrl(asset.foto_depan_url) },
    { key: 'belakang', label: 'Tampak Belakang', url: resolvePhotoUrl(asset.foto_belakang_url) },
    { key: 'kiri', label: 'Tampak Kiri', url: resolvePhotoUrl(asset.foto_kiri_url) },
    { key: 'kanan', label: 'Tampak Kanan', url: resolvePhotoUrl(asset.foto_kanan_url) },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#0f172a" : "#f8fafc" }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitleText, { color: colors.textDark }]}>Detail Aset BMN</Text>
          <Text style={styles.headerSubText}>
            <Text style={{ fontWeight: '800', color: '#059669' }}>{asset.kode_barang}</Text>
            <Text style={{ color: '#94a3b8' }}> • </Text>
            <Text style={{ fontWeight: '800', color: '#6366f1' }}>{asset.nup}</Text>
            <Text style={{ color: '#94a3b8' }}> • </Text>
            <Text style={{ fontWeight: '800', color: kondisiColor }}>{asset.kondisi || 'Baik'}</Text>
            <Text style={{ color: '#94a3b8' }}> • </Text>
            <Text style={{ fontWeight: '800', color: '#059669' }}>{asset.status_bmn || 'Aktif'}</Text>
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshIconBtn}>
          <Ionicons name="refresh-outline" size={20} color="#059669" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#059669']} />}
      >
        {/* Glass Hero Card */}
        <GlassCard style={[styles.heroCard, { backgroundColor: colors.cardBg }]} highlighted>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBg}>
              <Ionicons name={isVehicle ? 'car-sport' : 'cube'} size={28} color="#059669" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.heroTitle, { color: colors.textDark }]}>
                {asset.nama_barang || asset.nama || 'Aset BMN'}
              </Text>
              <Text style={styles.heroMerk}>
                Merk/Tipe: {asset.merk_tipe || asset.merk || asset.tipe || '-'}
              </Text>
            </View>
          </View>

          {/* Badges Flow (Lega / Roomy) */}
          <View style={styles.heroBadgeRow}>
            <View style={[styles.pillBadge, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.pillBadgeText, { color: '#334155' }]}>
                📅 {asset.tahun_perolehan || (asset.tanggal_perolehan ? new Date(asset.tanggal_perolehan).getFullYear() : '2023')}
              </Text>
            </View>

            {showPlatBadge && (
              <View style={[styles.pillBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1 }]}>
                <Text style={[styles.pillBadgeText, { color: '#059669', fontWeight: '800' }]}>
                  🚘 {asset.no_polisi}
                </Text>
              </View>
            )}

            {isVerified ? (
              <View style={[styles.pillBadge, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="shield-checkmark" size={12} color="#059669" style={{ marginRight: 4 }} />
                <Text style={[styles.pillBadgeText, { color: '#059669' }]}>Terverifikasi BMN</Text>
              </View>
            ) : (
              <View style={[styles.pillBadge, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="shield-outline" size={12} color="#64748b" style={{ marginRight: 4 }} />
                <Text style={[styles.pillBadgeText, { color: '#64748b' }]}>Belum Verifikasi</Text>
              </View>
            )}

            {asset.active_loan ? (
              <View style={[styles.pillBadge, { backgroundColor: '#eff6ff' }]}>
                <Text style={[styles.pillBadgeText, { color: '#2563eb' }]}>
                  Dipinjam ({asset.active_loan.borrower_name || 'Pegawai'})
                </Text>
              </View>
            ) : (
              <View style={[styles.pillBadge, { backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.pillBadgeText, { color: '#16a34a' }]}>Tersedia</Text>
              </View>
            )}
          </View>

          {/* Consolidated Pengguna & Lokasi Card (Menggunakan Icon Tanpa Label Teks) */}
          <View style={[styles.nilaiConsolidatedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc', marginBottom: 12 }]}>
            <View style={styles.nilaiRowItem}>
              <Ionicons name="person-circle-outline" size={20} color="#059669" style={{ marginRight: 6 }} />
              <Text style={[styles.quickStatValueLarge, { color: colors.textDark, fontSize: 13, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                {asset.nama_pengguna || asset.pengguna || asset.penanggung_jawab?.nama_lengkap || (asset.penanggung_jawab as any)?.nama || '-'}
              </Text>
            </View>
            <View style={styles.nilaiRowDivider} />
            <View style={styles.nilaiRowItem}>
              <Ionicons name="location-outline" size={20} color="#0284c7" style={{ marginRight: 6 }} />
              <Text style={[styles.quickStatValueLarge, { color: colors.textDark, fontSize: 13, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
                {asset.lokasi_ruang || '-'}
              </Text>
            </View>
          </View>

          {/* Consolidated Nilai Card (1 Kolom 3 Baris: Perolehan, Penyusutan, Buku) */}
          <View style={[styles.nilaiConsolidatedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
            <View style={styles.nilaiRowItem}>
              <Text style={styles.quickStatLabel}>Nilai Perolehan</Text>
              <Text style={[styles.quickStatValueLarge, { color: '#059669' }]}>
                {formatCurrency(asset.nilai_perolehan || asset.nilai_perolehan_pertama)}
              </Text>
            </View>
            <View style={styles.nilaiRowDivider} />
            <View style={styles.nilaiRowItem}>
              <Text style={styles.quickStatLabel}>Nilai Penyusutan</Text>
              <Text style={[styles.quickStatValueLarge, { color: '#d97706' }]}>
                {formatCurrency(asset.nilai_penyusutan)}
              </Text>
            </View>
            <View style={styles.nilaiRowDivider} />
            <View style={styles.nilaiRowItem}>
              <Text style={styles.quickStatLabel}>Nilai Buku</Text>
              <Text style={[styles.quickStatValueLarge, { color: colors.textDark }]}>
                {formatCurrency(asset.nilai_buku)}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Verifikasi BMN Action Banner */}
        {!isVerified && (
          <View style={styles.verifyBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyBannerTitle}>Aset Belum Diverifikasi</Text>
              <Text style={styles.verifyBannerSub}>Verifikasi BMN mencatat tanggal & penanggung jawab verifikasi.</Text>
            </View>
            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={isVerifying}>
              {isVerifying ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.verifyBtnText}>Verifikasi Now</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Horizontal Segmented Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScrollRow}>
          {[
            { key: 'identitas', label: 'Identitas', icon: 'document-text-outline' },
            { key: 'finansial', label: 'Finansial', icon: 'card-outline' },
            { key: 'foto', label: 'Foto & Dokumen', icon: 'camera-outline' },
            { key: 'lokasi', label: 'Lokasi & Pengguna', icon: 'location-outline' },
            { key: 'riwayat', label: 'Riwayat', icon: 'time-outline' },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => setActiveTab(tab.key as any)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? '#ffffff' : colors.textMuted}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Tab 1: Identitas */}
        {activeTab === 'identitas' && (
          <View style={{ gap: 14 }}>
            <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
              <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Identitas Barang</Text>

              <DetailFieldRow label="Kode Barang" value={asset.kode_barang} colors={colors} highlight />
              <DetailFieldRow label="NUP / NUP Lama" value={`${asset.nup} / ${asset.nup_lama || '-'}`} colors={colors} />
              <DetailFieldRow label="Jenis BMN" value={asset.jenis_bmn} colors={colors} />
              <DetailFieldRow label="Nama Barang" value={asset.nama_barang || asset.nama} colors={colors} />
              <DetailFieldRow label="Merk / Tipe" value={asset.merk_tipe || `${asset.merk || '-'} ${asset.tipe || ''}`} colors={colors} />
              <DetailFieldRow label="Kondisi Aset" value={asset.kondisi} colors={colors} />
              <DetailFieldRow label="Status BMN" value={asset.status_bmn || 'Aktif'} colors={colors} />
              <DetailFieldRow label="Intra / Extra" value={asset.intra_extra || 'Intrakomptabel'} colors={colors} />
            </GlassCard>

            {isVehicle && (
              <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Dokumen Kendaraan</Text>

                <DetailFieldRow label="No Polisi (Plat)" value={asset.no_polisi} colors={colors} highlight />
                <DetailFieldRow label="No BPKB" value={asset.no_bpkp} colors={colors} />
                <DetailFieldRow label="No STNK" value={asset.no_stnk} colors={colors} />
                <DetailFieldRow label="No Mesin" value={asset.no_mesin} colors={colors} />
                <DetailFieldRow label="No Rangka" value={asset.no_rangka} colors={colors} />
                <DetailFieldRow label="Tanggal Pajak STNK" value={asset.tanggal_pajak_stnk} colors={colors} />
                <DetailFieldRow label="Tanggal Ganti Plat" value={asset.tanggal_ganti_plat} colors={colors} />
              </GlassCard>
            )}
          </View>
        )}

        {/* Tab 2: Finansial */}
        {activeTab === 'finansial' && (
          <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Nilai & Finansial BMN</Text>

            <DetailFieldRow label="Nilai Perolehan Pertama" value={formatCurrency(asset.nilai_perolehan_pertama)} colors={colors} />
            <DetailFieldRow label="Nilai Mutasi" value={formatCurrency(asset.nilai_mutasi)} colors={colors} />
            <DetailFieldRow label="Nilai Perolehan Saat Ini" value={formatCurrency(asset.nilai_perolehan)} colors={colors} highlight />
            <DetailFieldRow label="Nilai Penyusutan" value={formatCurrency(asset.nilai_penyusutan)} colors={colors} />
            <DetailFieldRow label="Nilai Buku Saat Ini" value={formatCurrency(asset.nilai_buku)} colors={colors} highlight />
            <DetailFieldRow label="Tanggal Perolehan" value={asset.tanggal_perolehan} colors={colors} />
            <DetailFieldRow label="Tanggal Buku Pertama" value={asset.tanggal_buku_pertama} colors={colors} />
          </GlassCard>
        )}

        {/* Tab 3: Foto & Dokumen */}
        {activeTab === 'foto' && (
          <View style={{ gap: 14 }}>
            {/* Section Dokumen STNK & BPKB Kendaraan (Khusus Kendaraan) */}
            {isVehicle && (
              <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
                <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Dokumen STNK & BPKB Kendaraan (PDF / Scan)</Text>

                <View style={styles.docBoxRow}>
                  {/* STNK Card */}
                  <View style={[styles.docCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="document-text-outline" size={20} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={styles.docCardTitle}>Dokumen STNK</Text>
                    </View>
                    <Text style={styles.docStatusText} numberOfLines={1}>
                      {asset.stnk_document?.original_name
                        ? `📄 ${asset.stnk_document.original_name}`
                        : asset.no_stnk
                        ? `STNK: ${asset.no_stnk}`
                        : 'Belum diupload'}
                    </Text>

                    <View style={{ gap: 6, marginTop: 4 }}>
                      {(asset.stnk_document?.url || asset.foto_stnk_1_url) && (
                        <TouchableOpacity
                          style={[styles.docUploadBtn, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1 }]}
                          onPress={handleViewStnk}
                        >
                          <Ionicons name="eye-outline" size={12} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={[styles.docUploadBtnText, { color: '#059669' }]}>Lihat STNK</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.docUploadBtn}
                        onPress={() => handleUploadPdfDocument('stnk')}
                        disabled={isUploadingDoc === 'stnk'}
                      >
                        {isUploadingDoc === 'stnk' ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="document-attach-outline" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={styles.docUploadBtnText}>
                              {asset.stnk_document?.url || asset.foto_stnk_1_url ? 'Ganti STNK (PDF)' : 'Upload STNK (PDF)'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* BPKB Card */}
                  <View style={[styles.docCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="document-text-outline" size={20} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={styles.docCardTitle}>Dokumen BPKB</Text>
                    </View>
                    <Text style={styles.docStatusText} numberOfLines={1}>
                      {asset.bpkb_document?.original_name
                        ? `📄 ${asset.bpkb_document.original_name}`
                        : asset.no_bpkp
                        ? `BPKB: ${asset.no_bpkp}`
                        : 'Belum diupload'}
                    </Text>

                    <View style={{ gap: 6, marginTop: 4 }}>
                      {(asset.bpkb_document?.url || asset.foto_bpkb_1_url) && (
                        <TouchableOpacity
                          style={[styles.docUploadBtn, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1 }]}
                          onPress={handleViewBpkb}
                        >
                          <Ionicons name="eye-outline" size={12} color="#059669" style={{ marginRight: 4 }} />
                          <Text style={[styles.docUploadBtnText, { color: '#059669' }]}>Lihat BPKB</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.docUploadBtn, { backgroundColor: '#059669' }]}
                        onPress={() => handleUploadPdfDocument('bpkb')}
                        disabled={isUploadingDoc === 'bpkb'}
                      >
                        {isUploadingDoc === 'bpkb' ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <>
                            <Ionicons name="document-attach-outline" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                            <Text style={styles.docUploadBtnText}>
                              {asset.bpkb_document?.url ? 'Ganti BPKB (PDF)' : 'Upload BPKB (PDF)'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Section Foto Fisik BMN */}
            <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
              <View style={{ marginBottom: 14 }}>
                <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 0 }]}>Foto Fisik BMN</Text>
              </View>

              <View style={styles.photoGrid}>
                {photoSlots.map((slot) => {
                  const hasUrl = !!slot.url;
                  const isGeotag = slot.key === 'geotag';
                  return (
                    <View key={slot.key} style={[styles.photoSlotCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
                      {hasUrl ? (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => handleViewPhysicalPhoto(slot.key, photoSlots)}>
                          <Image source={{ uri: slot.url! }} style={styles.photoImg} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={28} color="#94a3b8" />
                          <Text style={styles.photoPlaceholderText}>Belum ada</Text>
                        </View>
                      )}
                      
                      <Text style={styles.photoSlotLabel}>{slot.label}</Text>

                      {/* Location Note Pill matching Screenshot 2 (Rendered ONLY on Tampak Depan slot) */}
                      {slot.key === 'depan' && (
                        <View style={[styles.locationPillCard, { backgroundColor: asset.foto_geotag_location_note ? '#f0fdf4' : '#ffffff', borderColor: asset.foto_geotag_location_note ? '#bbf7d0' : '#e2e8f0' }]}>
                          <Text style={[styles.locationPillText, { color: asset.foto_geotag_location_note ? '#15803d' : '#64748b' }]} numberOfLines={1}>
                            {asset.foto_geotag_location_note || 'Belum berlokasi'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.photoBtnRow}>
                        <TouchableOpacity
                          style={styles.photoActionBtn}
                          onPress={() => setSourcePickerState({
                            visible: true,
                            type: slot.key,
                            label: slot.label,
                            isGeotag,
                            currentUrl: slot.url || '',
                          })}
                        >
                          <Ionicons name={isGeotag ? "link-outline" : "camera-outline"} size={12} color="#059669" />
                          <Text style={styles.photoActionBtnText}>{hasUrl ? (isGeotag ? 'Ganti Link' : 'Ganti') : 'Ambil'}</Text>
                        </TouchableOpacity>
                        {hasUrl && (
                          <TouchableOpacity
                            style={[styles.photoActionBtn, { borderColor: '#fca5a5' }]}
                            onPress={() => handleDeletePhoto(slot.key)}
                            disabled={isDeletingPhoto === slot.key}
                          >
                            <Ionicons name="trash-outline" size={12} color="#dc2626" />
                            <Text style={[styles.photoActionBtnText, { color: '#dc2626' }]}>Hapus</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </GlassCard>
          </View>
        )}

        {/* Tab 4: Lokasi & Penanggung Jawab */}
        {activeTab === 'lokasi' && (
          <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Lokasi & Penanggung Jawab</Text>

            <DetailFieldRow label="Penanggung Jawab / Pengguna" value={asset.nama_pengguna || asset.pengguna} colors={colors} highlight />
            <DetailFieldRow label="Lokasi Ruang / Resor" value={asset.lokasi_ruang} colors={colors} highlight />
            <DetailFieldRow label="Satuan Kerja" value={asset.satuan_kerja || 'BKSDA Kalimantan Timur'} colors={colors} />
          </GlassCard>
        )}

        {/* Tab 5: Riwayat */}
        {activeTab === 'riwayat' && (
          <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Riwayat Peminjaman & Pemeliharaan</Text>

            {asset.active_loan ? (
              <View style={styles.loanActiveBox}>
                <Ionicons name="swap-horizontal" size={20} color="#2563eb" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.loanActiveTitle}>Sedang Dipinjam</Text>
                  <Text style={styles.loanActiveSub}>Peminjam: {asset.active_loan.borrower_name}</Text>
                  <Text style={styles.loanActiveMeta}>Keperluan: {asset.active_loan.purpose || '-'}</Text>
                </View>
              </View>
            ) : (
              <View style={{ paddingVertical: 14, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={32} color="#059669" />
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  Tidak ada peminjaman aktif saat ini (Status: Tersedia)
                </Text>
              </View>
            )}
          </GlassCard>
        )}
      </ScrollView>

      {/* Floating Action Bar */}
      <View style={[styles.floatingBar, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
        <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleEdit}>
          <Ionicons name="create-outline" size={16} color={colors.textDark} style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnSecondaryText, { color: colors.textDark }]}>Edit</Text>
        </TouchableOpacity>

        {asset.active_loan ? (
          <EmeraldButton
            title="KEMBALIKAN ASET"
            onPress={handleReturn}
            loading={isReturning}
            style={{ flex: 1 }}
          />
        ) : (
          <EmeraldButton
            title="+ PINJAM BMN"
            onPress={handleLoan}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {/* Lightbox Multi-page & Multi-photo Modal */}
      <Modal visible={!!lightboxState} transparent animationType="fade">
        <View style={styles.lightboxOverlay}>
          {/* Header Bar */}
          <View style={styles.lightboxHeaderBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lightboxHeaderTitle} numberOfLines={1}>
                {lightboxState?.labels?.[lightboxState.index] || lightboxState?.title}
              </Text>
              {lightboxState && lightboxState.images.length > 1 && (
                <Text style={styles.lightboxHeaderSub}>
                  Halaman {lightboxState.index + 1} dari {lightboxState.images.length}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.lightboxCloseBtn} onPress={() => setLightboxState(null)}>
              <Ionicons name="close" size={26} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Image & Navigation Control Area */}
          <View style={styles.lightboxImageContainer}>
            {lightboxState && lightboxState.index > 0 && (
              <TouchableOpacity style={[styles.lightboxArrowBtn, { left: 12 }]} onPress={handlePrevPage}>
                <Ionicons name="chevron-back" size={28} color="#ffffff" />
              </TouchableOpacity>
            )}

            {lightboxState && (
              <Image
                key={lightboxState.images[lightboxState.index]}
                source={{ uri: lightboxState.images[lightboxState.index] }}
                style={styles.lightboxImg}
                resizeMode="contain"
                onLoad={() => console.log('[LIGHTBOX LOADED]:', lightboxState.images[lightboxState.index])}
                onError={(e) => console.warn('[LIGHTBOX ERROR]:', e.nativeEvent.error, lightboxState.images[lightboxState.index])}
              />
            )}

            {lightboxState && lightboxState.index < lightboxState.images.length - 1 && (
              <TouchableOpacity style={[styles.lightboxArrowBtn, { right: 12 }]} onPress={handleNextPage}>
                <Ionicons name="chevron-forward" size={28} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom Dots Indicator */}
          {lightboxState && lightboxState.images.length > 1 && (
            <View style={styles.lightboxPaginationRow}>
              {lightboxState.images.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setLightboxState((prev) => (prev ? { ...prev, index: i } : null))}
                  style={[
                    styles.lightboxDot,
                    i === lightboxState.index ? styles.lightboxDotActive : styles.lightboxDotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>

      {/* Modern Confirm Delete Photo Modal */}
      <ConfirmModal
        visible={deleteConfirmState.visible}
        title="Hapus Foto Fisik"
        message={`Apakah Anda yakin ingin menghapus foto ${deleteConfirmState.label}?`}
        confirmText="Hapus Foto"
        cancelText="Batal"
        iconName="trash-outline"
        variant="danger"
        onConfirm={() => {
          const typeToDelete = deleteConfirmState.type;
          setDeleteConfirmState({ visible: false, type: '', label: '' });
          executeDeletePhoto(typeToDelete);
        }}
        onCancel={() => {
          setDeleteConfirmState({ visible: false, type: '', label: '' });
        }}
      />

      {/* Modern Notification Modal */}
      <NotificationModal
        visible={notificationState.visible}
        title={notificationState.title}
        message={notificationState.message}
        variant={notificationState.variant}
        iconName={notificationState.iconName}
        buttonText="OK"
        onClose={() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
        }}
      />

      {/* Modern Source Picker Modal (Camera vs Gallery vs Link) */}
      <Modal visible={sourcePickerState.visible} transparent animationType="fade" onRequestClose={() => setSourcePickerState({ visible: false, type: '', label: '' })}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSourcePickerState({ visible: false, type: '', label: '' })} />
          <View style={[styles.sourcePickerCard, { backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
            <View style={styles.sourcePickerHeader}>
              <Ionicons name={sourcePickerState.isGeotag ? "location-outline" : "camera-outline"} size={26} color="#059669" />
              <Text style={[styles.sourcePickerTitle, { color: colors.textDark }]}>{sourcePickerState.label}</Text>
              <Text style={styles.sourcePickerSub}>Pilih metode pengunggahan foto aset BMN</Text>
            </View>

            <TouchableOpacity
              style={[styles.sourceOptionBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={() => {
                const typeToOpen = sourcePickerState.type;
                setSourcePickerState({ visible: false, type: '', label: '' });
                navigation.navigate('BmnPhotoCapture', { assetId: id, type: typeToOpen });
              }}
            >
              <View style={[styles.sourceOptionIconBg, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="camera" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.sourceOptionTitle, { color: colors.textDark }]}>Kamera (Ambil Langsung)</Text>
                <Text style={styles.sourceOptionSub}>Ambil foto fisik baru menggunakan kamera HP</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceOptionBtn, { marginTop: 10, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
              onPress={async () => {
                const typeToOpen = sourcePickerState.type;
                setSourcePickerState({ visible: false, type: '', label: '' });
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    allowsEditing: true,
                    quality: 0.85,
                  });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    navigation.navigate('BmnPhotoCapture', {
                      assetId: id,
                      type: typeToOpen,
                      initialUri: result.assets[0].uri,
                    });
                  }
                } catch (e) {
                  console.error('Gallery picker error:', e);
                }
              }}
            >
              <View style={[styles.sourceOptionIconBg, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="images" size={22} color="#2563eb" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.sourceOptionTitle, { color: colors.textDark }]}>Pilih dari Galeri</Text>
                <Text style={styles.sourceOptionSub}>Pilih file gambar foto dari galeri HP</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            {sourcePickerState.isGeotag && (
              <TouchableOpacity
                style={[styles.sourceOptionBtn, { marginTop: 10, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#cbd5e1' }]}
                onPress={() => {
                  const currentUrl = sourcePickerState.currentUrl || '';
                  setSourcePickerState({ visible: false, type: '', label: '' });
                  setGeotagLinkModalState({ visible: true, url: currentUrl });
                }}
              >
                <View style={[styles.sourceOptionIconBg, { backgroundColor: '#fffbe8' }]}>
                  <Ionicons name="link" size={22} color="#d97706" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.sourceOptionTitle, { color: colors.textDark }]}>Input / Edit Link Geotag</Text>
                  <Text style={styles.sourceOptionSub}>Gunakan tautan Google Drive / Web seperti di localhost</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.sourcePickerCancelBtn}
              onPress={() => setSourcePickerState({ visible: false, type: '', label: '' })}
            >
              <Text style={styles.sourcePickerCancelText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Geotag Drive Link Modal */}
      <Modal visible={geotagLinkModalState.visible} transparent animationType="fade" onRequestClose={() => setGeotagLinkModalState({ visible: false, url: '' })}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setGeotagLinkModalState({ visible: false, url: '' })} />
          <View style={[styles.sourcePickerCard, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
            <Text style={[styles.sourcePickerTitle, { color: colors.textDark, textAlign: 'left', marginBottom: 4 }]}>
              📍 Tautan Foto Geotag (Google Drive)
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
              Masukkan URL publik Google Drive atau link web foto lokasi aset.
            </Text>

            <TextInput
              placeholder="https://drive.google.com/file/d/..."
              placeholderTextColor="#94a3b8"
              value={geotagLinkModalState.url}
              onChangeText={(text) => setGeotagLinkModalState((prev) => ({ ...prev, url: text }))}
              style={[styles.linkInput, { color: colors.textDark, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: '#cbd5e1' }]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.sourcePickerCancelBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => setGeotagLinkModalState({ visible: false, url: '' })}
              >
                <Text style={styles.sourcePickerCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.linkSaveBtn, { flex: 1.5 }]}
                onPress={handleSubmitGeotagLink}
                disabled={isSubmittingGeotagLink}
              >
                {isSubmittingGeotagLink ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.linkSaveBtnText}>Simpan Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailFieldRow({
  label,
  value,
  colors,
  highlight = false,
}: {
  label: string;
  value?: string | number | null;
  colors: any;
  highlight?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={[styles.fieldValue, { color: highlight ? '#059669' : colors.textDark, fontWeight: highlight ? '700' : '500' }]}>
        {value || '-'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubText: {
    color: '#64748b',
    fontSize: 11.5,
  },
  refreshIconBtn: {
    padding: 8,
    backgroundColor: '#ecfdf5',
    borderRadius: 20,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
  },
  errorSub: {
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroMerk: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  pillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  nilaiConsolidatedCard: {
    marginTop: 14,
    paddingTop: 10,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  nilaiRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  nilaiRowDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  quickStatLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  quickStatValueLarge: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  docBoxRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  docCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  docCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  docStatusText: {
    fontSize: 10.5,
    color: '#64748b',
    marginBottom: 8,
  },
  docUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 5,
    borderRadius: 8,
  },
  docUploadBtnText: {
    color: '#ffffff',
    fontSize: 10.5,
    fontWeight: '700',
  },
  verifyBanner: {
    backgroundColor: '#fffbe8',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifyBannerTitle: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 12.5,
  },
  verifyBannerSub: {
    color: '#d97706',
    fontSize: 11,
    marginTop: 1,
  },
  verifyBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  tabScrollRow: {
    marginBottom: 12,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  tabPillActive: {
    backgroundColor: '#059669',
  },
  tabPillText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  tabPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fieldLabel: {
    color: '#64748b',
    fontSize: 12,
    flex: 1,
  },
  fieldValue: {
    fontSize: 12.5,
    textAlign: 'right',
    flex: 1.5,
  },
  addPhotoTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  addPhotoTopBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  photoSlotCard: {
    width: '48%',
    borderRadius: 12,
    padding: 8,
  },
  photoSlotLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    textAlign: 'center',
  },
  photoImg: {
    width: '100%',
    height: 100,
    borderRadius: 8,
  },
  photoPlaceholder: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  photoPlaceholderText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  photoBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 4,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  photoActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 2,
  },
  heroMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroMetaDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 8,
  },
  heroMetaLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  locationPillCard: {
    width: '100%',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationPillText: {
    fontSize: 10.5,
    fontWeight: '600',
    textAlign: 'center',
  },
  loanActiveBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  loanActiveTitle: {
    color: '#1d4ed8',
    fontWeight: '800',
    fontSize: 13,
  },
  loanActiveSub: {
    color: '#1e40af',
    fontSize: 11.5,
    marginTop: 2,
  },
  loanActiveMeta: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 1,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'space-between',
    paddingVertical: 36,
  },
  lightboxHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  lightboxHeaderTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  lightboxHeaderSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  lightboxCloseBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  lightboxImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  lightboxArrowBtn: {
    position: 'absolute',
    top: '46%',
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
  },
  lightboxImg: {
    width: '92%',
    height: '85%',
  },
  lightboxPaginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
  },
  lightboxDot: {
    height: 8,
    borderRadius: 4,
  },
  lightboxDotActive: {
    width: 24,
    backgroundColor: '#059669',
  },
  lightboxDotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  sourcePickerCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  sourcePickerHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sourcePickerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 6,
  },
  sourcePickerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  sourceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  sourceOptionIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceOptionTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  sourceOptionSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  sourcePickerCancelBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourcePickerCancelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  linkInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  linkSaveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkSaveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
