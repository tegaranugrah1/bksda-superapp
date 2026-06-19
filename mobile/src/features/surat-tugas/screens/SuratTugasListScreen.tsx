import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { SearchInput } from '@/components/SearchInput';
import { useAppTheme } from '@/hooks/useAppTheme';
import { usePermissions } from '@/lib/permissions';
import AssignmentCard from '../components/AssignmentCard';
import { SuratTugasStackParamList } from '../navigation/SuratTugasNavigator';
import { useAssignments } from '../useAssignments';
import { AssignmentListItem, AssignmentListMode, AssignmentStatus } from '../types';

type StatusFilter = 'all' | Extract<AssignmentStatus, 'pending' | 'approved' | 'completed' | 'rejected'>;

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'Semua', value: 'all' },
  { label: 'Menunggu', value: 'pending' },
  { label: 'Disetujui', value: 'approved' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Ditolak', value: 'rejected' },
];

export default function SuratTugasListScreen() {
  const { colors, spacing, radius, typography } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<SuratTugasStackParamList>>();
  const { hasModule } = usePermissions();
  const canUseManagementMode = hasModule('surat_tugas') || hasModule('kepegawaian');
  const [mode, setMode] = React.useState<AssignmentListMode>('personal');
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [status, setStatus] = React.useState<StatusFilter>('all');
  const activeMode: AssignmentListMode = canUseManagementMode ? mode : 'personal';

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const {
    items,
    isLoading,
    isRefreshing,
    isFetchingNextPage,
    error,
    refetch,
    fetchNextPage,
  } = useAssignments({
    mode: activeMode,
    search: debouncedSearch,
    status: status === 'all' ? undefined : status,
  });

  const renderAssignment = ({ item }: { item: AssignmentListItem }) => (
    <AssignmentCard
      assignment={item}
      onPress={() => navigation.navigate('AssignmentDetail', { id: item.id, mode: activeMode })}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) {
      return null;
    }

    return (
      <View style={[styles.footer, { paddingVertical: spacing.md }]}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading && items.length === 0) {
      return (
        <View style={[styles.stateContainer, { paddingTop: spacing.md }]}>
          <LoadingSkeleton variant="card" count={3} />
        </View>
      );
    }

    if (error && items.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <ErrorState
            title="Gagal Memuat Surat Tugas"
            message={error.message || 'Terjadi kesalahan saat mengambil daftar surat tugas.'}
            onRetry={refetch}
          />
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.stateContainer}>
          <EmptyState
            title="Tidak Ada Surat Tugas"
            message="Surat tugas tidak ditemukan. Coba ubah mode, status, atau kata kunci pencarian."
          />
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        renderItem={renderAssignment}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl * 2 }}
        refreshing={isRefreshing}
        onRefresh={refetch}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    );
  };

  const modeLabel = activeMode === 'personal' ? 'Mode Personal' : 'Mode Manajemen';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        <View style={[styles.header, { marginBottom: spacing.lg }]}>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.xl,
                fontWeight: typography.fontWeights.bold,
              },
            ]}
          >
            Surat Tugas
          </Text>
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.mutedForeground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.sm,
                marginTop: spacing.xs,
              },
            ]}
          >
            {modeLabel}
          </Text>
        </View>

        <View style={[styles.modeRow, { marginBottom: spacing.md }]}>
          <TouchableOpacity
            onPress={() => setMode('personal')}
            accessibilityRole="button"
            accessibilityLabel="Tampilkan surat tugas personal"
            style={[
              styles.modeButton,
              {
                backgroundColor: activeMode === 'personal' ? colors.primary : colors.card,
                borderColor: activeMode === 'personal' ? colors.primary : colors.border,
                borderRadius: radius.lg,
              },
            ]}
          >
            <Text
              style={[
                styles.modeText,
                {
                  color: activeMode === 'personal' ? colors.primaryForeground : colors.foreground,
                  fontSize: typography.fontSizes.sm,
                  fontWeight: typography.fontWeights.semibold,
                },
              ]}
            >
              Personal
            </Text>
          </TouchableOpacity>

          {canUseManagementMode ? (
            <TouchableOpacity
              onPress={() => setMode('management')}
              accessibilityRole="button"
              accessibilityLabel="Tampilkan surat tugas manajemen"
              style={[
                styles.modeButton,
                {
                  backgroundColor: activeMode === 'management' ? colors.primary : colors.card,
                  borderColor: activeMode === 'management' ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.modeText,
                  {
                    color: activeMode === 'management' ? colors.primaryForeground : colors.foreground,
                    fontSize: typography.fontSizes.sm,
                    fontWeight: typography.fontWeights.semibold,
                  },
                ]}
              >
                Manajemen
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari nomor, kegiatan, atau tujuan..."
            accessibilityLabel="Cari surat tugas"
            onClear={() => setSearch('')}
          />
        </View>

        <View style={[styles.statusRow, { marginBottom: spacing.md }]}>
          {statusFilters.map((option) => {
            const isActive = option.value === status;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setStatus(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`Filter status ${option.label}`}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                    borderRadius: radius.full,
                    marginRight: spacing.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: isActive ? colors.primaryForeground : colors.mutedForeground,
                      fontSize: typography.fontSizes.sm,
                      fontWeight: typography.fontWeights.medium,
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {},
  title: {
    lineHeight: 28,
  },
  subtitle: {
    lineHeight: 20,
  },
  modeRow: {
    flexDirection: 'row',
  },
  modeButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  modeText: {
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  statusChip: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  statusText: {
    lineHeight: 20,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
