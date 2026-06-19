import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAppTheme } from '@/hooks/useAppTheme';
import { assetFormSchema, AssetFormData, kondisiEnum } from '../assetFormSchema';
import { useAssetDetail } from '../useAssetDetail';
import { BmnStackParamList } from '../navigation/BmnNavigator';
import { IconButton } from '@/components/IconButton';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { SectionCard } from '@/components/SectionCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';
import { usePermissions } from '@/lib/permissions';

export default function BmnFormScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BmnStackParamList, 'BmnForm'>>();
  const id = route.params?.id;
  const isEdit = id !== undefined;

  const { can } = usePermissions();
  const { data: asset, isLoading, error, refetch } = useAssetDetail(id);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      nama_barang: '',
      kode_barang: '',
      nup: '',
      kondisi: 'Baik',
      nilai_perolehan: null,
      jenis_bmn: '',
      merk: '',
      tipe: '',
      no_polisi: '',
      no_stnk: '',
      no_bpkb: '',
      no_mesin: '',
      no_rangka: '',
      tanggal_perolehan: '',
      lokasi_ruang: '',
      penanggung_jawab_id: null,
    },
  });

  // Prefill form values when asset detail is fetched in edit mode
  useEffect(() => {
    if (isEdit && asset) {
      reset({
        nama_barang: asset.nama_barang ?? '',
        kode_barang: asset.kode_barang ?? '',
        nup: String(asset.nup ?? ''),
        kondisi: (asset.kondisi as any) ?? 'Baik',
        nilai_perolehan: asset.nilai_perolehan ?? null,
        jenis_bmn: asset.jenis_bmn ?? '',
        merk: asset.merk ?? '',
        tipe: asset.tipe ?? '',
        no_polisi: asset.no_polisi ?? '',
        no_stnk: asset.no_stnk ?? '',
        no_bpkb: asset.bpkb_1 ?? '',
        no_mesin: asset.no_mesin ?? '',
        no_rangka: asset.no_rangka ?? '',
        tanggal_perolehan: asset.tanggal_pembelian ?? '',
        lokasi_ruang: asset.lokasi_ruang ?? '',
        penanggung_jawab_id: asset.penanggung_jawab?.id ?? null,
      });
    }
  }, [isEdit, asset, reset]);

  const onSubmit = async (data: AssetFormData) => {
    const payload = {
      nama_barang: data.nama_barang,
      kode_barang: data.kode_barang,
      nup: data.nup,
      kondisi: data.kondisi,
      nilai_perolehan: data.nilai_perolehan,
      jenis_bmn: data.jenis_bmn || null,
      merk: data.merk || null,
      tipe: data.tipe || null,
      no_polisi: data.no_polisi || null,
      no_stnk: data.no_stnk || null,
      no_bpkp: data.no_bpkb || null, // Map no_bpkb to backend no_bpkp field
      no_mesin: data.no_mesin || null,
      no_rangka: data.no_rangka || null,
      tanggal_perolehan: data.tanggal_perolehan || null,
      lokasi_ruang: data.lokasi_ruang || null,
      penanggung_jawab_id: data.penanggung_jawab_id || null,
    };

    try {
      if (isEdit) {
        await apiClient.put(`/bmn/assets/${id}`, payload);
      } else {
        await apiClient.post('/bmn/assets', payload);
      }

      Alert.alert(
        isEdit ? 'Ubah Aset' : 'Tambah Aset',
        isEdit ? 'Data aset BMN berhasil diubah.' : 'Data aset BMN berhasil ditambahkan.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      const apiError = normalizeError(err);
      if (apiError.kind === 'validation' && apiError.fieldErrors) {
        Object.keys(apiError.fieldErrors).forEach((field) => {
          const messages = apiError.fieldErrors?.[field];
          if (messages && messages.length > 0) {
            // Map backend no_bpkp error back to form field no_bpkb
            const formField = field === 'no_bpkp' ? 'no_bpkb' : field;
            setError(formField as any, {
              type: 'server',
              message: messages[0],
            });
          }
        });
      } else {
        Alert.alert('Gagal Menyimpan', apiError.message || 'Terjadi kesalahan pada server.');
      }
    }
  };

  // Fail-closed permission checking
  if (!isEdit && !can('bmn.asset.create')) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Batal"
          />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginLeft: spacing.sm }]}>
            Tambah Aset BMN
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title="Akses Ditolak"
            message="Anda tidak memiliki akses untuk menambah aset BMN."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isEdit && asset && !asset.allowed_actions?.can_edit && !can('bmn.asset.update')) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Batal"
          />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginLeft: spacing.sm }]}>
            Ubah Aset BMN
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title="Akses Ditolak"
            message="Anda tidak memiliki akses untuk mengubah aset BMN ini."
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isEdit && isLoading && !asset) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Batal"
          />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginLeft: spacing.sm }]}>
            Ubah Aset BMN
          </Text>
        </View>
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <LoadingSkeleton variant="detail" count={1} />
        </View>
      </SafeAreaView>
    );
  }

  if (isEdit && error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Batal"
          />
          <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: typography.fontFamilies.sans, fontSize: typography.fontSizes.lg, fontWeight: typography.fontWeights.bold, marginLeft: spacing.sm }]}>
            Ubah Aset BMN
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title="Gagal Memuat Aset"
            message={error.message || 'Terjadi kesalahan saat memuat data BMN.'}
            onRetry={refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Row */}
      <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <IconButton
          icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Batal"
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
          {isEdit ? 'Ubah Aset BMN' : 'Tambah Aset BMN'}
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1: Informasi Dasar */}
        <SectionCard title="Informasi Dasar BMN">
          <Controller
            control={control}
            name="nama_barang"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nama Barang *"
                value={value}
                onChangeText={onChange}
                placeholder="Masukkan nama barang..."
                error={errors.nama_barang?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="kode_barang"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Kode Barang *"
                value={value}
                onChangeText={onChange}
                placeholder="Masukkan kode barang (e.g. BMN-01)..."
                error={errors.kode_barang?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="nup"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="NUP (Nomor Urut Pendaftaran) *"
                value={value}
                onChangeText={onChange}
                placeholder="Masukkan NUP..."
                keyboardType="number-pad"
                error={errors.nup?.message}
              />
            )}
          />
        </SectionCard>

        {/* Section 2: Kondisi & Spesifikasi */}
        <SectionCard title="Spesifikasi & Kondisi">
          {/* Custom Selector for Kondisi */}
          <View style={styles.inputContainer}>
            <Text
              style={[
                styles.label,
                {
                  color: errors.kondisi ? colors.danger : colors.foreground,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.medium,
                  marginBottom: spacing.sm,
                },
              ]}
            >
              Kondisi Barang *
            </Text>
            <Controller
              control={control}
              name="kondisi"
              render={({ field: { onChange, value } }) => (
                <View style={styles.selectorRow}>
                  {kondisiEnum.map((option) => {
                    const isSelected = value === option;
                    return (
                      <TouchableOpacity
                        key={option}
                        onPress={() => onChange(option)}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          {
                            borderRadius: radius.md,
                            paddingVertical: spacing.sm,
                            paddingHorizontal: spacing.md,
                            backgroundColor: isSelected ? colors.primary : colors.muted,
                            borderColor: isSelected ? colors.primary : colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isSelected ? colors.primaryForeground : colors.foreground,
                            fontSize: typography.fontSizes.sm,
                            fontWeight: typography.fontWeights.semibold,
                          }}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            />
            {errors.kondisi && (
              <Text style={[styles.errorText, { color: colors.danger, fontSize: typography.fontSizes.xs, marginTop: spacing.xs }]}>
                {errors.kondisi.message}
              </Text>
            )}
          </View>

          <Controller
            control={control}
            name="jenis_bmn"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Jenis BMN"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan jenis BMN (e.g. Peralatan & Mesin)..."
                error={errors.jenis_bmn?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="merk"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Merk"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan merk..."
                error={errors.merk?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="tipe"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Tipe"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan tipe..."
                error={errors.tipe?.message}
              />
            )}
          />
        </SectionCard>

        {/* Section 3: Identitas Teknis & Dokumen */}
        <SectionCard title="Identitas & Dokumen">
          <Controller
            control={control}
            name="no_polisi"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nomor Polisi"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan nomor polisi (e.g. B 1234 SQA)..."
                error={errors.no_polisi?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="no_stnk"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nomor STNK"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan nomor STNK..."
                error={errors.no_stnk?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="no_bpkb"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nomor BPKB"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan nomor BPKB..."
                error={errors.no_bpkb?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="no_mesin"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nomor Mesin"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan nomor mesin..."
                error={errors.no_mesin?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="no_rangka"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nomor Rangka"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan nomor rangka..."
                error={errors.no_rangka?.message}
              />
            )}
          />
        </SectionCard>

        {/* Section 4: Administrasi & Lokasi */}
        <SectionCard title="Administrasi & Lokasi">
          <Controller
            control={control}
            name="nilai_perolehan"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nilai Perolehan (Rp)"
                value={value !== null ? String(value) : ''}
                onChangeText={onChange}
                placeholder="Masukkan nilai perolehan..."
                keyboardType="number-pad"
                error={errors.nilai_perolehan?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="tanggal_perolehan"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Tanggal Perolehan (YYYY-MM-DD)"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="e.g. 2025-06-19"
                error={errors.tanggal_perolehan?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="lokasi_ruang"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Lokasi Ruangan BMN"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Masukkan nama ruangan (e.g. Ruang IT Lantai 2)..."
                error={errors.lokasi_ruang?.message}
              />
            )}
          />
        </SectionCard>

        {/* Save Button */}
        <View style={{ marginTop: spacing.md }}>
          <AppButton
            title={isEdit ? 'Simpan Perubahan' : 'Tambah Aset'}
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            accessibilityLabel={isEdit ? 'Simpan Perubahan Aset BMN' : 'Tambah Aset BMN'}
          />
        </View>
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
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    alignSelf: 'flex-start',
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  chip: {
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
  },
  errorText: {
    alignSelf: 'flex-start',
  },
});
