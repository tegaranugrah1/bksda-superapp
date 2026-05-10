"use client";

import { Handshake } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function KerjasamaPage() {
    return (
        <FilteredReportTable
            title="Laporan Kerjasama"
            subtitle="Dokumen kolaborasi antar-instansi pemerintah dan organisasi mitra BKSDA."
            icon={Handshake}
            accentColor="blue"
            filterKey="jenis_nama"
            filterValue="kerjasama"
        />
    );
}
