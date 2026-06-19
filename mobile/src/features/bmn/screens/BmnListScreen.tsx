import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useAssets } from '../useAssets';
import AssetCard from '../components/AssetCard';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { IconButton } from '@/components/IconButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BmnStackParamList } from '../navigation/BmnNavigator';
import { AssetListItem } from '../types';
import AssetFilterSheet, { FilterState } from '../components/AssetFilterSheet';

export default function BmnListScreen() {
  const { colors, spacing, typography } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<BmnStackParamList>>();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<FilterState>({});
  const [filterVisible, setFilterVisible] = useState(false);

  // Debounce search value
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Hook query BMN list
  const {
    items,
    isLoading,
    error,
    isRefreshing,
    refetch,
    fetchNextPage,
    isFetchingNextPage,
  } = useAssets({
    search: debouncedSearch,
    kondisi: filters.kondisi,
    jenis_bmn: filters.jenis_bmn,
    lokasi_ruang: filters.lokasi_ruang,
  });

  const handleSearchChange = (text: string) => {
    setSearch(text);
  };

  const handleFilterPress = () => {
    setFilterVisible(true);
  };

  const handleApplyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleAssetPress = (asset: AssetListItem) => {
    navigation.navigate('BmnDetail', { id: asset.id });
  };

  const renderItem = ({ item }: { item: AssetListItem }) => (
    <AssetCard
      asset={item}
      onPress={() => handleAssetPress(item)}
    />
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={[styles.footer, { paddingVertical: spacing.md }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading && items.length === 0) {
      return (
        <View style={{ flex: 1, paddingVertical: spacing.md }}>
          <LoadingSkeleton variant="card" count={3} />
        </View>
      );
    }

    if (error && items.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ErrorState
            title="Gagal Memuat Data"
            message={error.message || 'Terjadi kesalahan saat mengambil daftar aset. Silakan coba lagi.'}
            onRetry={refetch}
          />
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            title="Tidak Ada Aset"
            message="Aset BMN tidak ditemukan. Coba hapus filter atau cari dengan kata kunci lain."
          />
        </View>
      );
    }

    return (
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{
          paddingBottom: spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isRefreshing}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { paddingHorizontal: spacing.lg, paddingTop: spacing.md }]}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: colors.foreground,
                fontFamily: typography.fontFamilies.sans,
                fontWeight: typography.fontWeights.bold,
                fontSize: typography.fontSizes.xl * 1.25,
              },
            ]}
          >
            Daftar Aset BMN
          </Text>
          <Text
            style={[
              styles.subTitle,
              {
                color: colors.mutedForeground,
                fontFamily: typography.fontFamilies.sans,
                fontSize: typography.fontSizes.sm,
                marginTop: spacing.xs,
              },
            ]}
          >
            Kelola dan pantau seluruh aset milik BKSDA
          </Text>
        </View>

        {/* Search & Filter Bar */}
        <View style={[styles.searchRow, { marginBottom: spacing.md }]}>
          <View style={styles.searchWrapper}>
            <SearchInput
              value={search}
              onChangeText={handleSearchChange}
              placeholder="Cari nama barang atau kode BMN..."
              onClear={() => handleSearchChange('')}
            />
          </View>
          <View style={[styles.filterWrapper, { marginLeft: spacing.sm }]}>
            <IconButton
              icon={<Text style={{ fontSize: typography.fontSizes.md }}>⚙️</Text>}
              onPress={handleFilterPress}
              accessibilityLabel="Filter BMN"
              variant="soft"
            />
          </View>
        </View>

        {/* List Container */}
        {renderContent()}
      </View>

      <AssetFilterSheet
        key={filterVisible ? 'visible' : 'hidden'}
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
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
  header: {
    marginBottom: 16,
  },
  title: {
    letterSpacing: -0.5,
  },
  subTitle: {
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchWrapper: {
    flex: 1,
  },
  filterWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
