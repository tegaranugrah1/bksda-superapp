<?php

namespace App\Modules\Kepegawaian\Exports;

use App\Modules\Kepegawaian\Models\EmployeeIncomingLetter;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EmployeeIncomingLettersExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    public function __construct(private readonly array $filters = []) {}

    public function collection()
    {
        $query = EmployeeIncomingLetter::query()->with('attachments');

        if (! empty($this->filters['search'])) {
            $search = trim((string) $this->filters['search']);
            $query->where(function ($builder) use ($search) {
                $builder->where('no_agenda', 'like', "%{$search}%")
                    ->orWhere('no_surat_masuk', 'like', "%{$search}%")
                    ->orWhere('no_surat_balasan', 'like', "%{$search}%")
                    ->orWhere('asal_surat', 'like', "%{$search}%")
                    ->orWhere('perihal', 'like', "%{$search}%")
                    ->orWhereHas('attachments', fn ($attachments) => $attachments->where('original_name', 'like', "%{$search}%"));
            });
        }

        if (! empty($this->filters['kategori'])) {
            $query->where('kategori', $this->filters['kategori']);
        }
        if (! empty($this->filters['start_date'])) {
            $query->whereDate('tanggal_diterima', '>=', $this->filters['start_date']);
        }
        if (! empty($this->filters['end_date'])) {
            $query->whereDate('tanggal_diterima', '<=', $this->filters['end_date']);
        }

        return $query->orderBy('id')->get();
    }

    public function headings(): array
    {
        return ['No Agenda', 'Tanggal Diterima', 'Tanggal Surat', 'No Surat Masuk', 'Kategori', 'Asal/Pengirim', 'Perihal', 'Catatan', 'No Surat Balasan', 'Tanggal Balasan', 'Lampiran'];
    }

    public function map($row): array
    {
        return [
            $row->no_agenda ?: '-',
            $row->tanggal_diterima?->format('d/m/Y') ?: '-',
            $row->tanggal_surat?->format('d/m/Y') ?: '-',
            $row->no_surat_masuk ?: '-',
            $row->kategori,
            $row->asal_surat,
            $row->perihal ?: '-',
            $row->catatan ?: '-',
            $row->no_surat_balasan ?: '-',
            $row->tanggal_surat_balasan?->format('d/m/Y') ?: '-',
            $row->attachments->pluck('original_name')->implode(', ') ?: '-',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [1 => [
            'font' => ['bold' => true, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF2563EB']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]];
    }
}
