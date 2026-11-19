import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/ui/GlassCard";
import type { PortalViewProps, PortalServiceScreen } from "./portalViewTypes";
import type { LeaveRequestPrintData } from "@/components/FormulirCutiPrintModal";

interface PortalServicesMenuProps extends PortalViewProps {
  myAssetsList: any[];
  activeLoansList: any[];
  resolvedSisaCuti: number | null;
  displayLeaveRequests: LeaveRequestPrintData[];
  setLayananSubScreen: (value: PortalServiceScreen) => void;
  setBmnActiveTab: (value: "aset" | "pinjaman") => void;
  setSbmModalVisible: (value: boolean) => void;
}

export function PortalServicesMenu({
  styles, colors, r, shadowXs,
  myAssetsList, activeLoansList, resolvedSisaCuti, displayLeaveRequests,
  setLayananSubScreen, setBmnActiveTab, setSbmModalVisible,
}: PortalServicesMenuProps) {
  return (
    <>
      <View style={styles.pageHeaderCol}>
        <Text style={[styles.pageMainTitle, { color: colors.textDark }]}>Layanan Terpadu ASN</Text>
        <Text style={[styles.pageMainSubtitle, { color: colors.textMuted }]}>
          Layanan mandiri operasional kedinasan Balai KSDA Kalimantan Timur
        </Text>
      </View>

      {/* 4 Core Service Cards - Aset Saya di Paling Atas */}
      <View style={styles.serviceStack}>
        {/* 1. Aset Saya (Paling Atas) -> Opens BMN Sub-screen on Aset tab */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setLayananSubScreen("bmn");
            setBmnActiveTab("aset");
          }}
        >
          <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
            <View style={[styles.serviceIconBg, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
              <Ionicons name="briefcase-outline" size={r.size.iconLg} color={colors.accentFg} />
            </View>
            <View style={styles.serviceMain}>
              <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Aset Saya</Text>
              <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                {myAssetsList.length > 0
                  ? `${myAssetsList.length} Barang Milik Negara terdaftar atas nama Anda`
                  : "Belum ada BMN tetap yang ditugaskan"}
              </Text>
              <View style={[styles.serviceBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                <Text style={[styles.serviceBadgeText, { color: colors.accentFg }]}>
                  {myAssetsList.length > 0 ? `Buka Daftar (${myAssetsList.length}) ›` : "Lihat Rincian"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
          </GlassCard>
        </TouchableOpacity>

        {/* 2. Pinjaman BMN Aktif -> Opens BMN Sub-screen on Pinjaman tab */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setLayananSubScreen("bmn");
            setBmnActiveTab("pinjaman");
          }}
        >
          <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
            <View style={[styles.serviceIconBg, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
              <Ionicons name="swap-horizontal-outline" size={r.size.iconLg} color={colors.infoFg} />
            </View>
            <View style={styles.serviceMain}>
              <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Pinjaman BMN Aktif</Text>
              <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                {activeLoansList.length > 0
                  ? `${activeLoansList.length} Unit Dipinjam: ${activeLoansList.map((l: any) => l.nama_barang).slice(0, 2).join(", ")}`
                  : "Tidak ada pinjaman BMN yang sedang berjalan"}
              </Text>
              <View style={[styles.serviceBadge, { backgroundColor: colors.infoBg, borderColor: colors.infoBorder }]}>
                <Text style={[styles.serviceBadgeText, { color: colors.infoFg }]}>
                  {activeLoansList.length > 0 ? `${activeLoansList.length} Unit Berjalan ›` : "Status: Bersih"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
          </GlassCard>
        </TouchableOpacity>

        {/* 3. Riwayat Pengajuan Cuti -> Opens Cuti Sub-screen */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setLayananSubScreen("cuti")}
        >
          <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
            <View style={[styles.serviceIconBg, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
              <Ionicons name="calendar-outline" size={r.size.iconLg} color={colors.warningFg} />
            </View>
            <View style={styles.serviceMain}>
              <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Riwayat Pengajuan Cuti</Text>
              <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                {`Sisa Kuota: ${resolvedSisaCuti ?? "—"} Hari Kerja • ${displayLeaveRequests.length} Pengajuan Arsip`}
              </Text>
              <View style={[styles.serviceBadge, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                <Text style={[styles.serviceBadgeText, { color: colors.warningFg }]}>Buka Arsip Pertahun ›</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
          </GlassCard>
        </TouchableOpacity>

        {/* 4. Kalkulator Dinas (SBM) -> Stays Ergonomic Modal */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setSbmModalVisible(true)}
        >
          <GlassCard style={[styles.serviceCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }, shadowXs]}>
            <View style={[styles.serviceIconBg, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
              <Ionicons name="calculator-outline" size={r.size.iconLg} color={colors.accentFg} />
            </View>
            <View style={styles.serviceMain}>
              <Text style={[styles.serviceTitle, { color: colors.textDark }]}>Kalkulator Dinas (SBM)</Text>
              <Text style={[styles.serviceSubtitle, { color: colors.textMuted }]}>
                Simulasi uang harian, penginapan & biaya transport sesuai PMK SBM
              </Text>
              <View style={[styles.serviceBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }]}>
                <Text style={[styles.serviceBadgeText, { color: colors.accentFg }]}>Hitung Estimasi (Modal) ›</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={r.size.iconMd} color={colors.textMuted} />
          </GlassCard>
        </TouchableOpacity>
      </View>

      {/* Helpdesk Strip dengan Spacing Lega */}
      <View style={[styles.helpdeskStrip, styles.layananHelpdeskSpacing, { backgroundColor: colors.accentSoft, borderColor: colors.accentSoftBorder }, shadowXs]}>
        <View style={[styles.helpdeskIconCircle, { backgroundColor: colors.cardBg, borderColor: colors.accentSoftBorder }]}>
          <Ionicons name="shield-checkmark" size={r.size.iconLg} color={colors.accentFg} />
        </View>
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={[styles.helpdeskTitle, { color: colors.textDark }]}>Butuh bantuan administrasi & TU?</Text>
          <Text style={[styles.helpdeskSub, { color: colors.textMuted }]}>
            Konsultasi SPPD, Visum, BMN & Cuti: tu.bksdakaltim@ksdae.go.id
          </Text>
        </View>
      </View>
    </>
  );
}
