<?php

namespace App\Support\Security;

final class UploadValidationRules
{
    /**
     * Validation rules for spreadsheet imports.
     *
     * Laravel's mimes rule validates detected MIME type. The extensions rule
     * adds a visible filename extension whitelist so disguised uploads fail
     * before being parsed by PhpSpreadsheet.
     */
    public static function spreadsheet(int $maxKilobytes = 20480): array
    {
        return [
            'required',
            'file',
            'mimes:xlsx,xls,csv',
            'extensions:xlsx,xls,csv',
            "max:{$maxKilobytes}",
        ];
    }

    public static function image(bool $required = true, int $maxKilobytes = 5120): array
    {
        return [
            $required ? 'required' : 'nullable',
            'image',
            'mimes:jpg,jpeg,png,webp',
            'extensions:jpg,jpeg,png,webp',
            "max:{$maxKilobytes}",
        ];
    }
}
