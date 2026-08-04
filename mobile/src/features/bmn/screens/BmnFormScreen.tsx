import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { AppDatePickerModal } from '@/components/AppDatePickerModal';
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
import { NotificationModal } from '@/components/ui/NotificationModal';
import EmployeeSelectorSheet from '@/features/employees/EmployeeSelectorSheet';
import { EmployeeSelectorItem } from '@/features/employees/types';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';
import { usePermissions } from '@/lib/permissions';

const MASTER_LOKASI_RUANG = [
  'Kantor Balai KSDA Kalimantan Timur',
  'Urusan Umum dan Perlengkapan',
  'Urusan Kepegawaian',
  'Urusan Program dan Perencanaan',
  'Urusan Keuangan',
  'Urusan Evlab',
  'Urusan Teknis',
  'Urusan Perlindungan',
  'Urusan IKN',
  'Seksi KSDA Wilayah I (Berau)',
  'Resor 01. Berau',
  'Resor 02. Pulau Semama dan Pulau Sangalaki',
  'Resor 03. Tanjung Selor',
  'Resor 04. Tarakan',
  'Seksi KSDA Wilayah II (Tenggarong)',
  'Resor 05. Samarinda',
  'Resor 06. Padang Luway',
  'Resor 07. Muara Kaman Sedulang',
  'Resor 08. Sangatta',
];

function formatThousandInput(val?: string | number | null): string {
  if (val === undefined || val === null || val === '') return '';
  const digitsOnly = String(val).replace(/\D/g, '');
  if (!digitsOnly) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digitsOnly));
}

function parseThousandInput(val?: string | number | null): number | null {
  if (val === undefined || val === null || val === '') return null;
  const digitsOnly = String(val).replace(/\D/g, '');
  if (!digitsOnly) return null;
  const num = Number(digitsOnly);
  return isNaN(num) ? null : num;
}

export default function BmnFormScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<BmnStackParamList, 'BmnForm'>>();
  const id = route.params?.id;
  const isEdit = id !== undefined;

  const { can, hasModule, isSuperAdmin } = usePermissions();
  const { data: asset, isLoading, error, refetch } = useAssetDetail(id);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeSelectorItem | null>(null);
  const [isEmployeeSheetOpen, setIsEmployeeSheetOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');

  const [datePickerState, setDatePickerState] = useState<{
    visible: boolean;
    field: 'tanggal_perolehan' | 'tanggal_pajak_stnk' | 'tanggal_ganti_plat' | null;
    title: string;
    value: string;
  }>({
    visible: false,
    field: null,
    title: '',
    value: '',
  });

  const openDatePicker = (
    field: 'tanggal_perolehan' | 'tanggal_pajak_stnk' | 'tanggal_ganti_plat',
    currentValue?: string | null,
    title?: string
  ) => {
    setDatePickerState({
      visible: true,
      field,
      title: title || 'Pilih Tanggal',
      value: currentValue || '',
    });
  };

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

  const handleNavigateBack = () => {
    if (isEdit && id) {
      (navigation as any).navigate('BmnDetail', { id });
    } else {
      navigation.goBack();
    }
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema) as any,
    defaultValues: {
      nama_barang: '',
      kode_barang: '',
      nup: '',
      kondisi: 'Baik',
      nilai_perolehan: null,
      nilai_penyusutan: null,
      nilai_buku: null,
      jenis_bmn: '',
      merk: '',
      tipe: '',
      no_polisi: '',
      no_stnk: '',
      no_bpkb: '',
      no_mesin: '',
      no_rangka: '',
      tanggal_perolehan: '',
      tanggal_pajak_stnk: '',
      tanggal_ganti_plat: '',
      lokasi_ruang: '',
      pengguna: '',
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
        nilai_perolehan: parseThousandInput(asset.nilai_perolehan),
        nilai_penyusutan: parseThousandInput(asset.nilai_penyusutan),
        nilai_buku: parseThousandInput(asset.nilai_buku),
        jenis_bmn: asset.jenis_bmn ?? '',
        merk: asset.merk ?? '',
        tipe: asset.tipe ?? '',
        no_polisi: asset.no_polisi ?? '',
        no_stnk: asset.no_stnk ?? '',
        no_bpkb: asset.no_bpkp ?? asset.no_bpkb ?? '',
        no_mesin: asset.no_mesin ?? '',
        no_rangka: asset.no_rangka ?? '',
        tanggal_perolehan: asset.tanggal_perolehan ?? asset.tanggal_pembelian ?? '',
        tanggal_pajak_stnk: asset.tanggal_pajak_stnk ?? '',
        tanggal_ganti_plat: asset.tanggal_ganti_plat ?? '',
        lokasi_ruang: asset.lokasi_ruang ?? '',
        pengguna: asset.nama_pengguna ?? asset.pengguna ?? '',
        penanggung_jawab_id: asset.penanggung_jawab?.id ?? (asset as any).employee_id ?? null,
      });

      const pJawab = asset.penanggung_jawab || (asset as any).employee;
      if (pJawab) {
        setSelectedEmployee({
          id: pJawab.id,
          name: pJawab.nama_lengkap || (pJawab as any).nama || '',
          nip: pJawab.nip ?? null,
          jabatan: (pJawab as any).jabatan ?? null,
          unit_kerja: (pJawab as any).satuan_kerja ?? null,
        });
      } else if (asset.nama_pengguna || asset.pengguna) {
        setSelectedEmployee({
          id: (asset as any).employee_id || 0,
          name: asset.nama_pengguna || asset.pengguna || '',
          nip: null,
          jabatan: null,
          unit_kerja: null,
        });
      }
    }
  }, [isEdit, asset, reset]);

  const onSubmit = async (data: AssetFormData) => {
    const payload = {
      nama_barang: data.nama_barang,
      kode_barang: data.kode_barang,
      nup: data.nup,
      kondisi: data.kondisi,
      nilai_perolehan: parseThousandInput(data.nilai_perolehan),
      nilai_penyusutan: parseThousandInput(data.nilai_penyusutan),
      nilai_buku: parseThousandInput(data.nilai_buku),
      jenis_bmn: data.jenis_bmn || null,
      merk: data.merk || null,
      tipe: data.tipe || null,
      no_polisi: data.no_polisi || null,
      no_stnk: data.no_stnk || null,
      no_bpkp: data.no_bpkb || null,
      no_mesin: data.no_mesin || null,
      no_rangka: data.no_rangka || null,
      tanggal_perolehan: data.tanggal_perolehan || null,
      tanggal_pajak_stnk: data.tanggal_pajak_stnk || null,
      tanggal_ganti_plat: data.tanggal_ganti_plat || null,
      lokasi_ruang: data.lokasi_ruang || null,
      pengguna: data.pengguna || (selectedEmployee ? selectedEmployee.name : null),
      nama_pengguna: data.pengguna || (selectedEmployee ? selectedEmployee.name : null),
      employee_id: data.penanggung_jawab_id || (selectedEmployee ? selectedEmployee.id : null),
      penanggung_jawab_id: data.penanggung_jawab_id || (selectedEmployee ? selectedEmployee.id : null),
    };

    try {
      if (isEdit) {
        await apiClient.put(`/bmn/assets/${id}`, payload);
        await refetch();
      } else {
        await apiClient.post('/bmn/assets', payload);
      }

      setNotificationState({
        visible: true,
        title: isEdit ? 'Ubah Aset Berhasil' : 'Tambah Aset Berhasil',
        message: isEdit ? 'Data aset BMN telah diperbarui dan disinkronkan.' : 'Aset BMN baru telah ditambahkan.',
        variant: 'success',
        iconName: 'checkmark-circle-outline',
      });
    } catch (err: any) {
      const apiError = normalizeError(err);
      if (apiError.kind === 'validation' && apiError.fieldErrors) {
        Object.keys(apiError.fieldErrors).forEach((field) => {
          const messages = apiError.fieldErrors?.[field];
          if (messages && messages.length > 0) {
            const formField = field === 'no_bpkp' ? 'no_bpkb' : field;
            setError(formField as any, {
              type: 'server',
              message: messages[0],
            });
          }
        });
      } else {
        setNotificationState({
          visible: true,
          title: 'Gagal Menyimpan',
          message: apiError.message || 'Terjadi kesalahan pada server.',
          variant: 'danger',
          iconName: 'alert-circle-outline',
        });
      }
    }
  };

  const canCreate = isSuperAdmin() || hasModule('bmn') || can('bmn.asset.create');
  const canEdit = isSuperAdmin() || hasModule('bmn') || can('bmn.asset.update') || asset?.allowed_actions?.can_edit === true;

  if (!isEdit && !canCreate) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={handleNavigateBack}
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

  if (isEdit && asset && !canEdit) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
          <IconButton
            icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
            onPress={handleNavigateBack}
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
            onPress={handleNavigateBack}
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
            onPress={handleNavigateBack}
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

  const filteredLocations = MASTER_LOKASI_RUANG.filter((loc) =>
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Row */}
      <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
        <IconButton
          icon={<Text style={{ fontSize: 20, color: colors.foreground }}>←</Text>}
          onPress={handleNavigateBack}
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
        <SectionCard title="Identitas & Dokumen Kendaraan / Aset">
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
            name="tanggal_pajak_stnk"
            render={({ field: { value } }) => (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.foreground, fontSize: typography.fontSizes.sm, marginBottom: 6 }]}>
                  Tanggal Pajak STNK
                </Text>
                <TouchableOpacity
                  style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openDatePicker('tanggal_pajak_stnk', value, 'Pilih Tanggal Pajak STNK')}
                >
                  <Text style={[styles.pickerBoxText, { color: value ? colors.foreground : colors.mutedForeground }]}>
                    {value || 'Pilih Tanggal Pajak STNK...'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
            )}
          />

          <Controller
            control={control}
            name="tanggal_ganti_plat"
            render={({ field: { value } }) => (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.foreground, fontSize: typography.fontSizes.sm, marginBottom: 6 }]}>
                  Tanggal Ganti Plat / Mati Plat
                </Text>
                <TouchableOpacity
                  style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openDatePicker('tanggal_ganti_plat', value, 'Pilih Tanggal Ganti Plat')}
                >
                  <Text style={[styles.pickerBoxText, { color: value ? colors.foreground : colors.mutedForeground }]}>
                    {value || 'Pilih Tanggal Ganti Plat...'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
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

        {/* Section 4: Administrasi, Lokasi & Pengguna */}
        <SectionCard title="Administrasi, Lokasi & Pengguna">
          {/* Nilai Perolehan (Formatted with Thousand Separators) */}
          <Controller
            control={control}
            name="nilai_perolehan"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nilai Perolehan (Rp)"
                value={formatThousandInput(value)}
                onChangeText={(text) => {
                  const num = parseThousandInput(text);
                  onChange(num);
                }}
                placeholder="Masukkan nilai perolehan (e.g. 770.700.000)..."
                keyboardType="number-pad"
                error={errors.nilai_perolehan?.message}
              />
            )}
          />

          {/* Nilai Penyusutan (Formatted with Thousand Separators) */}
          <Controller
            control={control}
            name="nilai_penyusutan"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nilai Penyusutan (Rp)"
                value={formatThousandInput(value)}
                onChangeText={(text) => {
                  const num = parseThousandInput(text);
                  onChange(num);
                }}
                placeholder="Masukkan nilai penyusutan (e.g. 330.300.000)..."
                keyboardType="number-pad"
                error={errors.nilai_penyusutan?.message}
              />
            )}
          />

          {/* Nilai Buku (Formatted with Thousand Separators) */}
          <Controller
            control={control}
            name="nilai_buku"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Nilai Buku (Rp)"
                value={formatThousandInput(value)}
                onChangeText={(text) => {
                  const num = parseThousandInput(text);
                  onChange(num);
                }}
                placeholder="Masukkan nilai buku (e.g. 440.400.000)..."
                keyboardType="number-pad"
                error={errors.nilai_buku?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="tanggal_perolehan"
            render={({ field: { value } }) => (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.foreground, fontSize: typography.fontSizes.sm, marginBottom: 6 }]}>
                  Tanggal Perolehan
                </Text>
                <TouchableOpacity
                  style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openDatePicker('tanggal_perolehan', value, 'Pilih Tanggal Perolehan')}
                >
                  <Text style={[styles.pickerBoxText, { color: value ? colors.foreground : colors.mutedForeground }]}>
                    {value || 'Pilih Tanggal Perolehan...'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color="#059669" />
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Lokasi Ruangan Dropdown Picker (Matching Screenshot 3) */}
          <Controller
            control={control}
            name="lokasi_ruang"
            render={({ field: { onChange, value } }) => (
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.foreground, fontSize: typography.fontSizes.sm, marginBottom: 6 }]}>
                  Lokasi Ruangan BMN
                </Text>
                <TouchableOpacity
                  style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setIsLocationModalOpen(true)}
                >
                  <Text style={[styles.pickerBoxText, { color: value ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                    {value || 'Pilih Lokasi Ruang...'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}
          />

          {/* Pengguna / Penanggung Jawab Kepegawaian Selector */}
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: colors.foreground, fontSize: typography.fontSizes.sm, marginBottom: 6 }]}>
              Penanggung Jawab / Pengguna (Kepegawaian)
            </Text>
            <TouchableOpacity
              style={[styles.pickerBox, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setIsEmployeeSheetOpen(true)}
            >
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.pickerBoxText, { color: selectedEmployee ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                  {selectedEmployee ? selectedEmployee.name : 'Pilih Pegawai Penanggung Jawab...'}
                </Text>
                {selectedEmployee?.jabatan ? (
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{selectedEmployee.jabatan}</Text>
                ) : null}
              </View>
              <Ionicons name="person-circle-outline" size={20} color="#059669" />
            </TouchableOpacity>
          </View>
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

      {/* Master Location Picker Modal (Matching Screenshot 3) */}
      <Modal visible={isLocationModalOpen} transparent animationType="fade" onRequestClose={() => setIsLocationModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIsLocationModalOpen(false)} />
          <View style={[styles.locationModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <Ionicons name="location-outline" size={22} color="#059669" style={{ marginRight: 6 }} />
              <Text style={[styles.modalTitleText, { color: colors.foreground }]}>Pilih Lokasi Ruangan</Text>
            </View>

            <View style={{ marginBottom: 10 }}>
              <AppTextInput
                label=""
                placeholder="Cari lokasi ruang / resor..."
                value={locationSearch}
                onChangeText={setLocationSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {filteredLocations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={styles.locationItemRow}
                  onPress={() => {
                    setValue('lokasi_ruang', loc);
                    setIsLocationModalOpen(false);
                  }}
                >
                  <Ionicons name="business-outline" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <Text style={[styles.locationItemText, { color: colors.foreground }]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setIsLocationModalOpen(false)}>
              <Text style={styles.closeModalBtnText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Employee Selector Sheet */}
      <EmployeeSelectorSheet
        visible={isEmployeeSheetOpen}
        onClose={() => setIsEmployeeSheetOpen(false)}
        onSelect={(emp) => {
          setSelectedEmployee(emp);
          setValue('penanggung_jawab_id', Number(emp.id));
          setValue('pengguna', emp.name);
          setIsEmployeeSheetOpen(false);
        }}
        selectedEmployeeIds={selectedEmployee ? [selectedEmployee.id] : []}
        title="Pilih Penanggung Jawab BMN"
      />

      {/* Notification Modal */}
      <NotificationModal
        visible={notificationState.visible}
        title={notificationState.title}
        message={notificationState.message}
        variant={notificationState.variant}
        iconName={notificationState.iconName}
        onClose={() => {
          setNotificationState((prev) => ({ ...prev, visible: false }));
          if (notificationState.variant === 'success') {
            handleNavigateBack();
          }
        }}
      />

      {/* Pure JS Glassmorphic Date Picker Modal */}
      <AppDatePickerModal
        visible={datePickerState.visible}
        title={datePickerState.title}
        value={datePickerState.value}
        onConfirm={(formattedDate) => {
          if (datePickerState.field) {
            setValue(datePickerState.field, formattedDate);
          }
        }}
        onClose={() => setDatePickerState((prev) => ({ ...prev, visible: false }))}
      />
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
  pickerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerBoxText: {
    fontSize: 13.5,
    fontWeight: '500',
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
  locationModalCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  locationItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  locationItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  closeModalBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
});
