import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/ThemeContext';
import { GlassCard } from '../../../components/ui/GlassCard';
import { EmeraldButton } from '../../../components/ui/EmeraldButton';
import { useAssetDetail } from '../useAssetDetail';
import { apiClient } from '../../../lib/api/client';
import { normalizeError } from '../../../lib/api/errors';

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
    Alert.alert('Hapus Foto', `Apakah Anda yakin ingin menghapus foto ${type} ini?`, [
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
    ]);
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
            Kode: {asset.kode_barang} • NUP: {asset.nup}
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

          {/* Badges Flow */}
          <View style={styles.heroBadgeRow}>
            <View style={[styles.pillBadge, { backgroundColor: kondisiBg }]}>
              <Text style={[styles.pillBadgeText, { color: kondisiColor }]}>{asset.kondisi || 'Baik'}</Text>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.pillBadgeText, { color: '#334155' }]}>
                📅 {asset.tahun_perolehan || (asset.tanggal_perolehan ? new Date(asset.tanggal_perolehan).getFullYear() : '2023')}
              </Text>
            </View>

            <View style={[styles.pillBadge, { backgroundColor: '#ecfdf5' }]}>
              <Text style={[styles.pillBadgeText, { color: '#059669' }]}>
                Status: {asset.status_bmn || 'Aktif'}
              </Text>
            </View>

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

            {showPlatBadge && (
              <View style={[styles.pillBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1 }]}>
                <Text style={[styles.pillBadgeText, { color: '#059669', fontWeight: '800' }]}>
                  🚘 Plat: {asset.no_polisi}
                </Text>
              </View>
            )}
          </View>

          {/* Consolidated Nilai Card (1 Kolom 2 Baris) */}
          <View style={[styles.nilaiConsolidatedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
            <View style={styles.nilaiRowItem}>
              <Text style={styles.quickStatLabel}>Nilai Perolehan</Text>
              <Text style={[styles.quickStatValueLarge, { color: '#059669' }]}>
                {formatCurrency(asset.nilai_perolehan || asset.nilai_perolehan_pertama)}
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
                        onPress={() => handleCapturePhoto('stnk_1' as any)}
                      >
                        <Ionicons name="cloud-upload-outline" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.docUploadBtnText}>
                          {asset.stnk_document?.url || asset.foto_stnk_1_url ? 'Ganti STNK' : 'Upload STNK'}
                        </Text>
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
                        onPress={() => handleCapturePhoto('bpkb_1' as any)}
                      >
                        <Ionicons name="cloud-upload-outline" size={12} color="#ffffff" style={{ marginRight: 4 }} />
                        <Text style={styles.docUploadBtnText}>
                          {asset.bpkb_document?.url ? 'Ganti BPKB' : 'Upload BPKB'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </GlassCard>
            )}

            {/* Section Foto Fisik BMN */}
            <GlassCard style={[styles.sectionCard, { backgroundColor: colors.cardBg }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <Text style={[styles.sectionTitle, { color: colors.textDark, marginBottom: 0 }]}>Foto Fisik BMN</Text>
                <TouchableOpacity style={styles.addPhotoTopBtn} onPress={handleUploadPhoto}>
                  <Ionicons name="camera" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                  <Text style={styles.addPhotoTopBtnText}>+ Ambil Foto</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.photoGrid}>
                {photoSlots.map((slot) => {
                  const hasUrl = !!slot.url;
                  return (
                    <View key={slot.key} style={[styles.photoSlotCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]}>
                      <Text style={styles.photoSlotLabel}>{slot.label}</Text>
                      {hasUrl ? (
                        <TouchableOpacity activeOpacity={0.85} onPress={() => handleViewPhysicalPhoto(slot.key, photoSlots)}>
                          <Image source={{ uri: slot.url! }} style={styles.photoImg} resizeMode="cover" />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Ionicons name="camera-outline" size={28} color="#94a3b8" />
                          <Text style={styles.photoPlaceholderText}>Belum Tersedia</Text>
                        </View>
                      )}
                      <View style={styles.photoBtnRow}>
                        <TouchableOpacity
                          style={styles.photoActionBtn}
                          onPress={() => handleCapturePhoto(slot.key as any)}
                        >
                          <Ionicons name="camera-outline" size={12} color="#059669" />
                          <Text style={styles.photoActionBtnText}>{hasUrl ? 'Ganti' : 'Ambil'}</Text>
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
});
