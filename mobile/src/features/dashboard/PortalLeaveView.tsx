import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import type { PortalViewProps, PortalServiceScreen } from "./portalViewTypes";
import type { LeaveRequestPrintData } from "@/components/FormulirCutiPrintModal";
import { getTonePalette, formatDateIndo, getLeaveStatusMeta } from "./portalHelpers";

interface PortalLeaveViewProps extends PortalViewProps {
  leaveBalance: any;
  resolvedSisaCuti: number | null;
  cutiPendingHari: number;
  cutiYearFilter: number | "all";
  displayLeaveRequests: LeaveRequestPrintData[];
  setLayananSubScreen: (value: PortalServiceScreen) => void;
  setCutiModalVisible: (value: boolean) => void;
  setCutiYearFilter: (value: number | "all") => void;
  renderLeaveCardActions: (request: any, beforeModalOpen?: () => void) => React.ReactNode;
}

export function PortalLeaveView({
  styles, colors, r, shadowXs,
  leaveBalance, resolvedSisaCuti, cutiPendingHari, cutiYearFilter,
  displayLeaveRequests, setLayananSubScreen, setCutiModalVisible, setCutiYearFilter,
  renderLeaveCardActions,
}: PortalLeaveViewProps) {
  const cutiCurrentYear = new Date().getFullYear();
  const cutiHakN = leaveBalance?.hak_cuti_n == null ? null : Number(leaveBalance.hak_cuti_n);
  const cutiSisaN1 = Number(leaveBalance?.hak_n1_diakui ?? leaveBalance?.sisa_cuti_n1 ?? 0);
  const cutiSisaN2 = Number(leaveBalance?.hak_n2_diakui ?? 0);
  const cutiTerpakai = leaveBalance?.cuti_terpakai_n0 ?? (cutiHakN != null && resolvedSisaCuti != null ? Math.max(0, cutiHakN - resolvedSisaCuti) : null);

  const cutiYearCounts = displayLeaveRequests.reduce((acc: Record<number, number>, req: any) => {
    const yr = req.tanggal_mulai ? new Date(req.tanggal_mulai).getFullYear() : (req.year || cutiCurrentYear);
    if (!Number.isNaN(yr)) acc[yr] = (acc[yr] || 0) + 1;
    return acc;
  }, {});
  const cutiYearOptions: { year: number | "all"; label: string }[] = [
    { year: "all", label: `Semua (${displayLeaveRequests.length})` },
    ...Object.keys(cutiYearCounts)
      .map(Number)
      .sort((a, b) => b - a)
      .map((yr) => ({ year: yr, label: `${yr} (${cutiYearCounts[yr]})` })),
  ];

  const filteredLeaveRequests = displayLeaveRequests.filter((req: any) => {
    if (cutiYearFilter === "all") return true;
    const year = req.tanggal_mulai ? new Date(req.tanggal_mulai).getFullYear() : (req.year || cutiCurrentYear);
    return year === cutiYearFilter;
  });

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
          <Text style={[styles.subScreenTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
          <Text style={[styles.subScreenSubtitle, { color: colors.textMuted }]}>
            Arsip Permohonan & Penetapan Izin Cuti ASN
          </Text>
        </View>
      </View>

      {/* Grouped quota summary; brand color is reserved for the application action. */}
      <View style={[styles.cutiHeroCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
        <View style={[styles.cutiHeroTopRow, { borderBottomColor: colors.glassBorder }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cutiHeroLabel, { color: colors.textMuted }]}>{`SISA KUOTA CUTI ${cutiCurrentYear}`}</Text>
            <Text style={[styles.cutiHeroValue, { color: colors.textDark }]}>{`${resolvedSisaCuti ?? "—"} Hari Kerja`}</Text>
            {cutiPendingHari > 0 && (
              <Text style={[styles.cutiHeroPendingNote, { color: colors.textMuted }]}>
                {`${cutiPendingHari} Hari sedang proses pengajuan`}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.cutiHeroActionBtn, { backgroundColor: colors.accentSolid, borderColor: colors.accentSolid }]}
            onPress={() => setCutiModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={r.size.iconMd} color={colors.accentOnSolid} style={styles.inlineIcon} />
            <Text style={[styles.cutiHeroActionText, { color: colors.accentOnSolid }]}>Ajukan Cuti</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cutiQuotaStrip}>
          <View style={[styles.cutiQuotaCell, { borderRightColor: colors.glassBorder }]}>
            <Text style={[styles.cutiQuotaLabel, { color: colors.textMuted }]}>Hak Tahun N</Text>
            <Text style={[styles.cutiQuotaVal, { color: colors.textDark }]}>{cutiHakN != null ? `${cutiHakN} Hari` : "—"}</Text>
          </View>
          <View style={[styles.cutiQuotaCell, { borderRightColor: colors.glassBorder }]}>
            <Text style={[styles.cutiQuotaLabel, { color: colors.textMuted }]}>{cutiSisaN2 > 0 ? "Sisa N-1 & N-2" : "Sisa N-1"}</Text>
            <Text style={[styles.cutiQuotaVal, { color: colors.textDark }]}>{leaveBalance && [leaveBalance.hak_n1_diakui, leaveBalance.sisa_cuti_n1, leaveBalance.hak_n2_diakui].some(value => value != null) ? `${cutiSisaN1 + cutiSisaN2} Hari` : "—"}</Text>
          </View>
          <View style={[styles.cutiQuotaCell, { borderRightWidth: 0 }]}>
            <Text style={[styles.cutiQuotaLabel, { color: colors.textMuted }]}>Terpakai</Text>
            <Text style={[styles.cutiQuotaVal, { color: colors.textDark }]}>{cutiTerpakai != null ? `${cutiTerpakai} Hari` : "—"}</Text>
          </View>
        </View>
      </View>

      {/* Dynamic Horizontal Year Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.catPillScrollView}
        contentContainerStyle={styles.yearPillsContainer}
      >
        {cutiYearOptions.map((p) => {
          const isActive = cutiYearFilter === p.year;
          return (
            <TouchableOpacity
              key={String(p.year)}
              style={[
                styles.yearPillBtn,
                {
                  backgroundColor: isActive ? colors.accentSoft : colors.cardBg,
                  borderColor: isActive ? colors.accentSoftBorder : colors.glassBorder,
                },
              ]}
              onPress={() => setCutiYearFilter(p.year)}
            >
              <Text
                style={[
                  styles.yearPillText,
                  { color: isActive ? colors.accentFg : colors.textMuted },
                  isActive && styles.yearPillTextActive,
                ]}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Leave Cards List */}
      <View style={[styles.listStack, styles.leaveListGap]}>
        {filteredLeaveRequests.length === 0 ? (
          <View style={[styles.emptySubStateCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
            <Ionicons name="calendar-outline" size={r.size.iconEmpty} color={colors.warningFg} />
            <Text style={[styles.emptySubTitle, { color: colors.textDark }]}>Tidak Ada Pengajuan Cuti</Text>
            <Text style={[styles.emptySubDesc, { color: colors.textMuted }]}>
              Tidak ada riwayat cuti tercatat untuk filter tahun yang dipilih.
            </Text>
          </View>
        ) : (
          filteredLeaveRequests.map((req: any, idx: number) => {
            const statusMeta = getLeaveStatusMeta(req);
            const badgePal = getTonePalette(colors, statusMeta.kind === "approved" || statusMeta.kind === "verified" ? "neutral" : statusMeta.tone);
            const cleanAlasan =
              !req.alasan_cuti || String(req.alasan_cuti).toLowerCase().includes("sisa cuti")
                ? `Sesuai ketentuan ${req.jenis_cuti || "Cuti"}`
                : req.alasan_cuti;

            return (
              <GlassCard
                key={req.id || idx}
                style={[styles.leaveDetailCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}
              >
                <View style={styles.leaveCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.leaveTitleRow}>
                      <Text style={[styles.leaveItemTitle, { color: colors.textDark }]}>
                        {req.jenis_cuti || "Cuti Tahunan"}
                      </Text>
                      <View style={[styles.bmnConditionBadge, { backgroundColor: badgePal.bg, borderColor: badgePal.border }]}>
                        <Text style={[styles.bmnConditionText, { color: badgePal.fg }]}>
                          {statusMeta.label.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    {req.nomor_pengajuan ? (
                      <Text style={[styles.leaveNomorText, { color: colors.textMuted }]}>
                        {req.nomor_pengajuan}
                      </Text>
                    ) : (
                      <Text style={[styles.leaveNomorEmpty, { color: colors.textMuted }]}>
                        (Nomor surat penetapan belum diterbitkan)
                      </Text>
                    )}
                  </View>

                  <View style={[styles.leaveDaysPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                    <Text style={[styles.leaveDaysPillText, { color: colors.textDark }]}>
                      {`${req.jumlah_hari || 1} Hari`}
                    </Text>
                  </View>
                </View>

                <View style={[styles.leavePeriodBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                  <Ionicons name="calendar-outline" size={r.size.iconSm} color={colors.accentFg} style={styles.inlineIcon} />
                  <Text style={[styles.leaveDateText, { color: colors.textDark }]}>
                    {`${formatDateIndo(req.tanggal_mulai)} s/d ${formatDateIndo(req.tanggal_selesai)}`}
                  </Text>
                </View>

                <Text style={[styles.leaveAlasanFullText, { color: colors.textSecondary }]}>
                  <Text style={[styles.leaveAlasanLabel, { color: colors.textDark }]}>Alasan: </Text>
                  {cleanAlasan}
                </Text>

                {Boolean(req.catatan_atasan) && (
                  <View style={[styles.leaveApprovalNote, { backgroundColor: colors.surfaceMuted, borderColor: colors.glassBorder }]}>
                    <Text style={[styles.leaveApprovalNoteText, { color: colors.textSecondary }]}>
                      <Text style={styles.leaveApprovalNoteStrong}>Catatan Persetujuan: </Text>
                      {req.catatan_atasan}
                    </Text>
                  </View>
                )}

                <View style={[styles.leaveCardFooter, { borderTopColor: colors.glassBorder }]}>
                  <Text style={[styles.leaveAppliedDate, { color: colors.textMuted }]}>
                    {`Tgl: ${formatDateIndo(req.tanggal_pengajuan || req.tanggal_mulai)}`}
                  </Text>
                  {renderLeaveCardActions(req)}
                </View>
              </GlassCard>
            );
          })
        )}
      </View>
    </>
  );
}
