import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import type { PortalViewProps, PortalServiceScreen } from "./portalViewTypes";
import { getTonePalette, formatDateIndo } from "./portalHelpers";
import { getPrimaryAssetPhoto, formatAssetCondition, formatAssetMerkTipe, matchesAssetCategory } from "./portalAssetHelpers";

interface PortalAssetsViewProps extends PortalViewProps {
  myAssetsList: any[];
  activeLoansList: any[];
  bmnActiveTab: "aset" | "pinjaman";
  bmnSearchQuery: string;
  bmnCategoryFilter: string;
  bmnViewMode: "grid" | "list";
  failedBmnThumbs: Record<string, boolean>;
  loanCheckNowTs: number;
  isLoanOverdue: (loan: any) => boolean;
  setLayananSubScreen: (value: PortalServiceScreen) => void;
  setBmnActiveTab: (value: "aset" | "pinjaman") => void;
  setBmnSearchQuery: (value: string) => void;
  setBmnCategoryFilter: (value: string) => void;
  setBmnViewMode: (value: "grid" | "list") => void;
  setFailedBmnThumbs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function PortalAssetsView({
  styles, colors, r, shadowXs,
  myAssetsList, activeLoansList, bmnActiveTab, bmnSearchQuery,
  bmnCategoryFilter, bmnViewMode, failedBmnThumbs, loanCheckNowTs,
  isLoanOverdue, setLayananSubScreen, setBmnActiveTab, setBmnSearchQuery,
  setBmnCategoryFilter, setBmnViewMode, setFailedBmnThumbs,
}: PortalAssetsViewProps) {
  const filteredBmnAssets = myAssetsList.filter((item: any) => {
    const q = bmnSearchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      String(item.nama_barang || "").toLowerCase().includes(q) ||
      String(item.kode_barang || "").toLowerCase().includes(q) ||
      String(item.nup || "").toLowerCase().includes(q) ||
      String(item.no_polisi || "").toLowerCase().includes(q) ||
      formatAssetMerkTipe(item).toLowerCase().includes(q);
    return matchQuery && matchesAssetCategory(item, bmnCategoryFilter);
  });

  const filteredBmnLoans = activeLoansList.filter((loan: any) => {
    const q = bmnSearchQuery.toLowerCase().trim();
    return (
      !q ||
      String(loan.nama_barang || "").toLowerCase().includes(q) ||
      String(loan.kode_barang || "").toLowerCase().includes(q) ||
      String(loan.nup || "").toLowerCase().includes(q) ||
      String(loan.no_polisi || "").toLowerCase().includes(q) ||
      formatAssetMerkTipe(loan).toLowerCase().includes(q)
    );
  });

  const bmnCategoryCounts = {
    all: myAssetsList.length,
    kendaraan: myAssetsList.filter((item: any) => matchesAssetCategory(item, "kendaraan")).length,
    it: myAssetsList.filter((item: any) => matchesAssetCategory(item, "it")).length,
    peralatan: myAssetsList.filter((item: any) => matchesAssetCategory(item, "peralatan")).length,
  };
  const activeBmnItems = bmnActiveTab === "aset" ? filteredBmnAssets : filteredBmnLoans;

  return (
    <>
      <View style={styles.subScreenHeader}>
        <TouchableOpacity
          style={[styles.subScreenBackBtn, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}
          onPress={() => setLayananSubScreen("menu")}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={r.size.iconLg} color={colors.textDark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subScreenTitle, { color: colors.textDark }]}>Inventaris BMN Saya</Text>
          <Text style={[styles.subScreenSubtitle, { color: colors.textMuted }]}>
            Aset Tetap & Pinjaman Operasional Dinas
          </Text>
        </View>
      </View>

      {/* Segmented Switcher [ Aset Tetap Saya | Pinjaman Berjalan ] */}
      <View style={[styles.bmnSegmentedWrapper, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.bmnSegmentBtn, bmnActiveTab === "aset" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
          onPress={() => setBmnActiveTab("aset")}
          activeOpacity={0.8}
        >
          <Text style={[styles.bmnSegmentText, { color: bmnActiveTab === "aset" ? colors.accentFg : colors.textMuted }, bmnActiveTab === "aset" && styles.bmnSegmentTextActive]}>
            Aset Tetap ({myAssetsList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bmnSegmentBtn, bmnActiveTab === "pinjaman" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
          onPress={() => setBmnActiveTab("pinjaman")}
          activeOpacity={0.8}
        >
          <Text style={[styles.bmnSegmentText, { color: bmnActiveTab === "pinjaman" ? colors.accentFg : colors.textMuted }, bmnActiveTab === "pinjaman" && styles.bmnSegmentTextActive]}>
            Pinjaman Berjalan ({activeLoansList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar Input */}
      <View style={[styles.searchBarWrapper, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
        <Ionicons name="search-outline" size={r.size.iconMd} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textDark }]}
          placeholder={bmnActiveTab === "aset" ? "Cari nama barang, merk, atau NUP..." : "Cari pinjaman aktif..."}
          placeholderTextColor={colors.textMuted}
          value={bmnSearchQuery}
          onChangeText={setBmnSearchQuery}
        />
        {bmnSearchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setBmnSearchQuery("")}>
            <Ionicons name="close-circle" size={r.size.iconMd} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills (Only when Aset Tetap tab is active) */}
      {bmnActiveTab === "aset" && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catPillScrollView} contentContainerStyle={styles.catPillContent}>
          {[
            { key: "all", label: `Semua (${bmnCategoryCounts.all})` },
            { key: "kendaraan", label: `Kendaraan (${bmnCategoryCounts.kendaraan})` },
            { key: "it", label: `IT & PC (${bmnCategoryCounts.it})` },
            { key: "peralatan", label: `Peralatan (${bmnCategoryCounts.peralatan})` },
          ].map((pill) => {
            const active = bmnCategoryFilter === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                style={[
                  styles.catPillBtn,
                  {
                    backgroundColor: active ? colors.accentSoft : colors.cardBg,
                    borderColor: active ? colors.accentSoftBorder : colors.glassBorder,
                  },
                ]}
                onPress={() => setBmnCategoryFilter(pill.key)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    { color: active ? colors.accentFg : colors.textMuted },
                    active && styles.catPillTextActive,
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Web-Parity View Switcher Toolbar (Default Grid + Toggle List) */}
      <View style={styles.bmnViewToolbar}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
          {bmnActiveTab === "aset"
            ? `Daftar Aset Tetap (${filteredBmnAssets.length})`
            : `Daftar Pinjaman Aktif (${filteredBmnLoans.length})`}
        </Text>
        <View style={[styles.bmnViewToggleBox, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
          <TouchableOpacity
            style={[
              styles.bmnViewToggleBtn,
              bmnViewMode === "grid" && { backgroundColor: colors.accentSolid },
            ]}
            activeOpacity={0.8}
            onPress={() => setBmnViewMode("grid")}
            accessibilityLabel="Tampilan Grid"
          >
            <Ionicons
              name="grid-outline"
              size={r.size.iconMd}
              color={bmnViewMode === "grid" ? colors.accentOnSolid : colors.textMuted}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.bmnViewToggleBtn,
              bmnViewMode === "list" && { backgroundColor: colors.accentSolid },
            ]}
            activeOpacity={0.8}
            onPress={() => setBmnViewMode("list")}
            accessibilityLabel="Tampilan List"
          >
            <Ionicons
              name="list-outline"
              size={r.size.iconMd}
              color={bmnViewMode === "list" ? colors.accentOnSolid : colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items Grid (Default) / List View */}
      {activeBmnItems.length === 0 ? (
        <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
          <Ionicons
            name={bmnActiveTab === "aset" ? "cube-outline" : "checkmark-circle-outline"}
            size={r.size.iconEmpty}
            color={bmnActiveTab === "aset" ? colors.textMuted : colors.successFg}
          />
          <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>
            {bmnActiveTab === "aset" ? "Tidak Ada Aset Ditemukan" : "Tidak Ada Pinjaman Aktif"}
          </Text>
          <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
            {bmnActiveTab === "aset"
              ? `Tidak ada Barang Milik Negara yang sesuai dengan filter pencarian "${bmnSearchQuery}".`
              : "Seluruh alat dinas lapangan telah dikembalikan secara tertib ke petugas BMN Balai KSDA Kaltim."}
          </Text>
        </View>
      ) : bmnViewMode === "grid" ? (
        <View style={styles.bmnGrid}>
          {activeBmnItems.map((item: any, idx: number) => {
            const isLoanTab = bmnActiveTab === "pinjaman";
            const isLate = isLoanTab && isLoanOverdue(item);
            const photo = getPrimaryAssetPhoto(item);
            const thumbKey = `${bmnActiveTab}-grid-${item.loan_id || item.id || idx}`;
            const showPhoto = Boolean(photo && !failedBmnThumbs[thumbKey]);
            const condInfo = formatAssetCondition(item.kondisi);
            const condPal = getTonePalette(colors, condInfo.tone);
            const loanBadgePal = getTonePalette(colors, isLate ? "danger" : "info");
            const merkDisplay = formatAssetMerkTipe(item);
            const assetLokasi = item.lokasi || item.lokasi_ruang || item.lokasi_spesifik || "Balai KSDA";
            const dueRaw = item.due_date || item.tanggal_kembali;
            const dueDaysLeft = dueRaw
              ? Math.ceil((new Date(dueRaw).getTime() - loanCheckNowTs) / 86400000)
              : null;

            return (
              <View key={thumbKey} style={styles.bmnGridCol}>
                <GlassCard
                  style={[
                    styles.bmnGridCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isLate ? colors.dangerBorder : colors.glassBorder,
                    },
                    shadowXs,
                  ]}
                >
                  {/* Top Photo / Placeholder Container */}
                  <View style={[styles.bmnGridPhotoWrap, { backgroundColor: colors.surfaceMuted, borderBottomColor: colors.glassBorder }]}>
                    {showPhoto ? (
                      <Image
                        source={{ uri: photo!.url }}
                        style={styles.bmnGridPhoto}
                        resizeMode="cover"
                        onError={() =>
                          setFailedBmnThumbs((prev) => ({ ...prev, [thumbKey]: true }))
                        }
                      />
                    ) : (
                      <View style={styles.bmnGridNoPhoto}>
                        <Ionicons name="camera-outline" size={r.size.iconLg} color={colors.textMuted} />
                        <Text style={[styles.bmnGridNoPhotoText, { color: colors.textMuted }]}>
                          Belum ada foto
                        </Text>
                      </View>
                    )}

                    {item.no_polisi && (
                      <View style={[styles.bmnGridPlateBadge, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                        <Text style={[styles.bmnGridPlateText, { color: colors.infoFg }]} numberOfLines={1}>
                          {item.no_polisi}
                        </Text>
                      </View>
                    )}

                    {isLoanTab && (
                      <View
                        style={[
                          styles.bmnGridHeroBadge,
                          {
                            backgroundColor: isLate ? colors.dangerSolid : loanBadgePal.bg,
                            borderColor: isLate ? colors.dangerSolid : loanBadgePal.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bmnGridHeroBadgeText,
                            { color: isLate ? colors.accentOnSolid : loanBadgePal.fg },
                          ]}
                          numberOfLines={1}
                        >
                          {isLate ? "TERLAMBAT" : "DIPINJAM"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Card Body: Nama + Merk/Tipe top, Jenis & Lokasi + Footer anchored bottom */}
                  <View style={styles.bmnGridBody}>
                    <View>
                      <Text style={[styles.bmnGridTitle, { color: colors.textDark }]} numberOfLines={2}>
                        {item.nama_barang}
                      </Text>
                      <Text style={[styles.bmnGridSub, { color: colors.textMuted }]} numberOfLines={2}>
                        {merkDisplay}
                      </Text>
                    </View>

                    <View style={styles.bmnGridBottom}>
                      <View style={[styles.bmnGridMetaBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                        {isLoanTab ? (
                          <>
                            <View style={styles.bmnGridMetaRow}>
                              <Text style={[styles.bmnGridMetaKey, { color: colors.textMuted }]}>Pinjam</Text>
                              <Text style={[styles.bmnGridMetaVal, { color: colors.textDark }]} numberOfLines={1}>
                                {formatDateIndo(item.loan_date)}
                              </Text>
                            </View>
                            <View style={styles.bmnGridMetaRow}>
                              <Text style={[styles.bmnGridMetaKey, { color: colors.textMuted }]}>Batas</Text>
                              <Text
                                style={[
                                  styles.bmnGridMetaVal,
                                  { color: isLate ? colors.dangerFg : colors.textDark },
                                ]}
                                numberOfLines={1}
                              >
                                {formatDateIndo(dueRaw)}
                              </Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={styles.bmnGridMetaRow} accessible accessibilityLabel={`Jenis aset: ${item.jenis_bmn || "BMN"}`}>
                              <Ionicons name="cube-outline" size={r.size.iconSm} color={colors.textMuted} accessible={false} />
                              <Text style={[styles.bmnGridMetaVal, { color: colors.textDark, textAlign: "left" }]} numberOfLines={1}>
                                {item.jenis_bmn || "BMN"}
                              </Text>
                            </View>
                            <View style={styles.bmnGridMetaRow} accessible accessibilityLabel={`Lokasi aset: ${assetLokasi}`}>
                              <Ionicons name="location-outline" size={r.size.iconSm} color={colors.textMuted} accessible={false} />
                              <Text style={[styles.bmnGridMetaVal, { color: colors.textDark, textAlign: "left" }]} numberOfLines={1}>
                                {assetLokasi}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>

                      {/* Footer */}
                      <View style={[styles.bmnGridFooter, { borderTopColor: colors.glassBorder }]}>
                        <View style={styles.bmnGridFooterIdCol}>
                          <Text style={[styles.bmnGridCode, { color: colors.textMuted }]} numberOfLines={1}>
                            {item.kode_barang || "-"}
                          </Text>
                          <Text style={[styles.bmnGridNup, { color: colors.textDark }]} numberOfLines={1}>
                            {`NUP: ${item.nup || "-"}`}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.bmnGridCondPill,
                            isLoanTab
                              ? { backgroundColor: loanBadgePal.bg, borderColor: loanBadgePal.border }
                              : { backgroundColor: condPal.bg, borderColor: condPal.border },
                          ]}
                        >
                          <Text
                            style={[
                              styles.bmnGridCondText,
                              { color: isLoanTab ? loanBadgePal.fg : condPal.fg },
                            ]}
                            numberOfLines={1}
                          >
                            {isLoanTab
                              ? isLate
                                ? "Lewat"
                                : dueDaysLeft !== null && dueDaysLeft >= 0
                                ? `${dueDaysLeft} Hari`
                                : "Aktif"
                              : condInfo.shortLabel}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.bmnListStack}>
          {activeBmnItems.map((item: any, idx: number) => {
            const isLoanTab = bmnActiveTab === "pinjaman";
            const isLate = isLoanTab && isLoanOverdue(item);
            const photo = getPrimaryAssetPhoto(item);
            const thumbKey = `${bmnActiveTab}-list-${item.loan_id || item.id || idx}`;
            const showPhoto = Boolean(photo && !failedBmnThumbs[thumbKey]);
            const condInfo = formatAssetCondition(item.kondisi);
            const condPal = getTonePalette(colors, condInfo.tone);
            const loanPal = getTonePalette(colors, isLate ? "danger" : "info");
            const merkDisplay = formatAssetMerkTipe(item);
            const assetLokasi = item.lokasi || item.lokasi_ruang || item.lokasi_spesifik || "Balai KSDA";
            const dueRaw = item.due_date || item.tanggal_kembali;
            const dueDaysLeft = dueRaw
              ? Math.ceil((new Date(dueRaw).getTime() - loanCheckNowTs) / 86400000)
              : null;

            return (
              <GlassCard
                key={thumbKey}
                style={[styles.bmnDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
              >
                <View style={styles.bmnDetailHeader}>
                  <View
                    style={[
                      styles.bmnIconBox,
                      isLoanTab
                        ? { backgroundColor: loanPal.bg, borderColor: loanPal.border }
                        : { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder },
                    ]}
                  >
                    {showPhoto ? (
                      <Image
                        source={{ uri: photo!.url }}
                        style={styles.bmnThumbImg}
                        resizeMode="cover"
                        onError={() =>
                          setFailedBmnThumbs((prev) => ({ ...prev, [thumbKey]: true }))
                        }
                      />
                    ) : (
                      <Ionicons
                        name={
                          isLoanTab
                            ? "swap-horizontal-outline"
                            : item.no_polisi
                            ? "car-outline"
                            : item.kategori === "it"
                            ? "laptop-outline"
                            : "cube-outline"
                        }
                        size={r.size.iconLg}
                        color={isLoanTab ? loanPal.fg : colors.accentFg}
                      />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bmnItemTitle, { color: colors.textDark }]} numberOfLines={2}>
                      {item.nama_barang}
                    </Text>
                    <Text style={[styles.bmnItemSub, { color: colors.textMuted }]} numberOfLines={2}>
                      {merkDisplay}
                    </Text>
                    <Text style={[styles.bmnItemCode, { color: colors.textMuted }]} numberOfLines={1}>
                      {`${item.kode_barang || "-"} • NUP: ${item.nup || "-"}`}
                      {item.no_polisi ? ` • ${item.no_polisi}` : ""}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.bmnConditionBadge,
                      isLoanTab
                        ? { backgroundColor: loanPal.bg, borderColor: loanPal.border }
                        : { backgroundColor: condPal.bg, borderColor: condPal.border },
                    ]}
                  >
                    <Text style={[styles.bmnConditionText, { color: isLoanTab ? loanPal.fg : condPal.fg }]}>
                      {isLoanTab ? (isLate ? "TERLAMBAT" : String(item.status || "DIPINJAM").toUpperCase()) : condInfo.label}
                    </Text>
                  </View>
                </View>

                {isLoanTab ? (
                  <View style={[styles.loanMetaGrid, { borderTopColor: colors.glassBorder }]}>
                    <View style={styles.loanMetaCol}>
                      <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>TGL PINJAM</Text>
                      <Text style={[styles.loanMetaVal, { color: colors.textDark }]}>
                        {formatDateIndo(item.loan_date)}
                      </Text>
                    </View>
                    <View style={styles.loanMetaCol}>
                      <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>BATAS KEMBALI</Text>
                      <Text style={[styles.loanMetaVal, { color: isLate ? colors.dangerFg : colors.textDark }]}>
                        {formatDateIndo(dueRaw)}
                      </Text>
                    </View>
                    <View style={styles.loanMetaCol}>
                      <Text style={[styles.loanMetaLabel, { color: colors.textMuted }]}>STATUS</Text>
                      <Text style={[styles.loanMetaVal, { color: loanPal.fg }]}>
                        {isLate
                          ? "Terlambat"
                          : dueDaysLeft !== null && dueDaysLeft >= 0
                          ? `Sisa ${dueDaysLeft} Hari`
                          : "Aktif"}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.bmnLocationRow, { borderTopColor: colors.glassBorder }]}>
                    <Ionicons name="location-outline" size={r.size.iconSm} color={colors.accentFg} style={styles.inlineIcon} />
                    <Text style={[styles.bmnLocationText, { color: colors.textMuted }]} numberOfLines={1}>
                      {`${item.jenis_bmn || "BMN"} • ${assetLokasi}`}
                    </Text>
                  </View>
                )}
              </GlassCard>
            );
          })}
        </View>
      )}
    </>
  );
}
