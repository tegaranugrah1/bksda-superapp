import { ShieldCheck } from "lucide-react";
import FilteredReportTable from "../_components/FilteredReportTable";

export default function PemegangIzinPage() {
    return (
        <FilteredReportTable
            title="Laporan Pemegang Izin"
            subtitle="Pantauan terhadap pihak yang memiliki izin pemanfaatan kawasan hutan."
            icon={ShieldCheck}
            accentColor="amber"
            filterKey="jenis_nama"
            filterValue="pemegang-izin"
        />
    );
}
