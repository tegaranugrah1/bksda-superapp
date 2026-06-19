import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SearchInput } from '@/components/SearchInput';
import { useAppTheme } from '@/hooks/useAppTheme';
import { EmployeeSelectorItem } from './types';
import { useEmployeeSearch } from './useEmployeeSearch';

export type EmployeeSelectorSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (employee: EmployeeSelectorItem) => void;
  selectedEmployeeIds?: (string | number)[];
  title?: string;
};

export default function EmployeeSelectorSheet({
  visible,
  onClose,
  onSelect,
  selectedEmployeeIds = [],
  title = 'Pilih Pegawai',
}: EmployeeSelectorSheetProps) {
  const { colors, spacing, radius, typography } = useAppTheme();
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const selectedIds = React.useMemo(
    () => new Set(selectedEmployeeIds.map((id) => String(id))),
    [selectedEmployeeIds]
  );

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

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
  } = useEmployeeSearch({
    search: debouncedSearch,
    per_page: 20,
  });

  const handleSelect = (employee: EmployeeSelectorItem) => {
    onSelect(employee);
    onClose();
  };

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

  const renderEmployee = ({ item }: { item: EmployeeSelectorItem }) => {
    const isSelected = selectedIds.has(String(item.id));
    const summaryParts = [item.nip, item.jabatan, item.unit_kerja].filter(Boolean);

    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Pilih pegawai ${item.name}`}
        accessibilityState={{ selected: isSelected }}
        onPress={() => handleSelect(item)}
        style={[
          styles.employeeItem,
          {
            backgroundColor: isSelected ? colors.secondary : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            marginBottom: spacing.sm,
          },
        ]}
      >
        <View style={styles.employeeText}>
          <Text
            numberOfLines={2}
            style={{
              color: colors.foreground,
              fontSize: typography.fontSizes.md,
              fontWeight: typography.fontWeights.semibold,
            }}
          >
            {item.name}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              color: colors.mutedForeground,
              fontSize: typography.fontSizes.sm,
              marginTop: spacing.xs,
            }}
          >
            {summaryParts.length > 0 ? summaryParts.join(' • ') : 'Detail pegawai belum tersedia'}
          </Text>
        </View>
        {isSelected ? (
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.fontSizes.sm,
              fontWeight: typography.fontWeights.bold,
              marginLeft: spacing.sm,
            }}
          >
            Dipilih
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (isLoading && items.length === 0) {
      return (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      );
    }

    if (error && items.length === 0) {
      return (
        <ErrorState
          title="Gagal Memuat Pegawai"
          message={error.message || 'Terjadi kesalahan saat memuat data pegawai.'}
          onRetry={refetch}
        />
      );
    }

    if (items.length === 0) {
      return (
        <EmptyState
          title="Pegawai Tidak Ditemukan"
          message="Coba cari dengan nama atau NIP lain."
        />
      );
    }

    return (
      <FlatList
        data={items}
        renderItem={renderEmployee}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        refreshing={isRefreshing}
        onRefresh={refetch}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.lg }}
      />
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: radius.xl,
                  borderTopRightRadius: radius.xl,
                  padding: spacing.lg,
                },
              ]}
            >
              <View style={[styles.indicator, { backgroundColor: colors.border }]} />
              <View style={[styles.header, { marginBottom: spacing.md }]}>
                <Text
                  style={{
                    color: colors.foreground,
                    fontSize: typography.fontSizes.lg,
                    fontWeight: typography.fontWeights.bold,
                  }}
                >
                  {title}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Tutup selector pegawai"
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Text
                    style={{
                      color: colors.mutedForeground,
                      fontSize: typography.fontSizes.md,
                      fontWeight: typography.fontWeights.semibold,
                    }}
                  >
                    Tutup
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginBottom: spacing.md }}>
                <SearchInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Cari nama atau NIP..."
                  accessibilityLabel="Cari pegawai"
                  onClear={() => setSearch('')}
                />
              </View>
              <View style={styles.content}>{renderContent()}</View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    width: '100%',
  },
  indicator: {
    alignSelf: 'center',
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    width: 40,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 64,
  },
  content: {
    minHeight: 260,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  employeeItem: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 72,
  },
  employeeText: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
