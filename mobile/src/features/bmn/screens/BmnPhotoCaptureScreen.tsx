import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Image, Alert, ActivityIndicator, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BmnStackParamList } from '../navigation/BmnNavigator';
import { AppButton } from '@/components/AppButton';
import { IconButton } from '@/components/IconButton';
import { getCurrentLocation } from '@/lib/devicePermissions';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';

export default function BmnPhotoCaptureScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BmnStackParamList, 'BmnPhotoCapture'>>();
  const { assetId, type } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationNote, setLocationNote] = useState('');
  const cameraRef = useRef<any>(null);

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

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.foreground }}>Checking permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
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
            <AppButton title="Kembali" variant="ghost" onPress={() => navigation.goBack()} />
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
      Alert.alert('Error', 'Gagal mengambil foto dari kamera.');
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

      if (locationNote.trim()) {
        formData.append('location_note', locationNote.trim());
      }

      await apiClient.post(`/bmn/assets/${assetId}/photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Sukses', 'Foto fisik dan geotag berhasil diunggah.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (err: any) {
      const apiErr = normalizeError(err);
      Alert.alert('Gagal Mengunggah', apiErr.message || 'Terjadi kesalahan saat mengunggah foto.');
    } finally {
      setIsUploading(false);
    }
  };

  const labelMap: Record<string, string> = {
    depan: 'Tampak Depan',
    belakang: 'Tampak Belakang',
    kiri: 'Tampak Kiri',
    kanan: 'Tampak Kanan',
  };

  const titleText = `Ambil Foto ${labelMap[type] || type}`;

  // If photo is already captured, show preview & upload screen
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
            Preview Foto
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: spacing.lg }} style={{ flex: 1 }}>
          <View style={[styles.previewCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Image source={{ uri: photoUri }} style={[styles.previewImage, { borderRadius: radius.md }]} resizeMode="contain" testID="photo-preview-image" />
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

          <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
            <AppButton title="Simpan & Upload" onPress={handleUpload} loading={isUploading} disabled={isUploading} />
            <AppButton title="Ambil Ulang" variant="secondary" onPress={() => setPhotoUri(null)} disabled={isUploading} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back">
        <SafeAreaView style={styles.cameraOverlay}>
          {/* Top Header */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()} accessibilityLabel="Batal">
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
      </CameraView>
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
  previewCard: {
    borderWidth: 1,
    height: 250,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
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
