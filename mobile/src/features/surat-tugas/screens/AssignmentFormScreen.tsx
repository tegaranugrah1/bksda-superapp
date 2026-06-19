import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/AppButton';
import { AppTextInput } from '@/components/AppTextInput';
import { ErrorState } from '@/components/ErrorState';
import { IconButton } from '@/components/IconButton';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SectionCard } from '@/components/SectionCard';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ApiError } from '@/types/api';
import { createAssignment, updateAssignment } from '../assignmentFormApi';
import { assignmentFormSchema, AssignmentFormData } from '../assignmentFormSchema';
import { SuratTugasStackParamList } from '../navigation/SuratTugasNavigator';
import { useAssignmentDetail } from '../useAssignmentDetail';

const defaultValues: AssignmentFormData = {
  nomor_surat: null,
  kode_surat: null,
  tanggal_surat: null,
  maksud_tujuan: '',
  dasar_hukum: null,
  tanggal_mulai: '',
  tanggal_selesai: '',
  tempat_tujuan: '',
  sumber_dana: 'dipa',
  sumber_dana_other: null,
  template_type: null,
  menimbang: null,
  dasar: null,
  tembusan: null,
  penandatangan_nama: null,
  penandatangan_nip: null,
  transport_required: false,
  transportasi: null,
  employees: [{ id: '' as any, peran: null }],
};

function mapDetailToFormValues(detail: any): AssignmentFormData {
  return {
    nomor_surat: detail.nomor ?? null,
    kode_surat: detail.kode_surat ?? null,
    tanggal_surat: detail.tanggal_surat ?? null,
    maksud_tujuan: detail.kegiatan ?? '',
    dasar_hukum: detail.dasar_hukum ?? null,
    tanggal_mulai: detail.tanggal_mulai ?? '',
    tanggal_selesai: detail.tanggal_selesai ?? '',
    tempat_tujuan: detail.tujuan ?? '',
    sumber_dana: detail.sumber_dana ?? 'dipa',
    sumber_dana_other: null,
    template_type: detail.template_type ?? null,
    menimbang: null,
    dasar: null,
    tembusan: null,
    penandatangan_nama: null,
    penandatangan_nip: null,
    transport_required: false,
    transportasi: null,
    employees:
      detail.personel?.length > 0
        ? detail.personel.map((personel: any) => ({
            id: Number(personel.id),
            peran: personel.peran ?? null,
          }))
        : [{ id: '' as any, peran: null }],
  };
}

function fieldErrorKeyToFormPath(field: string): string {
  return field
    .replace(/^employee_ids\.(\d+)$/, 'employees.$1.id')
    .replace(/^employees\.(\d+)\.id$/, 'employees.$1.id')
    .replace(/^employees\.(\d+)\.peran$/, 'employees.$1.peran');
}

export default function AssignmentFormScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SuratTugasStackParamList>>();
  const route = useRoute<RouteProp<SuratTugasStackParamList, 'AssignmentForm'>>();
  const assignmentId = route.params?.id;
  const isEdit = assignmentId !== undefined;
  const {
    data: assignmentDetail,
    isLoading,
    error,
    refetch,
  } = useAssignmentDetail(assignmentId, 'management');

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema) as any,
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'employees',
  });

  const watchedValues = useWatch({ control });
  const transportRequired = watchedValues.transport_required;

  React.useEffect(() => {
    if (isEdit && assignmentDetail) {
      reset(mapDetailToFormValues(assignmentDetail));
    }
  }, [assignmentDetail, isEdit, reset]);

  const mapServerFieldErrors = (apiError: ApiError) => {
    if (apiError.kind !== 'validation' || !apiError.fieldErrors) {
      return false;
    }

    Object.entries(apiError.fieldErrors).forEach(([field, messages]) => {
      const message = messages[0];
      if (message) {
        setError(fieldErrorKeyToFormPath(field) as any, {
          type: 'server',
          message,
        });
      }
    });

    return true;
  };

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      const savedAssignment =
        isEdit && assignmentId !== undefined
          ? await updateAssignment(assignmentId, data)
          : await createAssignment(data);
      const savedId = savedAssignment?.id ?? assignmentId;

      Alert.alert(
        isEdit ? 'Ubah Surat Tugas' : 'Buat Surat Tugas',
        isEdit ? 'Surat Tugas berhasil diubah.' : 'Surat Tugas berhasil dibuat.'
      );

      if (savedId !== undefined) {
        navigation.navigate('AssignmentDetail', { id: savedId, mode: 'management' });
      } else {
        navigation.navigate('SuratTugasList');
      }
    } catch (submitError) {
      const apiError = submitError as ApiError;
      if (mapServerFieldErrors(apiError)) {
        return;
      }

      Alert.alert(
        isEdit ? 'Gagal Mengubah Surat Tugas' : 'Gagal Membuat Surat Tugas',
        apiError.message || 'Terjadi kesalahan saat menyimpan Surat Tugas.'
      );
    }
  };

  const renderHeader = () => (
    <View style={[styles.headerRow, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }]}>
      <IconButton
        icon={<Text style={{ color: colors.foreground, fontSize: 20 }}>{'<'}</Text>}
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
        {isEdit ? 'Ubah Surat Tugas' : 'Buat Surat Tugas'}
      </Text>
    </View>
  );

  if (isEdit && isLoading && !assignmentDetail) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
          <LoadingSkeleton variant="detail" count={1} />
        </View>
      </SafeAreaView>
    );
  }

  if (isEdit && error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <ErrorState
            title="Gagal Memuat Surat Tugas"
            message={error.message || 'Terjadi kesalahan saat memuat data Surat Tugas.'}
            onRetry={refetch}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        style={styles.keyboardAvoiding}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionCard title="Informasi Surat">
            <Controller
              control={control}
              name="nomor_surat"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Nomor Surat"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="ST.001/BKSDA/2026"
                  error={errors.nomor_surat?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="kode_surat"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Kode Surat"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="ST"
                  error={errors.kode_surat?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="maksud_tujuan"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Maksud dan Tujuan *"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Masukkan maksud dan tujuan penugasan"
                  multiline
                  error={errors.maksud_tujuan?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="dasar_hukum"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Dasar Hukum"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="Masukkan dasar hukum"
                  multiline
                  error={errors.dasar_hukum?.message}
                />
              )}
            />
          </SectionCard>

          <SectionCard title="Tanggal & Tujuan">
            <Controller
              control={control}
              name="tanggal_surat"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Tanggal Surat"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="2026-06-19"
                  error={errors.tanggal_surat?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="tanggal_mulai"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Tanggal Mulai *"
                  value={value}
                  onChangeText={onChange}
                  placeholder="2026-06-20"
                  error={errors.tanggal_mulai?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="tanggal_selesai"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Tanggal Selesai *"
                  value={value}
                  onChangeText={onChange}
                  placeholder="2026-06-21"
                  error={errors.tanggal_selesai?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="tempat_tujuan"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Tempat Tujuan *"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Samarinda"
                  error={errors.tempat_tujuan?.message}
                />
              )}
            />
          </SectionCard>

          <SectionCard
            title="Personel"
            action={
              <TouchableOpacity
                accessibilityLabel="Tambah personel"
                accessibilityRole="button"
                onPress={() => append({ id: '' as any, peran: null })}
                style={[
                  styles.smallButton,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    paddingHorizontal: spacing.md,
                  },
                ]}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                  }}
                >
                  Tambah
                </Text>
              </TouchableOpacity>
            }
          >
            {fields.map((field, index) => (
              <View
                key={field.id}
                style={[
                  styles.personelRow,
                  {
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                    padding: spacing.md,
                    marginBottom: spacing.md,
                  },
                ]}
              >
                <Controller
                  control={control}
                  name={`employees.${index}.id`}
                  render={({ field: { onChange, value } }) => (
                    <AppTextInput
                      label={`ID Pegawai ${index + 1} *`}
                      value={value ? String(value) : ''}
                      onChangeText={onChange}
                      placeholder="Masukkan ID pegawai"
                      keyboardType="number-pad"
                      error={errors.employees?.[index]?.id?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name={`employees.${index}.peran`}
                  render={({ field: { onChange, value } }) => (
                    <AppTextInput
                      label="Peran"
                      value={value ?? ''}
                      onChangeText={onChange}
                      placeholder="Ketua Tim, Anggota, atau peran lain"
                      error={errors.employees?.[index]?.peran?.message}
                    />
                  )}
                />
                {fields.length > 1 ? (
                  <TouchableOpacity
                    accessibilityLabel={`Hapus personel ${index + 1}`}
                    accessibilityRole="button"
                    onPress={() => remove(index)}
                    style={[styles.removeButton, { minHeight: 48 }]}
                  >
                    <Text
                      style={{
                        color: colors.danger,
                        fontSize: typography.fontSizes.sm,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                    >
                      Hapus
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {typeof errors.employees?.message === 'string' ? (
              <Text
                accessibilityLiveRegion="assertive"
                style={{ color: colors.danger, fontSize: typography.fontSizes.xs }}
              >
                {errors.employees.message}
              </Text>
            ) : null}
          </SectionCard>

          <SectionCard title="Dana & Transport">
            <Controller
              control={control}
              name="sumber_dana"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Sumber Dana *"
                  value={value}
                  onChangeText={onChange}
                  placeholder="dipa atau lainnya"
                  error={errors.sumber_dana?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="sumber_dana_other"
              render={({ field: { onChange, value } }) => (
                <AppTextInput
                  label="Detail Sumber Dana"
                  value={value ?? ''}
                  onChangeText={onChange}
                  placeholder="Isi jika sumber dana lainnya"
                  error={errors.sumber_dana_other?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="transport_required"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.switchRow, { marginBottom: spacing.md }]}>
                  <View style={styles.switchText}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontSize: typography.fontSizes.md,
                        fontWeight: typography.fontWeights.semibold,
                      }}
                    >
                      Gunakan Transportasi
                    </Text>
                  </View>
                  <Switch
                    accessibilityLabel="Gunakan transportasi"
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.card}
                  />
                </View>
              )}
            />
            {transportRequired ? (
              <Controller
                control={control}
                name="transportasi"
                render={({ field: { onChange, value } }) => (
                  <AppTextInput
                    label="Transportasi *"
                    value={value ?? ''}
                    onChangeText={onChange}
                    placeholder="Kendaraan dinas, speedboat, atau lainnya"
                    error={errors.transportasi?.message}
                  />
                )}
              />
            ) : null}
          </SectionCard>

          <SectionCard title="Review">
            <ReviewRow label="Kegiatan" value={watchedValues.maksud_tujuan || '-'} />
            <ReviewRow label="Tanggal" value={`${watchedValues.tanggal_mulai || '-'} s/d ${watchedValues.tanggal_selesai || '-'}`} />
            <ReviewRow label="Tujuan" value={watchedValues.tempat_tujuan || '-'} />
            <ReviewRow label="Personel" value={`${watchedValues.employees?.length || 0} pegawai`} />
            <ReviewRow label="Sumber Dana" value={watchedValues.sumber_dana || '-'} />
          </SectionCard>

          <AppButton
            title={isEdit ? 'Simpan Perubahan' : 'Buat Surat Tugas'}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            accessibilityLabel={isEdit ? 'Simpan perubahan Surat Tugas' : 'Buat Surat Tugas'}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useAppTheme();

  return (
    <View style={[styles.reviewRow, { paddingVertical: spacing.sm }]}>
      <Text
        style={{
          color: colors.mutedForeground,
          fontSize: typography.fontSizes.sm,
          fontWeight: typography.fontWeights.medium,
        }}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.reviewValue,
          {
            color: colors.foreground,
            fontSize: typography.fontSizes.sm,
            fontWeight: typography.fontWeights.semibold,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoiding: {
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
  smallButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
  },
  personelRow: {
    borderWidth: 1,
    width: '100%',
  },
  removeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  switchText: {
    flex: 1,
    paddingRight: 12,
  },
  reviewRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewValue: {
    flex: 1,
    paddingLeft: 12,
    textAlign: 'right',
  },
});
