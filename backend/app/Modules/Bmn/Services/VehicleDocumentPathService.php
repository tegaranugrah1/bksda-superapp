<?php

namespace App\Modules\Bmn\Services;

use App\Modules\Bmn\Models\Asset;
use Illuminate\Support\Str;

class VehicleDocumentPathService
{
    public function documentPath(Asset $asset, string $type, string $extension): string
    {
        return $this->baseFolder($asset).'/'.$type.'/'.$this->filename($asset, $type, $extension);
    }

    public function previewPath(Asset $asset, string $type): string
    {
        return $this->baseFolder($asset).'/'.$type.'/preview/'.$this->filename($asset, $type, 'jpg');
    }

    public function previewPagePath(Asset $asset, string $type, int $page): string
    {
        $filename = pathinfo($this->filename($asset, $type, 'jpg'), PATHINFO_FILENAME);

        return $this->baseFolder($asset).'/'.$type.'/preview/'.$filename.'-page-'.$page.'.jpg';
    }

    private function baseFolder(Asset $asset): string
    {
        $kind = $this->segment($asset->jenis_bmn ?: 'ASET');
        $nup = $this->segment($asset->nup ?: 'TANPA-NUP');
        $shortId = strtoupper(substr(str_replace('-', '', (string) $asset->id), 0, 8));

        return "bmn/assets/{$kind}-{$nup}-{$shortId}";
    }

    private function filename(Asset $asset, string $type, string $extension): string
    {
        $label = strtoupper($type);
        $plate = $this->segment($asset->no_polisi ?: 'TANPA-NOPOL');
        $timestamp = now()->format('Ymd-His');

        return "{$label}-{$plate}-{$timestamp}.{$extension}";
    }

    private function segment(string $value): string
    {
        $segment = Str::of($value)
            ->upper()
            ->replaceMatches('/[^A-Z0-9]+/', '-')
            ->trim('-')
            ->toString();

        return $segment !== '' ? $segment : 'TANPA-DATA';
    }
}
