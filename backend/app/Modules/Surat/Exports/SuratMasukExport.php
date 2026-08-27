<?php

namespace App\Modules\Surat\Exports;

use App\Modules\Surat\Models\SuratMasuk;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class SuratMasukExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    public function __construct(protected array $filters = []) {}

    public function collection()
    {
        $query = SuratMasuk::query();

        if (!empty($this->filters['search'])) {
            $search = $this->filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('no_surat', 'like', "%{$search}%")
                  ->orWhere('no_agenda', 'like', "%{$search}%")
                  ->orWhere('asal_surat', 'like', "%{$search}%")
                  ->orWhere('isi_ringkas', 'like', "%{$search}%");
            });
        }

        if (!empty($this->filters['start_date'])) {
            $query->whereDate('tanggal_agenda', '>=', $this->filters['start_date']);
        }

        if (!empty($this->filters['end_date'])) {
            $query->whereDate('tanggal_agenda', '<=', $this->filters['end_date']);
        }

        if (!empty($this->filters['year'])) {
            $query->whereYear('tanggal_agenda', $this->filters['year']);
        }

        if (!empty($this->filters['month'])) {
            $query->whereMonth('tanggal_agenda', $this->filters['month']);
        }

        if (!empty($this->filters['sifat'])) {
            $query->whereJsonContains('sifat_json', $this->filters['sifat']);
        }

        $items = $query->orderBy('id', 'asc')->get();

        return $items->sortBy(function ($item) {
            $num = (int) preg_replace('/[^0-9]/', '', (string) ($item->no_agenda ?? ''));
            return $num ?: 9999999;
        })->values();
    }

    public function headings(): array
    {
        return [
            'No Agenda',
            'Tanggal',
            'No Surat',
            'Tanggal Surat',
            'Asal Surat',
            'Lampiran',
            'Isi Surat',
        ];
    }

    public function map($row): array
    {
        return [
            $row->no_agenda ?? '-',
            $row->tanggal_agenda ? $row->tanggal_agenda->format('d/m/Y') : '-',
            $row->no_surat ?? '-',
            $row->tanggal_surat ? $row->tanggal_surat->format('d/m/Y') : '-',
            $row->asal_surat ?? '-',
            $row->lampiran ?? '-',
            $row->isi_ringkas ?? '-',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => [
                    'bold' => true,
                    'color' => ['argb' => 'FFFFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['argb' => 'FF059669'], // Emerald 600
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ],
        ];
    }
}
