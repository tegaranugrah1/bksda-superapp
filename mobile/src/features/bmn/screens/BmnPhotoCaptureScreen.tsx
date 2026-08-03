import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AppButton } from '@/components/AppButton';
import { IconButton } from '@/components/IconButton';
import { getCurrentLocation } from '@/lib/devicePermissions';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';
import { NotificationModal } from '@/components/ui/NotificationModal';

export default function BmnPhotoCaptureScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { assetId, type, initialUri } = route.params || {};

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(initialUri || null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [addressLines, setAddressLines] = useState<string[]>([]);
  const [locationNote, setLocationNote] = useState('');
  const [captureTime] = useState<string>(() => {
    const now = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const day = now.getDate();
    const monthStr = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    return `${day} ${monthStr} ${year} ${hours}.${mins}.${secs}`;
  });
  const cameraRef = useRef<any>(null);

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

  const handleNavigateBackToDetail = () => {
    if (assetId) {
      (navigation as any).navigate('BmnDetail', { id: assetId });
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    if (initialUri) {
      setPhotoUri(initialUri);
    }
  }, [initialUri]);

  // Request location permission and get coords on mount
  useEffect(() => {
    async function fetchLocation() {
      const location = await getCurrentLocation();
      if (location) {
        setCoords(location);
      }
    }
    fetchLocation();
  }, []);

  // Reverse geocode coords to full address lines (Matching Timestamp Camera app)
  useEffect(() => {
    async function reverseGeocode() {
      if (!coords) return;
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        if (results && results.length > 0) {
          const item = results[0];
          const lines: string[] = [];
          const street = item.street || item.name;
          const streetNum = item.streetNumber;
          if (street) {
            lines.push(streetNum ? `${streetNum} ${street}` : street);
          }
          if (item.district) {
            lines.push(item.district);
          }
          if (item.subregion) {
            const sub = item.subregion;
            if (!sub.toLowerCase().startsWith('kecamatan') && !sub.toLowerCase().startsWith('kota') && !sub.toLowerCase().startsWith('kabupaten')) {
              lines.push(`Kecamatan ${sub}`);
            } else {
              lines.push(sub);
            }
          }
          if (item.city) {
            const city = item.city;
            if (!city.toLowerCase().startsWith('kota') && !city.toLowerCase().startsWith('kabupaten') && !city.toLowerCase().startsWith('kecamatan')) {
              lines.push(`Kota ${city}`);
            } else {
              lines.push(city);
            }
          }
          if (item.region) {
            lines.push(item.region);
          }
          setAddressLines(lines);
        }
      } catch (e) {
        console.warn('Reverse geocode error:', e);
      }
    }
    reverseGeocode();
  }, [coords]);

  if (!permission && !photoUri) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.foreground }}>Checking permissions...</Text>
      </View>
    );
  }

  if (permission && !permission.granted && !photoUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', padding: spacing.lg }]}>
        <View style={styles.centered}>
          <Text style={[styles.title, { color: colors.foreground, fontSize: typography.fontSizes.lg, marginBottom: spacing.md }]}>
            Akses Kamera Diperlukan
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: 'center', marginBottom: spacing.lg }]}>
            Aplikasi memerlukan izin akses kamera untuk mengambil foto fisik aset BMN.
          </Text>
          <AppButton title="Beri Izin Kamera" onPress={requestPermission} />
          <View style={{ marginTop: spacing.md, width: '100%' }}>
            <AppButton title="Kembali" variant="ghost" onPress={handleNavigateBackToDetail} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const options = { quality: 0.85, skipProcessing: false };
      const photo = await cameraRef.current.takePictureAsync(options);
      setPhotoUri(photo.uri);
      // Fetch fresh location coordinates at the time of capture
      const location = await getCurrentLocation();
      if (location) {
        setCoords(location);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      setNotificationState({
        visible: true,
        title: 'Gagal Mengambil Foto',
        message: 'Terjadi kesalahan saat mengambil foto dari kamera.',
        variant: 'danger',
        iconName: 'alert-circle-outline',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUpload = async () => {
    if (!photoUri || isUploading) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      const filename = photoUri.split('/').pop() || `photo_${type}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const fileType = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('photo', {
        uri: photoUri,
        name: filename,
        type: fileType,
      } as any);

      formData.append('type', type);

      if (coords) {
        formData.append('latitude', String(coords.latitude));
        formData.append('longitude', String(coords.longitude));
      }

      if (type === 'depan' && locationNote.trim()) {
        formData.append('location_note', locationNote.trim());
      }

      await apiClient.post(`/bmn/assets/${assetId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setNotificationState({
        visible: true,
        title: 'Sukses Diunggah',
        message: 'Foto fisik aset BMN berhasil disimpan dan diperbarui.',
        variant: 'success',
        iconName: 'checkmark-circle-outline',
      });
    } catch (err: any) {
      const apiErr = normalizeError(err);
      setNotificationState({
        visible: true,
        title: 'Gagal Mengunggah',
        message: apiErr.message || 'Terjadi kesalahan saat mengunggah foto.',
        variant: 'danger',
        iconName: 'alert-circle-outline',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const labelMap: Record<string, string> = {
    depan: 'Tampak Depan',
    belakang: 'Tampak Belakang',
    kiri: 'Tampak Kiri',
    kanan: 'Tampak Kanan',
    geotag: 'Foto Geotag',
    stnk_1: 'Dokumen STNK',
    bpkb_1: 'Dokumen BPKB',
  };

  const titleText = `Ambil Foto ${labelMap[type] || type}`;

  // If photo is already captured/selected, show preview & upload screen
  if (photoUri) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => setPhotoUri(null)}
            accessibilityLabel="Kembali ke Kamera"
          />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginLeft: spacing.sm }]}>
            Preview Foto & Geotag
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg }} style={{ flex: 1 }}>
          {/* Photo Preview Container with Timestamp Camera Style Watermark Overlay (Matching Screenshot 1) */}
          <View style={[styles.previewCardContainer, { backgroundColor: '#0f172a', borderRadius: radius.lg, overflow: 'hidden', minHeight: 320 }]}>
            <Image source={{ uri: photoUri }} style={styles.previewImageFill} resizeMode="contain" testID="photo-preview-image" />

            {/* Timestamp & Geocoded Address Watermark Overlay anchored at bottom-right */}
            <View style={styles.timestampWatermarkBoxRight}>
              <Text style={styles.timestampWatermarkText}>{captureTime}</Text>
              {coords ? (
                <Text style={styles.timestampWatermarkText}>
                  Lat: {coords.latitude.toFixed(6)} Long: {coords.longitude.toFixed(6)}
                </Text>
              ) : null}
              {addressLines.map((line, idx) => (
                <Text key={idx} style={styles.timestampWatermarkText}>
                  {line}
                </Text>
              ))}
            </View>
          </View>

          {coords ? (
            <View style={[styles.geotagCard, { backgroundColor: colors.secondary, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }]}>
              <Text style={{ fontWeight: 'bold', color: colors.foreground, fontSize: typography.fontSizes.sm, marginBottom: spacing.xs }}>
                📍 Geotag Tersemat
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.xs }}>
                Latitude: {coords.latitude.toFixed(6)}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.xs }}>
                Longitude: {coords.longitude.toFixed(6)}
              </Text>
            </View>
          ) : (
            <View style={[styles.geotagCard, { backgroundColor: '#fee2e2', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md }]}>
              <Text style={{ fontWeight: 'bold', color: '#991b1b', fontSize: typography.fontSizes.sm }}>
                ⚠️ Geotag Tidak Tersedia
              </Text>
              <Text style={{ color: '#b91c1c', fontSize: typography.fontSizes.xs, marginTop: spacing.xs }}>
                GPS tidak dapat ditemukan. Izin lokasi tidak diberikan atau GPS tidak aktif.
              </Text>
            </View>
          )}

          {/* Optional Location Note Input ONLY for Tampak Depan */}
          {type === 'depan' && (
            <>
              <Text style={{ marginTop: spacing.md, color: colors.foreground, fontWeight: 'bold', fontSize: typography.fontSizes.sm, marginBottom: spacing.xs }}>
                Catatan Lokasi (Optional)
              </Text>
              <TextInput
                placeholder="Masukkan keterangan detail lokasi pengambilan..."
                placeholderTextColor={colors.mutedForeground}
                value={locationNote}
                onChangeText={setLocationNote}
                style={[styles.input, { borderColor: colors.border, borderRadius: radius.md, color: colors.foreground, backgroundColor: colors.card, padding: spacing.md }]}
                multiline
                numberOfLines={3}
                testID="location-note-input"
              />
            </>
          )}

          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <AppButton title="Simpan & Upload" onPress={handleUpload} loading={isUploading} disabled={isUploading} />
            <AppButton title="Ambil Ulang" variant="secondary" onPress={() => setPhotoUri(null)} disabled={isUploading} />
          </View>
        </ScrollView>

        <NotificationModal
          visible={notificationState.visible}
          title={notificationState.title}
          message={notificationState.message}
          variant={notificationState.variant}
          iconName={notificationState.iconName}
          buttonText="OK"
          onClose={() => {
            setNotificationState((prev) => ({ ...prev, visible: false }));
            if (notificationState.variant === 'success') {
              handleNavigateBackToDetail();
            }
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />

      <SafeAreaView style={styles.cameraOverlay} pointerEvents="box-none">
        {/* Top Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleNavigateBackToDetail} accessibilityLabel="Batal">
            <Text style={{ color: '#ffffff', fontSize: 18 }}>✕</Text>
          </TouchableOpacity>
          <Text style={[styles.cameraTitle, { fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.md }]}>
            {titleText}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Shutter Button */}
        <View style={styles.shutterContainer}>
          {isCapturing ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <TouchableOpacity
              style={styles.shutterBtn}
              onPress={handleCapture}
              accessibilityLabel="Ambil Foto"
              testID="shutter-button"
            >
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <NotificationModal
        visible={notificationState.visible}
        title={notificationState.title}
        message={notificationState.message}
        variant={notificationState.variant}
        iconName={notificationState.iconName}
        buttonText="OK"
        onClose={() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
          if (notificationState.variant === 'success') {
            handleNavigateBackToDetail();
          }
        }}
      />
    </View>
  );
}

// React Native ScrollView is imported from react-native above

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
  },
  subtitle: {
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    letterSpacing: -0.5,
  },
  previewCardContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImageFill: {
    width: '100%',
    height: '100%',
  },
  timestampWatermarkBoxRight: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  timestampWatermarkText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'right',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
    lineHeight: 17,
  },
  geotagCard: {
    width: '100%',
  },
  input: {
    borderWidth: 1,
    height: 80,
    textAlignVertical: 'top',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    padding: 8,
  },
  cameraTitle: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  shutterContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
});
