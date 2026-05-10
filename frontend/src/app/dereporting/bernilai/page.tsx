"use client";

import { Gem } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function BernilaiPage() {
    return (
        <FilteredReportTable
            title="Laporan Data Bernilai"
            subtitle="Rekam data keanekaragaman hayati, satwa dilindungi, dan potensi alam terlindungi."
            icon={Gem}
            accentColor="emerald"
            filterKey="jenis_nama"
            filterValue="bernilai"
        />
    );
}
