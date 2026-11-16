<?php

namespace App\Modules\Bmn\Traits;

trait ResolvesDocumentStatus
{
    protected function determineStatus(?string $number, ?string $explicitStatus = null): string
    {
        if ($explicitStatus && in_array($explicitStatus, ['draft', 'published'], true)) {
            return $explicitStatus;
        }
        if (empty($number) || trim($number) === '' || trim($number) === '-') {
            return 'draft';
        }
        if (str_contains($number, "\u{00A0}") || preg_match('/^(?:BA|KS|SP)\.\s*\//i', $number)) {
            return 'draft';
        }

        return 'published';
    }
}
