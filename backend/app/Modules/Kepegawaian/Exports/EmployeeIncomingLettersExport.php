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
        return EmployeeIncomingLetter::query()
            ->with('attachments')
            ->filter($this->filters)
            ->orderBy('id')
            ->get();
    }

    public function headings(): array
    {
        return ['No Agenda', 'Tanggal Diterima', 'Tanggal Surat', 'No Surat Masuk', 'Kategori', 'Asal/Pengirim', 'Perihal', 'Catatan', 'No Surat Balasan', 'Tanggal Balasan', 'Lampiran'];
    }

    public function map($row): array
    {
        return [
            $this->safeCell($row->no_agenda ?: '-'),
            $row->tanggal_diterima?->format('d/m/Y') ?: '-',
            $row->tanggal_surat?->format('d/m/Y') ?: '-',
            $this->safeCell($row->no_surat_masuk ?: '-'),
            $this->safeCell($row->kategori),
            $this->safeCell($row->asal_surat),
            $this->safeCell($row->perihal ?: '-'),
            $this->safeCell($row->catatan ?: '-'),
            $this->safeCell($row->no_surat_balasan ?: '-'),
            $row->tanggal_surat_balasan?->format('d/m/Y') ?: '-',
            $this->safeCell($row->attachments->pluck('original_name')->implode(', ') ?: '-'),
        ];
    }

    private function safeCell(?string $value): string
    {
        if ($value === null || $value === '' || $value === '-') {
            return $value ?? '-';
        }

        $trimmed = ltrim($value);
        return preg_match('/^[=+\-@\t\r]/', $trimmed) === 1 ? "'{$value}" : $value;
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
