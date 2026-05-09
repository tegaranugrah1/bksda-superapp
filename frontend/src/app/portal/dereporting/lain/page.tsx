"use client";

import { FolderOpen } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function LainPage() {
    return (
        <FilteredReportTable
            title="Laporan Lainnya"
            subtitle="Dokumentasi dan catatan yang tidak masuk klasifikasi utama."
            icon={FolderOpen}
            accentColor="zinc"
            filterKey="jenis_nama"
            filterValue="lain"
        />
    );
}
