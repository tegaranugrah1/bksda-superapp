import React from "react";
import { View, Text, TouchableOpacity, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import type { PratinjauSuratTugasItem } from "@/components/PratinjauSuratTugasModal";
import type { ThemeColors, ResponsivePortalMetrics } from "@/theme/ThemeContext";
import type { createPortalStyles } from "./portalStyles";
import { getTonePalette, extractSuratTugasDalamRangka, formatDateIndo, formatSumberDanaLabel, isRunningSt, isCompletedSt } from "./portalHelpers";

export type PortalTaskFilter = "all" | "running" | "completed";
interface PortalTasksTabProps {
  styles: ReturnType<typeof createPortalStyles>;
  colors: ThemeColors;
  r: ResponsivePortalMetrics;
  shadowXs: ViewStyle;
  displayStList: PratinjauSuratTugasItem[];
  stFilter: PortalTaskFilter;
  setStFilter: (filter: PortalTaskFilter) => void;
  handleOpenStPreview: (item: PratinjauSuratTugasItem) => Promise<void>;
}

export function PortalTasksTab({ styles, colors, r, shadowXs, displayStList, stFilter, setStFilter, handleOpenStPreview }: PortalTasksTabProps) {
  const runningStCount = displayStList.filter(isRunningSt).length;
  const completedStCount = displayStList.filter(isCompletedSt).length;

  const filteredStList = displayStList.filter((item) => {
    if (stFilter === "running") {
      return isRunningSt(item);
    }
    if (stFilter === "completed") {
      return isCompletedSt(item);
    }
    return true;
  });

  return (
    <>
      <View style={styles.pageHeaderCol}>
        <Text style={[styles.pageMainTitle, { color: colors.textDark }]}>Surat Tugas Saya</Text>
        <Text style={[styles.pageMainSubtitle, { color: colors.textMuted }]}>
          Daftar penugasan dinas resmi, jadwal & visum perjalanan
        </Text>
      </View>

      {/* Segmented Filter Bar */}
      <View style={[styles.filterSegmentContainer, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.filterSegmentBtn, stFilter === "all" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
          onPress={() => setStFilter("all")}
        >
          <Text style={[styles.filterSegmentText, { color: stFilter === "all" ? colors.accentFg : colors.textMuted }, stFilter === "all" && styles.filterSegmentTextActive]}>
            Semua ({displayStList.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterSegmentBtn, stFilter === "running" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
          onPress={() => setStFilter("running")}
        >
          <Text style={[styles.filterSegmentText, { color: stFilter === "running" ? colors.accentFg : colors.textMuted }, stFilter === "running" && styles.filterSegmentTextActive]}>
            Berjalan ({runningStCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterSegmentBtn, stFilter === "completed" && [{ backgroundColor: colors.surfaceRaised }, shadowXs]]}
          onPress={() => setStFilter("completed")}
        >
          <Text style={[styles.filterSegmentText, { color: stFilter === "completed" ? colors.accentFg : colors.textMuted }, stFilter === "completed" && styles.filterSegmentTextActive]}>
            Selesai ({completedStCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of ST Cards (selaras dengan card Beranda) */}
      <View style={styles.listStack}>
        {filteredStList.length === 0 ? (
          <View style={[styles.emptySubStateCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
            <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
            <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Belum Ada Surat Tugas</Text>
            <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
              Tidak ada daftar penugasan dinas pada kategori filter ini.
            </Text>
          </View>
        ) : (
          filteredStList.map((stItem: any, idx: number) => {
            const isRunning = isRunningSt(stItem);
            const stBadge = getTonePalette(colors, isRunning ? "accent" : "neutral");
            const iconColor = isRunning ? colors.accentFg : colors.textMuted;
            return (
              <TouchableOpacity
                key={stItem.id || idx}
                activeOpacity={0.88}
                onPress={() => handleOpenStPreview(stItem)}
              >
                <GlassCard
                  style={[
                    styles.activeDutyCard,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: isRunning ? colors.accentSoftBorder : colors.glassBorder,
                    },
                    shadowXs,
                  ]}
                >
                  <View style={styles.activeDutyHeader}>
                    <View style={[styles.activeDutyBadge, { backgroundColor: stBadge.bg, borderColor: stBadge.border }]}>
                      <Text style={[styles.activeDutyBadgeText, { color: stBadge.fg }]}>
                        {isRunning ? "SEDANG DINAS" : "SELESAI & LAPOR"}
                      </Text>
                    </View>
                    <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                      {stItem.nomor_surat || stItem.nomor || `ST.0${idx + 1}/K.18/TU/KSA/2026`}
                    </Text>
                  </View>

                  <Text style={[styles.activeDutyTitle, { color: colors.textDark }]} numberOfLines={2}>
                    {extractSuratTugasDalamRangka(stItem.maksud_tujuan || stItem.kegiatan, stItem.tempat_tujuan) || "Penugasan Kedinasan Resmi BKSDA"}
                  </Text>

                  <View style={styles.activeDutyMetaStack}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={r.size.iconSm} color={iconColor} />
                      <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                        {`${formatDateIndo(stItem.tanggal_mulai)} – ${formatDateIndo(stItem.tanggal_selesai)}`}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={r.size.iconSm} color={iconColor} />
                      <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                        {stItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"}
                      </Text>
                    </View>
                    {Boolean(formatSumberDanaLabel(stItem)) && (
                      <View style={styles.metaItem}>
                        <Ionicons name="wallet-outline" size={r.size.iconSm} color={iconColor} />
                        <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                          {formatSumberDanaLabel(stItem)}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
                    <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                      {isRunning ? "SPPD Aktif" : "Laporan Pelaksanaan Terunggah ✓"}
                    </Text>
                    <View style={styles.activeDutyFooterAction}>
                      <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Surat</Text>
                      <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Quick Helper Strip */}
      <View style={[styles.quickPromptStrip, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }, shadowXs]}>
        <Ionicons name="information-circle-outline" size={r.size.iconLg} color={colors.infoFg} style={styles.stripIcon} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.quickPromptTitle, { color: colors.infoFg }]}>Punya Surat Tugas yang Belum Ada di Daftar?</Text>
          <Text style={[styles.quickPromptSub, { color: colors.textMuted }]}>
            Gunakan tombol (+) di tengah bawah untuk membuat SPT baru secara mandiri.
          </Text>
        </View>
      </View>
    </>
  );
}
