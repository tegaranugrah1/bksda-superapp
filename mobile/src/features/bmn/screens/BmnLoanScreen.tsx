import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppTheme } from '@/hooks/useAppTheme';
import { IconButton } from '@/components/IconButton';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { SectionCard } from '@/components/SectionCard';
import { apiClient } from '@/lib/api/client';
import { normalizeError } from '@/lib/api/errors';
import { BmnStackParamList } from '../navigation/BmnNavigator';

const loanFormSchema = z.object({
  employee_id: z.string().min(1, 'Pegawai peminjam wajib dipilih.').uuid('Pegawai peminjam tidak valid.'),
  tanggal_pinjam: z.string().min(1, 'Tanggal pinjam wajib diisi.').regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD.'),
  keterangan: z.string().max(1000, 'Keterangan maksimal 1000 karakter.').optional().nullable(),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BmnLoanScreen() {
  const { colors, spacing, typography, radius } = useAppTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<BmnStackParamList, 'BmnLoan'>>();
  const { assetId } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema) as any,
    defaultValues: {
      employee_id: '',
      tanggal_pinjam: getTodayString(),
      keterangan: '',
    },
  });

  // Debounced employee search
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await apiClient.get(`/kepegawaian/employees/select?q=${searchQuery}`);
        setEmployees(response.data.data || []);
      } catch (err) {
        console.error('Error searching employees:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setValue('employee_id', employee.id, { shouldValidate: true });
    setSearchQuery('');
    setEmployees([]);
  };

  const handleClearEmployee = () => {
    setSelectedEmployee(null);
    setValue('employee_id', '');
  };

  const onSubmit = async (data: LoanFormData) => {
    try {
      await apiClient.post(`/bmn/assets/${assetId}/loans`, {
        employee_id: data.employee_id,
        tanggal_pinjam: data.tanggal_pinjam,
        keterangan: data.keterangan || null,
      });

      Alert.alert('Sukses', 'Aset berhasil dipinjamkan.', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('BmnDetail', { id: assetId });
          },
        },
      ]);
    } catch (err: any) {
      const apiErr = normalizeError(err);
      if (apiErr.kind === 'validation' && apiErr.fieldErrors) {
        Object.keys(apiErr.fieldErrors).forEach((field) => {
          const messages = apiErr.fieldErrors?.[field];
          const msg = Array.isArray(messages) ? messages[0] : messages;
          setError(field as any, { type: 'server', message: msg });
        });
      } else {
        Alert.alert('Error', apiErr.message || 'Gagal memproses peminjaman aset.');
      }
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
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
          Form Peminjaman BMN
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section 1: Pegawai Peminjam */}
        <SectionCard title="Pegawai Peminjam">
          {!selectedEmployee ? (
            <View style={{ marginBottom: spacing.md }}>
              <AppTextInput
                label="Cari Pegawai (Nama / NIP) *"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  if (!text.trim()) {
                    setEmployees([]);
                  }
                }}
                placeholder="Ketik nama atau NIP pegawai..."
                error={errors.employee_id?.message}
              />
              
              {isSearching && (
                <View style={[styles.loadingContainer, { marginTop: spacing.sm }]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ marginLeft: spacing.sm, color: colors.mutedForeground, fontSize: typography.fontSizes.sm }}>
                    Mencari pegawai...
                  </Text>
                </View>
              )}

              {employees.length > 0 && (
                <View style={[styles.suggestionsContainer, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.card, marginTop: spacing.xs }]}>
                  {employees.map((emp) => (
                    <TouchableOpacity
                      key={emp.id}
                      style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                      onPress={() => handleSelectEmployee(emp)}
                      accessibilityLabel={`Pilih ${emp.name}`}
                    >
                      <Text style={{ color: colors.foreground, fontWeight: typography.fontWeights.semibold, fontSize: typography.fontSizes.sm }}>
                        {emp.name}
                      </Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.xs, marginTop: 2 }}>
                        NIP. {emp.nip || '-'} • {emp.position || '-'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {!isSearching && searchQuery.trim().length > 0 && employees.length === 0 && (
                <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.xs, marginTop: spacing.xs, fontStyle: 'italic' }}>
                  Tidak ada pegawai yang cocok dengan kata kunci "{searchQuery}".
                </Text>
              )}
            </View>
          ) : (
            <View style={[styles.selectedCard, { borderColor: colors.primary, borderRadius: radius.md, backgroundColor: colors.muted, padding: spacing.md, marginBottom: spacing.md }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontWeight: typography.fontWeights.bold, fontSize: typography.fontSizes.md }}>
                  {selectedEmployee.name}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.sm, marginTop: 4 }}>
                  NIP: {selectedEmployee.nip || '-'}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSizes.xs, marginTop: 2 }}>
                  Satuan Kerja: {selectedEmployee.department || '-'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClearEmployee}
                style={[styles.clearButton, { backgroundColor: colors.danger, borderRadius: radius.sm }]}
                accessibilityLabel="Ubah Pegawai"
              >
                <Text style={{ color: '#ffffff', fontWeight: typography.fontWeights.semibold, fontSize: typography.fontSizes.xs }}>
                  Ganti
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SectionCard>

        {/* Section 2: Detail Peminjaman */}
        <SectionCard title="Detail Peminjaman">
          <Controller
            control={control}
            name="tanggal_pinjam"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Tanggal Pinjam (YYYY-MM-DD) *"
                value={value}
                onChangeText={onChange}
                placeholder="e.g. 2026-06-19"
                error={errors.tanggal_pinjam?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="keterangan"
            render={({ field: { onChange, value } }) => (
              <AppTextInput
                label="Keterangan / Keperluan Peminjaman"
                value={value ?? ''}
                onChangeText={onChange}
                placeholder="Ketik tujuan peminjaman atau catatan tambahan..."
                multiline
                error={errors.keterangan?.message}
              />
            )}
          />
        </SectionCard>

        {/* Submit Button */}
        <View style={{ marginTop: spacing.md }}>
          <AppButton
            title="Proses Peminjaman"
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
            accessibilityLabel="Submit Peminjaman BMN"
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionsContainer: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  clearButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
});
