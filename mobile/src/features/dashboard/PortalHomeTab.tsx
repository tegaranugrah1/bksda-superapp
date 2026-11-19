import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import { chunkGridRows } from "@/theme/ThemeContext";
import { hasModule } from "@/lib/permissions";
import type { User, Employee } from "@/types/auth";
import type { PratinjauSuratTugasItem } from "@/components/PratinjauSuratTugasModal";
import type { PortalViewProps, PortalServiceScreen } from "./portalViewTypes";
import { getTonePalette, extractSuratTugasDalamRangka, formatDateIndo, formatSumberDanaLabel, isRunningSt, type ToneKey } from "./portalHelpers";
import { formatAssetMerkTipe } from "./portalAssetHelpers";

interface PortalHomeTabProps extends PortalViewProps {
  userProfile?: { name: string; nip: string; avatarUrl?: string };
  user: User | null;
  employee: Employee | null;
  stBadgeCount: number;
  resolvedSisaCuti: number | null;
  assetsBadgeCount: number;
  myStList: PratinjauSuratTugasItem[];
  activeLoansList: any[];
  isLoanOverdue: (loan: any) => boolean;
  onNavigateToModule?: (moduleKey: string) => void;
  handleOpenStPreview: (item: PratinjauSuratTugasItem) => Promise<void>;
  setActiveTab: (value: string) => void;
  setLayananSubScreen: (value: PortalServiceScreen) => void;
  setBmnActiveTab: (value: "aset" | "pinjaman") => void;
  setPinjamanModalVisible: (value: boolean) => void;
}

const MODULES: {
  key: string;
  title: string;
  subtitle: string;
  iconName: string;
  tone: "accent" | "info" | "warning";
  isNew?: boolean;
}[] = [
  {
    key: "kepegawaian",
    title: "Kepegawaian",
    subtitle: "Surat & SDM",
    iconName: "people-outline",
    tone: "info",
  },
  {
    key: "keuangan",
    title: "Keuangan",
    subtitle: "SPJ & Visum",
    iconName: "cash-outline",
    tone: "warning",
  },
  {
    key: "bmn",
    title: "BMN",
    subtitle: "Barang Negara",
    iconName: "cube-outline",
    tone: "accent",
  },
  {
    key: "inventory",
    title: "Persediaan",
    subtitle: "Stok Barang",
    iconName: "apps-outline",
    tone: "warning",
  },
  {
    key: "dereporting",
    title: "DeReporting",
    subtitle: "Laporan Mandiri",
    iconName: "document-text-outline",
    tone: "info",
  },
  {
    key: "cms",
    title: "CMS Portal",
    subtitle: "Kelola Konten",
    iconName: "grid-outline",
    tone: "accent",
  },
  {
    key: "surat",
    title: "Persuratan",
    subtitle: "Disposisi Surat",
    iconName: "mail-outline",
    tone: "info",
  },
  {
    key: "drive",
    title: "BKSDA Drive",
    subtitle: "Cloud Berkas",
    iconName: "cloud-outline",
    tone: "accent",
    isNew: true,
  },
];

function getLiveGreeting(): { text: string; iconName: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { text: "Selamat Pagi", iconName: "sunny-outline" };
  if (hour >= 11 && hour < 15) return { text: "Selamat Siang", iconName: "sunny-outline" };
  if (hour >= 15 && hour < 18) return { text: "Selamat Sore", iconName: "partly-sunny-outline" };
  return { text: "Selamat Malam", iconName: "moon-outline" };
}

function formatTodayIndo(): string {
  const d = new Date();
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}


export function PortalHomeTab({
  styles, colors, r, shadowXs,
  userProfile, user, employee, stBadgeCount,
  resolvedSisaCuti, assetsBadgeCount, myStList, activeLoansList,
  isLoanOverdue, onNavigateToModule, handleOpenStPreview, setActiveTab,
  setLayananSubScreen, setBmnActiveTab, setPinjamanModalVisible,
}: PortalHomeTabProps) {
  const displayStList = myStList;
  const resolvedName =
    userProfile?.name ||
    user?.name ||
    employee?.name ||
    user?.employee?.name ||
    "Pengguna BKSDA";

  const resolvedNip =
    userProfile?.nip ||
    employee?.nip ||
    user?.employee?.nip ||
    user?.username ||
    "—";

  const resolvedJabatan =
    employee?.position ||
    (user as any)?.position ||
    "—";

  const resolvedPangkat =
    (employee as any)?.rank ||
    (user as any)?.employee?.rank ||
    (user as any)?.rank ||
    "—";

  const resolvedSisaCutiLabel =
    resolvedSisaCuti == null ? "—" : `${resolvedSisaCuti ?? "—"} Hari`;

  const greetingMeta = getLiveGreeting();
  const todayIndo = formatTodayIndo();

  const accessibleModules = MODULES.filter((mod) => hasModule(user, mod.key));
  const activeDutyItem = displayStList.find(isRunningSt) || displayStList[0];
  const isActiveDutyRunning = isRunningSt(activeDutyItem);

  const isReturnedLoan = (loan: any) =>
    ["returned", "dikembalikan", "selesai"].includes(String(loan?.status || "").toLowerCase());
  const homeBorrowedLoans = activeLoansList.filter((loan: any) => !isReturnedLoan(loan));
  const primaryLoan = homeBorrowedLoans[0];
  const isPrimaryLoanLate = primaryLoan ? isLoanOverdue(primaryLoan) : false;

  const quickStatItems: {
    key: string;
    icon: string;
    tone: ToneKey;
    label: string;
    value: string;
    onPress?: () => void;
  }[] = [
    {
      key: "rank",
      icon: "ribbon-outline",
      tone: "info",
      label: "Pangkat / Gol.",
      value: resolvedPangkat,
    },
    {
      key: "cuti",
      icon: "calendar-outline",
      tone: "warning",
      label: "Sisa Cuti",
      value: resolvedSisaCutiLabel,
      onPress: () => {
        setLayananSubScreen("cuti");
        setActiveTab("layanan");
      },
    },
    {
      key: "st",
      icon: "document-text-outline",
      tone: "info",
      label: "Surat Tugas",
      value: `${stBadgeCount} ST Aktif`,
      onPress: () => setActiveTab("surattugas"),
    },
    {
      key: "aset",
      icon: "cube-outline",
      tone: "accent",
      label: "Aset Saya",
      value: `${assetsBadgeCount} Barang`,
      onPress: () => {
        setLayananSubScreen("bmn");
        setBmnActiveTab("aset");
        setActiveTab("layanan");
      },
    },
  ];

  return (
    <View style={styles.dashboardStack}>
      {/* Welcome belongs to the soft dashboard sheet; the strong brand color stays in the app bar. */}
      <View testID="portal-welcome" style={styles.heroBanner}>
        <View style={styles.heroContent}>
          <View style={styles.heroHeadingRow}>
            <View style={styles.heroGreetingBody}>
              <Text style={[styles.heroSalutation, { color: colors.textMuted }]}>{greetingMeta.text},</Text>
              <Text style={[styles.heroGreeting, { color: colors.textDark }]} numberOfLines={2}>{resolvedName}</Text>
              <Text style={[styles.heroDate, { color: colors.textMuted }]}>{todayIndo}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.heroIdentityCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Lihat profil pegawai"
            onPress={() => setActiveTab("profile")}
          >
            <View style={styles.heroIdentityRow}>
              <View style={styles.heroIdentityBody}>
                <Text style={[styles.heroIdentityLabel, { color: colors.textMuted }]}>NIP / Username</Text>
                <Text style={[styles.heroNipText, { color: colors.textDark }]} numberOfLines={1}>{resolvedNip}</Text>
              </View>
              <View style={[styles.heroProfileIcon, { backgroundColor: colors.accentSoft }]}>
                <Ionicons name="person-outline" size={r.size.iconLg} color={colors.accentFg} />
              </View>
            </View>
            <View style={[styles.heroIdentityFooter, { borderTopColor: colors.glassBorder }]}>
              <Text style={[styles.heroPosition, { color: colors.textSecondary }]} numberOfLines={1}>{resolvedJabatan}</Text>
              <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats 2x2 Grid (Pangkat, Sisa Cuti, Surat Tugas, Aset Saya) */}
      <View testID="portal-quick-stats" style={[styles.dashboardPanelWidth, styles.quickStatsPanel, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
        <View style={[styles.summaryHeader, { borderBottomColor: colors.glassBorder }]}>
          <Ionicons name="stats-chart-outline" size={r.size.iconMd} color={colors.accentFg} />
          <Text style={[styles.summaryTitle, { color: colors.textDark }]}>Ringkasan Pegawai</Text>
        </View>
        <View testID="portal-quick-stat-cells" style={styles.quickStatsGrid}>
          {quickStatItems.map((item, index) => {
            const pal = getTonePalette(colors, item.tone);
            const content = (
              <View style={[styles.quickStripCard, {
                borderColor: colors.glassBorder,
                borderRightWidth: r.grid.quickStatCols === 2 && index % 2 === 0 ? 1 : 0,
                borderBottomWidth: index < quickStatItems.length - r.grid.quickStatCols ? 1 : 0,
              }]}>
                <View style={[styles.quickStripIcon, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                  <Ionicons name={item.icon as any} size={r.size.iconMd} color={pal.fg} />
                </View>
                <View style={styles.quickStripBody}>
                  <Text style={[styles.quickStripLabel, { color: colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {item.label}
                  </Text>
                  <Text style={[styles.quickStripValue, { color: colors.textDark }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                    {item.value}
                  </Text>
                </View>
                {item.onPress && (
                  <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.textMuted} />
                )}
              </View>
            );

            return (
              <View key={item.key} style={styles.quickStatCellWrapper}>
                {item.onPress ? (
                  <TouchableOpacity style={styles.quickStatTouchable} activeOpacity={0.8} onPress={item.onPress}>
                    {content}
                  </TouchableOpacity>
                ) : (
                  content
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* CARD 2: Modul Akses System Container Card (matching Web Portal) */}
      <GlassCard style={[styles.dashboardPanelWidth, styles.moduleSectionCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
        <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
          <Text
            style={[styles.sectionTitle, { color: colors.textMuted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Modul Akses System
          </Text>
          <View style={[styles.moduleAuthorizedBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
            <Text style={[styles.moduleAuthorizedBadgeText, { color: colors.accentFg }]} numberOfLines={1}>
              {accessibleModules.length} Modul Terotorisasi
            </Text>
          </View>
        </View>

        <View style={[styles.moduleGrid]}>
          {chunkGridRows(accessibleModules, r.grid.moduleCols).map((row, rowIdx) => (
            <View key={`module-row-${rowIdx}`} style={[styles.moduleRow]}>
              {row.map((mod) => {
                const pal = getTonePalette(colors, mod.tone);
                return (
                  <TouchableOpacity
                    key={mod.key}
                    style={[
                      styles.moduleTileCard,
                      { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => onNavigateToModule && onNavigateToModule(mod.key)}
                  >
                    {mod.isNew && (
                      <View style={[styles.moduleNewDot, { backgroundColor: colors.accentSolid }]} />
                    )}
                    <View style={[styles.moduleIconBadge, { backgroundColor: pal.bg, borderColor: pal.border }]}>
                      <Ionicons name={mod.iconName as any} size={r.size.iconMd} color={pal.fg} />
                    </View>
                    <Text
                      style={[styles.moduleTitle, { color: colors.textDark }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {mod.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </GlassCard>

      {/* CARD 3: Tugas Dinas Berjalan Card (Featured Single Running Assignment) */}
      {activeDutyItem && (
        <TouchableOpacity
          style={[styles.dashboardPanelWidth, styles.homeActivitySpacing]}
          activeOpacity={0.88}
          onPress={() => handleOpenStPreview(activeDutyItem)}
        >
          <GlassCard
            style={[
              styles.activeDutyCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: isActiveDutyRunning ? colors.accentSoftBorder : colors.glassBorder,
              },
              shadowXs,
            ]}
          >
            <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                Tugas Dinas Berjalan
              </Text>
              <TouchableOpacity onPress={() => setActiveTab("surattugas")}>
                <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Semua ›</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.activeDutyHeader]}>
              {(() => {
                const badge = getTonePalette(colors, isActiveDutyRunning ? "accent" : "neutral");
                return (
                  <View style={[styles.activeDutyBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                    <Text style={[styles.activeDutyBadgeText, { color: badge.fg }]}>
                      {isActiveDutyRunning ? "SEDANG DINAS" : "PENUGASAN"}
                    </Text>
                  </View>
                );
              })()}
              <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                {activeDutyItem.nomor_surat || "ST.042/K.18/TU/KSA/03/2026"}
              </Text>
            </View>

            <Text style={[styles.activeDutyTitle, { color: colors.textDark }]} numberOfLines={2}>
              {extractSuratTugasDalamRangka(activeDutyItem.maksud_tujuan, activeDutyItem.tempat_tujuan) || "Penugasan Kedinasan Resmi BKSDA"}
            </Text>

            <View style={[styles.activeDutyMetaStack]}>
              <View style={[styles.metaItem]}>
                <Ionicons name="calendar-outline" size={r.size.iconSm} color={colors.accentFg} />
                <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                  {`${formatDateIndo(activeDutyItem.tanggal_mulai)} – ${formatDateIndo(activeDutyItem.tanggal_selesai)}`}
                </Text>
              </View>
              <View style={[styles.metaItem]}>
                <Ionicons name="location-outline" size={r.size.iconSm} color={colors.accentFg} />
                <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                  {activeDutyItem.tempat_tujuan || "Wilayah Kerja BKSDA Kaltim"}
                </Text>
              </View>
              {Boolean(formatSumberDanaLabel(activeDutyItem)) && (
                <View style={[styles.metaItem]}>
                  <Ionicons name="wallet-outline" size={r.size.iconSm} color={colors.accentFg} />
                  <Text style={[styles.metaItemText, { color: colors.textMuted }]} numberOfLines={1}>
                    {formatSumberDanaLabel(activeDutyItem)}
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
              <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                Surat Tugas Resmi Diterbitkan
              </Text>
              <View style={[styles.activeDutyFooterAction]}>
                <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Detail Penugasan</Text>
                <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
              </View>
            </View>
          </GlassCard>
        </TouchableOpacity>
      )}

      {/* CARD 4 (Kondisional): Pinjaman Aktif jika ada pinjaman */}
      {homeBorrowedLoans.length > 0 && primaryLoan && (() => {
        const loanBadge = getTonePalette(colors, isPrimaryLoanLate ? "danger" : "warning");
        const extraLoans = homeBorrowedLoans.length - 1;
        const primaryLoanMerk = formatAssetMerkTipe(primaryLoan);
        return (
          <GlassCard
            style={[
              styles.dashboardPanelWidth,
              styles.activeDutyCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: isPrimaryLoanLate ? colors.dangerBorder : colors.glassBorder,
              },
              shadowXs,
            ]}
          >
            <View style={[styles.cardSectionHeader, { borderBottomColor: colors.glassBorder }]}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]} numberOfLines={1}>
                Pinjaman Aktif
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setLayananSubScreen("bmn");
                  setBmnActiveTab("pinjaman");
                  setActiveTab("layanan");
                }}
              >
                <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Lihat Semua ›</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPinjamanModalVisible(true)}
            >
              <View style={[styles.activeDutyHeader]}>
                <View style={[styles.activeDutyBadge, { backgroundColor: loanBadge.bg, borderColor: loanBadge.border }]}>
                  <Text style={[styles.activeDutyBadgeText, { color: loanBadge.fg }]}>
                    {isPrimaryLoanLate ? "TERLAMBAT" : "DIPINJAM"}
                  </Text>
                </View>
                <Text style={[styles.activeDutyNumber, { color: colors.textMuted }]} numberOfLines={1}>
                  {`NUP ${primaryLoan.nup || "-"} • ${primaryLoan.kode_barang || "-"}`}
                </Text>
              </View>

              <Text
                style={[
                  styles.activeDutyTitle,
                  primaryLoanMerk !== "-" && { marginBottom: 0 },
                  { color: colors.textDark },
                ]}
                numberOfLines={1}
              >
                {primaryLoan.nama_barang}
              </Text>
              {primaryLoanMerk !== "-" && (
                <Text
                  style={[
                    styles.bmnGridSub,
                    { color: colors.textSecondary, marginBottom: r.space.x2 },
                  ]}
                  numberOfLines={1}
                >
                  {primaryLoanMerk}
                </Text>
              )}

              <View style={[styles.metaItem]}>
                <Ionicons
                  name="time-outline"
                  size={r.size.iconSm}
                  color={isPrimaryLoanLate ? colors.dangerFg : colors.warningFg}
                />
                <Text
                  style={[
                    styles.metaItemText,
                    { color: isPrimaryLoanLate ? colors.dangerFg : colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {`Pinjam ${formatDateIndo(primaryLoan.loan_date)} • Jatuh Tempo ${formatDateIndo(
                    primaryLoan.due_date || primaryLoan.tanggal_kembali
                  )}`}
                </Text>
              </View>

              <View style={[styles.activeDutyFooterDivider, { borderTopColor: colors.glassBorder }]}>
                <Text style={[styles.activeDutyFooterCaption, { color: colors.textMuted }]} numberOfLines={1}>
                  {extraLoans > 0
                    ? `${homeBorrowedLoans.length} Aset Dipinjam (+${extraLoans} lainnya)`
                    : "1 Aset Sedang Dipinjam"}
                </Text>
                <View style={[styles.activeDutyFooterAction]}>
                  <Text style={[styles.seeAllText, { color: colors.accentFg }]}>Detail Pinjaman</Text>
                  <Ionicons name="chevron-forward" size={r.size.iconSm} color={colors.accentFg} />
                </View>
              </View>
            </TouchableOpacity>
          </GlassCard>
        );
      })()}
    </View>
  );
}
